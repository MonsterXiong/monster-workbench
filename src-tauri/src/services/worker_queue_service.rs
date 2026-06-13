use crate::infra::creative_asset_repo;
use crate::infra::creative_batch_repo;
use crate::infra::creative_task_repo;
use crate::infra::creative_types::{
    CreateCreativeAssetInput, CreateTaskEventInput, CreativeTask, ListCreativeTasksFilter,
    UpdateCreativeBatchJobInput, UpdateCreativeTaskStatusInput,
};
use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};
use crate::services::sidecar_lifecycle_service::SidecarWorkflowTaskResult;
use crate::services::workflow_settle_service::{
    append_sidecar_result_events, create_ready_sidecar_asset, persist_cancelled_sidecar_model_runs,
    persist_sidecar_model_runs, validate_sidecar_task_result,
};
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::thread::{self, JoinHandle};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::{Runtime, Wry};

const WORKER_CONTROL_STARTUP_RECOVERY_LIMIT: i64 = 100;
const WORKER_CONTROL_READ_BUFFER_BYTES: usize = 16 * 1024;
const WORKER_CONTROL_MAX_REQUEST_BYTES: usize = 4 * 1024 * 1024;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerQueueRecoverySummary {
    pub interrupted_running_tasks: Vec<i64>,
    pub moved_to_retrying: Vec<i64>,
    pub moved_to_failed: Vec<i64>,
    pub cancelled_tasks: Vec<i64>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerQueueCancelResult {
    pub task: CreativeTask,
    pub was_running: bool,
}

#[allow(dead_code)]
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerQueueCompleteTaskInput {
    pub task_id: i64,
    pub status: String,
    pub result_json: Option<String>,
    pub error_message: Option<String>,
    pub asset_id: Option<i64>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerQueueCompleteResult {
    pub task: CreativeTask,
    pub reported_status: String,
    pub final_status: String,
    pub was_cancelling: bool,
}

#[allow(dead_code)]
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerQueueClaimLeaseInput {
    pub task_type: Option<String>,
    pub project_id: Option<String>,
    pub batch_job_id: Option<i64>,
    pub worker_id: String,
    pub runtime_instance_id: String,
    pub lease_duration_ms: Option<u64>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerQueueClaimLeaseResult {
    pub task: CreativeTask,
    pub worker_id: String,
    pub runtime_instance_id: String,
    pub claim_token: String,
    pub lease_expires_at: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerQueueHeartbeatLeaseInput {
    pub task_id: i64,
    pub worker_id: String,
    pub runtime_instance_id: String,
    pub claim_token: String,
    pub lease_duration_ms: Option<u64>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerQueueHeartbeatLeaseResult {
    pub task: CreativeTask,
    pub lease_expires_at: String,
    pub lease_renewal_count: i64,
}

#[allow(dead_code)]
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerQueueCheckpointLeaseInput {
    pub task_id: i64,
    pub worker_id: String,
    pub runtime_instance_id: String,
    pub claim_token: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerQueueCheckpointLeaseResult {
    pub cancel_requested: bool,
    pub lease_valid: bool,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerQueueCompleteLeaseInput {
    pub task_id: i64,
    pub worker_id: String,
    pub runtime_instance_id: String,
    pub claim_token: String,
    pub status: String,
    pub result_json: Option<String>,
    pub error_message: Option<String>,
    pub asset_id: Option<i64>,
    pub lease_duration_ms: Option<u64>,
    pub sidecar_result: Option<SidecarWorkflowTaskResult>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerQueueCompleteLeaseResult {
    pub task: CreativeTask,
    pub final_status: String,
    pub asset_ids: Vec<i64>,
    pub model_run_ids: Vec<i64>,
}

#[allow(dead_code)]
pub(crate) struct WorkerControlServer {
    pub(crate) url: String,
    pub(crate) token: String,
    stop: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
}

impl Drop for WorkerControlServer {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

pub struct WorkerQueueService<R: Runtime = Wry> {
    path_provider: PathProvider<R>,
}

impl<R: Runtime> WorkerQueueService<R> {
    pub fn new(path_provider: PathProvider<R>) -> Self {
        Self { path_provider }
    }

    pub fn claim_next_task(
        &self,
        task_type: Option<String>,
        project_id: Option<String>,
    ) -> AppResult<Option<CreativeTask>> {
        let task = creative_task_repo::claim_next_queued_task(
            &self.db_path()?,
            ListCreativeTasksFilter {
                project_id,
                status: None,
                task_type,
                goal_id: None,
                batch_job_id: None,
                limit: Some(1),
                offset: Some(0),
            },
        )?;

        Ok(task)
    }

    pub fn request_cancel(&self, task_id: i64) -> AppResult<WorkerQueueCancelResult> {
        if task_id <= 0 {
            return Err(AppError::Config("task id must be positive".to_string()));
        }

        let db_path = self.db_path()?;
        let task = creative_task_repo::get_task(&db_path, task_id)?
            .ok_or_else(|| AppError::Database("task not found".to_string()))?;
        let was_running = task.status == "running";
        let status = if was_running {
            "cancelling"
        } else {
            "cancelled"
        };
        let task = creative_task_repo::update_task_status(
            &db_path,
            UpdateCreativeTaskStatusInput {
                id: task_id,
                status: status.to_string(),
                result_json: None,
                error_message: Some("cancel requested".to_string()),
                asset_id: task.asset_id,
                retry_count_increment: None,
            },
        )?;
        self.settle_parent_batch_if_drained(&db_path, &task)?;
        let _ = creative_task_repo::append_task_event(
            &db_path,
            CreateTaskEventInput {
                task_id,
                event_type: "cancel_requested".to_string(),
                message: Some("cancel requested".to_string()),
                payload_json: Some(
                    serde_json::json!({
                        "status": status,
                        "wasRunning": was_running,
                    })
                    .to_string(),
                ),
            },
        );

        Ok(WorkerQueueCancelResult { task, was_running })
    }

    #[allow(dead_code)]
    pub fn claim_next_task_with_lease(
        &self,
        input: WorkerQueueClaimLeaseInput,
    ) -> AppResult<Option<WorkerQueueClaimLeaseResult>> {
        validate_worker_identity(&input.worker_id, &input.runtime_instance_id)?;

        let now_ms = now_millis();
        let claim_token = build_claim_token(&input.worker_id, &input.runtime_instance_id, now_ms);
        let claimed_at = lease_timestamp(now_ms);
        let lease_expires_at = lease_timestamp(
            now_ms.saturating_add(normalize_lease_duration_ms(input.lease_duration_ms)),
        );
        let claimed = creative_task_repo::claim_next_queued_task_with_lease(
            &self.db_path()?,
            creative_task_repo::ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    project_id: input.project_id,
                    status: None,
                    task_type: input.task_type,
                    goal_id: None,
                    batch_job_id: input.batch_job_id,
                    limit: Some(1),
                    offset: Some(0),
                },
                worker_id: input.worker_id,
                runtime_instance_id: input.runtime_instance_id,
                claim_token,
                claimed_at,
                lease_expires_at,
            },
        )?;

        Ok(claimed.map(|claimed| WorkerQueueClaimLeaseResult {
            task: claimed.task,
            worker_id: claimed.worker_id,
            runtime_instance_id: claimed.runtime_instance_id,
            claim_token: claimed.claim_token,
            lease_expires_at: claimed.lease_expires_at,
        }))
    }

    #[allow(dead_code)]
    pub fn heartbeat_task_lease(
        &self,
        input: WorkerQueueHeartbeatLeaseInput,
    ) -> AppResult<Option<WorkerQueueHeartbeatLeaseResult>> {
        validate_worker_identity(&input.worker_id, &input.runtime_instance_id)?;
        validate_claim_token(&input.claim_token)?;
        if input.task_id <= 0 {
            return Err(AppError::Config("task id must be positive".to_string()));
        }

        let now_ms = now_millis();
        let heartbeat_at = lease_timestamp(now_ms);
        let lease_expires_at = lease_timestamp(
            now_ms.saturating_add(normalize_lease_duration_ms(input.lease_duration_ms)),
        );
        let heartbeat = creative_task_repo::heartbeat_task_lease(
            &self.db_path()?,
            creative_task_repo::HeartbeatTaskLeaseInput {
                task_id: input.task_id,
                worker_id: input.worker_id,
                runtime_instance_id: input.runtime_instance_id,
                claim_token: input.claim_token,
                now: lease_timestamp(now_ms),
                heartbeat_at,
                lease_expires_at,
            },
        )?;

        Ok(heartbeat.map(|heartbeat| WorkerQueueHeartbeatLeaseResult {
            task: heartbeat.task,
            lease_expires_at: heartbeat.lease_expires_at,
            lease_renewal_count: heartbeat.lease_renewal_count,
        }))
    }

    #[allow(dead_code)]
    pub fn complete_task_with_lease(
        &self,
        input: WorkerQueueCompleteLeaseInput,
    ) -> AppResult<Option<WorkerQueueCompleteLeaseResult>> {
        validate_worker_identity(&input.worker_id, &input.runtime_instance_id)?;
        validate_claim_token(&input.claim_token)?;
        if input.task_id <= 0 {
            return Err(AppError::Config("task id must be positive".to_string()));
        }

        let reported_status = normalize_complete_status(&input.status)?;
        if let Some(sidecar_result) = input.sidecar_result.clone() {
            return self.complete_sidecar_task_with_lease(input, reported_status, sidecar_result);
        }

        let db_path = self.db_path()?;
        let current_task = creative_task_repo::get_task(&db_path, input.task_id)?;
        let final_status = if current_task
            .as_ref()
            .map(|task| task.status == "cancelling")
            .unwrap_or(false)
        {
            "cancelled".to_string()
        } else {
            reported_status
        };
        let result_json = if final_status == "cancelled" {
            None
        } else {
            input.result_json
        };
        let error_message = if final_status == "succeeded" {
            None
        } else {
            input.error_message.or_else(|| {
                Some(if final_status == "cancelled" {
                    "task cancelled before worker completion".to_string()
                } else {
                    format!("worker completed with status {final_status}")
                })
            })
        };
        let task = creative_task_repo::complete_task_with_lease(
            &db_path,
            creative_task_repo::CompleteTaskLeaseInput {
                task_id: input.task_id,
                worker_id: input.worker_id,
                runtime_instance_id: input.runtime_instance_id,
                claim_token: input.claim_token,
                now: lease_timestamp(now_millis()),
                status: final_status.clone(),
                result_json,
                error_message,
                asset_id: input.asset_id,
            },
        )?;

        let Some(task) = task else {
            return Ok(None);
        };
        self.settle_parent_batch_if_drained(&db_path, &task)?;

        Ok(Some(WorkerQueueCompleteLeaseResult {
            task,
            final_status,
            asset_ids: Vec::new(),
            model_run_ids: Vec::new(),
        }))
    }

    fn complete_sidecar_task_with_lease(
        &self,
        input: WorkerQueueCompleteLeaseInput,
        reported_status: String,
        sidecar_result: SidecarWorkflowTaskResult,
    ) -> AppResult<Option<WorkerQueueCompleteLeaseResult>> {
        let sidecar_status = normalize_complete_status(&sidecar_result.status)?;
        if sidecar_status != reported_status {
            return Err(AppError::Config(format!(
                "worker completion status mismatch: envelope={reported_status}, sidecarResult={sidecar_status}"
            )));
        }

        let heartbeat = self.heartbeat_task_lease(WorkerQueueHeartbeatLeaseInput {
            task_id: input.task_id,
            worker_id: input.worker_id.clone(),
            runtime_instance_id: input.runtime_instance_id.clone(),
            claim_token: input.claim_token.clone(),
            lease_duration_ms: input.lease_duration_ms,
        })?;
        let Some(heartbeat) = heartbeat else {
            return Ok(None);
        };

        let task = heartbeat.task;
        validate_sidecar_task_result(&task, &sidecar_result)?;
        let final_status = if task.status == "cancelling" {
            "cancelled".to_string()
        } else {
            sidecar_status.clone()
        };

        let db_path = self.db_path()?;
        let _ = creative_task_repo::append_task_event(
            &db_path,
            CreateTaskEventInput {
                task_id: task.id,
                event_type: "sidecar_completed".to_string(),
                message: sidecar_result.message.clone(),
                payload_json: Some(
                    json!({
                        "sidecarStatus": sidecar_status.clone(),
                        "workerId": input.worker_id.clone(),
                        "runtimeInstanceId": input.runtime_instance_id.clone(),
                    })
                    .to_string(),
                ),
            },
        );
        append_sidecar_result_events(&db_path, task.id, &sidecar_result)?;

        let has_file_outputs = sidecar_result
            .outputs
            .iter()
            .any(|output| output.file_path.is_some() || output.thumbnail_path.is_some());
        if final_status == "succeeded" && task_requires_special_file_settle(&task.task_type) {
            return self.complete_worker_image_sidecar_task_with_lease(
                input,
                task,
                sidecar_result,
                db_path,
            );
        }
        if final_status == "succeeded" && has_file_outputs {
            return Err(AppError::Config(
                "worker sidecarResult with file outputs requires a specialized Rust settle path"
                    .to_string(),
            ));
        }

        let mut asset_ids = Vec::new();
        let asset_id = if final_status == "succeeded" {
            if sidecar_result.outputs.is_empty() {
                return Err(AppError::Process(
                    "worker sidecarResult succeeded without outputs".to_string(),
                ));
            }
            for output in &sidecar_result.outputs {
                let asset = create_ready_sidecar_asset(
                    &db_path,
                    task.project_id.clone(),
                    output,
                    None,
                    "worker sidecar output metadata",
                )?;
                asset_ids.push(asset.id);
                let _ = creative_task_repo::append_task_event(
                    &db_path,
                    CreateTaskEventInput {
                        task_id: task.id,
                        event_type: "asset_created".to_string(),
                        message: Some(format!("worker sidecar asset created: {}", asset.id)),
                        payload_json: Some(json!({ "assetId": asset.id }).to_string()),
                    },
                );
            }
            asset_ids.first().copied()
        } else {
            None
        };

        let model_run_ids = if final_status == "cancelled" {
            persist_cancelled_sidecar_model_runs(
                &db_path,
                &task,
                asset_id,
                &sidecar_result.model_runs,
                None,
                "worker sidecar model run metadata",
            )?
        } else {
            persist_sidecar_model_runs(
                &db_path,
                &task,
                asset_id,
                &sidecar_result.model_runs,
                None,
                "worker sidecar model run metadata",
            )?
        };
        let error_message = if final_status == "succeeded" {
            None
        } else {
            input
                .error_message
                .clone()
                .or_else(|| sidecar_result.message.clone())
                .or_else(|| Some(format!("worker completed with status {final_status}")))
        };
        if should_retry_worker_sidecar_result(&task, &final_status, &sidecar_result) {
            let retried = creative_task_repo::retry_task_with_lease(
                &db_path,
                creative_task_repo::RetryTaskLeaseInput {
                    task_id: input.task_id,
                    worker_id: input.worker_id.clone(),
                    runtime_instance_id: input.runtime_instance_id.clone(),
                    claim_token: input.claim_token.clone(),
                    now: lease_timestamp(now_millis()),
                    error_message: error_message.clone(),
                },
            )?;
            let Some(retried) = retried else {
                return Ok(None);
            };
            let final_status = "queued".to_string();
            let _ = creative_task_repo::append_task_event(
                &db_path,
                CreateTaskEventInput {
                    task_id: retried.id,
                    event_type: "worker_retrying".to_string(),
                    message: Some("worker sidecar failed and task was requeued".to_string()),
                    payload_json: Some(
                        json!({
                            "finalStatus": final_status,
                            "sidecarStatus": sidecar_result.status.clone(),
                            "modelRunIds": model_run_ids.clone(),
                            "retryCount": retried.retry_count,
                            "maxRetries": retried.max_retries,
                        })
                        .to_string(),
                    ),
                },
            );
            return Ok(Some(WorkerQueueCompleteLeaseResult {
                task: retried,
                final_status,
                asset_ids,
                model_run_ids,
            }));
        }
        let result_json = build_worker_sidecar_result_json(
            &sidecar_result,
            &final_status,
            &asset_ids,
            &model_run_ids,
        )?;

        let completed = creative_task_repo::complete_task_with_lease(
            &db_path,
            creative_task_repo::CompleteTaskLeaseInput {
                task_id: input.task_id,
                worker_id: input.worker_id,
                runtime_instance_id: input.runtime_instance_id,
                claim_token: input.claim_token,
                now: lease_timestamp(now_millis()),
                status: final_status.clone(),
                result_json: Some(result_json),
                error_message,
                asset_id,
            },
        )?;

        let Some(completed) = completed else {
            return Ok(None);
        };
        self.settle_parent_batch_if_drained(&db_path, &completed)?;
        let _ = creative_task_repo::append_task_event(
            &db_path,
            CreateTaskEventInput {
                task_id: completed.id,
                event_type: complete_event_type(&final_status).to_string(),
                message: Some(format!(
                    "worker sidecar completed with status {final_status}"
                )),
                payload_json: Some(
                    json!({
                        "finalStatus": final_status.clone(),
                        "sidecarStatus": sidecar_result.status.clone(),
                        "assetIds": asset_ids.clone(),
                        "modelRunIds": model_run_ids.clone(),
                    })
                    .to_string(),
                ),
            },
        );

        Ok(Some(WorkerQueueCompleteLeaseResult {
            task: completed,
            final_status,
            asset_ids,
            model_run_ids,
        }))
    }

    fn complete_worker_image_sidecar_task_with_lease(
        &self,
        input: WorkerQueueCompleteLeaseInput,
        task: CreativeTask,
        sidecar_result: SidecarWorkflowTaskResult,
        db_path: PathBuf,
    ) -> AppResult<Option<WorkerQueueCompleteLeaseResult>> {
        let output = sidecar_result.outputs.first().cloned().ok_or_else(|| {
            AppError::Process("worker image sidecarResult returned no outputs".to_string())
        })?;
        if output.asset_type != "demo_image" {
            return Err(AppError::Process(format!(
                "unexpected worker image asset type: {}",
                output.asset_type
            )));
        }
        let source_file_path = output.file_path.clone().ok_or_else(|| {
            AppError::Process("worker image sidecarResult returned no file path".to_string())
        })?;
        let output_dir = self.resolve_worker_image_output_dir()?;
        let file_path = validate_worker_sidecar_output_file(&output_dir, &source_file_path)?;
        let thumbnail_path = copy_worker_sidecar_thumbnail(&file_path)?;
        let prompt_request =
            extract_worker_sidecar_prompt_request(&sidecar_result).ok_or_else(|| {
                AppError::Process(
                    "worker image sidecarResult returned no promptRequest metadata".to_string(),
                )
            })?;
        let prompt_hash = worker_simple_prompt_hash(&prompt_request);
        let batch_job_id = task.batch_job_id;

        let image_asset = creative_asset_repo::create_asset(
            &db_path,
            CreateCreativeAssetInput {
                project_id: task.project_id.clone(),
                asset_type: output.asset_type,
                title: output.title,
                content: output.content,
                file_path: Some(file_path.clone()),
                thumbnail_path: Some(thumbnail_path.clone()),
                metadata_json: Some(
                    json!({
                        "batchJobId": batch_job_id,
                        "sourceTaskId": task.id,
                        "sequenceNo": task.sequence_no,
                        "promptRequest": prompt_request.clone(),
                        "sidecarMetadata": output.metadata,
                        "filePath": file_path,
                        "thumbnailPath": thumbnail_path,
                    })
                    .to_string(),
                ),
                status: Some("ready".to_string()),
            },
        )?;
        let model_run_ids = persist_sidecar_model_runs(
            &db_path,
            &task,
            Some(image_asset.id),
            &sidecar_result.model_runs,
            Some(prompt_hash.as_str()),
            "worker image sidecar model run metadata",
        )?;
        let result_json = json!({
            "assetId": image_asset.id,
            "assetIds": [image_asset.id],
            "modelRunIds": model_run_ids,
            "filePath": file_path,
            "thumbnailPath": thumbnail_path,
            "promptExcerpt": summarize_worker_text(&prompt_request),
            "sidecarStatus": sidecar_result.status.clone(),
        })
        .to_string();

        let completed = creative_task_repo::complete_task_with_lease(
            &db_path,
            creative_task_repo::CompleteTaskLeaseInput {
                task_id: input.task_id,
                worker_id: input.worker_id,
                runtime_instance_id: input.runtime_instance_id,
                claim_token: input.claim_token,
                now: lease_timestamp(now_millis()),
                status: "succeeded".to_string(),
                result_json: Some(result_json),
                error_message: None,
                asset_id: Some(image_asset.id),
            },
        )?;
        let Some(completed) = completed else {
            return Ok(None);
        };
        self.settle_parent_batch_if_drained(&db_path, &completed)?;
        let asset_ids = vec![image_asset.id];
        let _ = creative_task_repo::append_task_event(
            &db_path,
            CreateTaskEventInput {
                task_id: completed.id,
                event_type: "image_asset_saved".to_string(),
                message: Some(format!("worker image asset created: {}", image_asset.id)),
                payload_json: Some(
                    json!({
                        "assetId": image_asset.id,
                        "modelRunIds": model_run_ids.clone(),
                        "filePath": file_path,
                        "thumbnailPath": thumbnail_path,
                    })
                    .to_string(),
                ),
            },
        );
        let _ = creative_task_repo::append_task_event(
            &db_path,
            CreateTaskEventInput {
                task_id: completed.id,
                event_type: "worker_succeeded".to_string(),
                message: Some("worker image sidecar completed with status succeeded".to_string()),
                payload_json: Some(
                    json!({
                        "finalStatus": "succeeded",
                        "sidecarStatus": sidecar_result.status.clone(),
                        "assetIds": asset_ids.clone(),
                        "modelRunIds": model_run_ids.clone(),
                    })
                    .to_string(),
                ),
            },
        );

        Ok(Some(WorkerQueueCompleteLeaseResult {
            task: completed,
            final_status: "succeeded".to_string(),
            asset_ids,
            model_run_ids,
        }))
    }

    fn settle_parent_batch_if_drained(&self, db_path: &Path, task: &CreativeTask) -> AppResult<()> {
        let Some(batch_job_id) = task.batch_job_id else {
            return Ok(());
        };
        let Some(snapshot) = creative_batch_repo::get_batch_job_snapshot(db_path, batch_job_id)?
        else {
            return Ok(());
        };
        if snapshot.job.status != "running" {
            return Ok(());
        }
        if snapshot.stats.queued_tasks == 0
            && snapshot.stats.running_tasks == 0
            && snapshot.stats.cancelling_tasks == 0
        {
            let _ = creative_batch_repo::update_batch_job(
                db_path,
                UpdateCreativeBatchJobInput {
                    id: batch_job_id,
                    status: Some("completed".to_string()),
                    concurrency: None,
                    max_retries: None,
                    prompt_template: None,
                    provider_id: None,
                    model: None,
                    image_size: None,
                    budget_json: None,
                    started_at: None,
                    finished_at: None,
                },
            )?;
        }
        Ok(())
    }

    #[allow(dead_code)]
    pub fn recover_expired_task_leases(
        &self,
        limit: Option<i64>,
    ) -> AppResult<creative_task_repo::RecoverExpiredTaskLeasesSummary> {
        let db_path = self.db_path()?;
        let summary = creative_task_repo::recover_expired_task_leases(
            &db_path,
            creative_task_repo::RecoverExpiredTaskLeasesInput {
                now: lease_timestamp(now_millis()),
                limit: limit.unwrap_or(100),
            },
        )?;
        for task_id in summary
            .failed_tasks
            .iter()
            .chain(summary.cancelled_tasks.iter())
        {
            if let Some(task) = creative_task_repo::get_task(&db_path, *task_id)? {
                self.settle_parent_batch_if_drained(&db_path, &task)?;
            }
        }
        Ok(summary)
    }

    pub fn check_cancel_checkpoint(&self, task_id: i64) -> AppResult<bool> {
        if task_id <= 0 {
            return Err(AppError::Config("task id must be positive".to_string()));
        }

        let db_path = self.db_path()?;
        let task = creative_task_repo::get_task(&db_path, task_id)?
            .ok_or_else(|| AppError::Database("task not found".to_string()))?;
        if matches!(task.status.as_str(), "cancelling" | "cancelled") {
            return Ok(true);
        }
        if let Some(batch_job_id) = task.batch_job_id {
            if let Some(snapshot) =
                creative_batch_repo::get_batch_job_snapshot(&db_path, batch_job_id)?
            {
                return Ok(snapshot.job.status == "cancelled");
            }
        }
        Ok(false)
    }

    pub fn check_cancel_checkpoint_with_lease(
        &self,
        input: WorkerQueueCheckpointLeaseInput,
    ) -> AppResult<WorkerQueueCheckpointLeaseResult> {
        if input.task_id <= 0 {
            return Err(AppError::Config("task id must be positive".to_string()));
        }
        validate_worker_identity(&input.worker_id, &input.runtime_instance_id)?;
        validate_claim_token(&input.claim_token)?;

        let db_path = self.db_path()?;
        let lease_valid = creative_task_repo::is_task_lease_current(
            &db_path,
            creative_task_repo::CheckpointTaskLeaseInput {
                task_id: input.task_id,
                worker_id: input.worker_id,
                runtime_instance_id: input.runtime_instance_id,
                claim_token: input.claim_token,
                now: lease_timestamp(now_millis()),
            },
        )?;
        if !lease_valid {
            return Ok(WorkerQueueCheckpointLeaseResult {
                cancel_requested: true,
                lease_valid: false,
            });
        }

        Ok(WorkerQueueCheckpointLeaseResult {
            cancel_requested: self.check_cancel_checkpoint(input.task_id)?,
            lease_valid: true,
        })
    }

    pub fn complete_task(
        &self,
        input: WorkerQueueCompleteTaskInput,
    ) -> AppResult<WorkerQueueCompleteResult> {
        if input.task_id <= 0 {
            return Err(AppError::Config("task id must be positive".to_string()));
        }

        let reported_status = normalize_complete_status(&input.status)?;
        let db_path = self.db_path()?;
        let current_task = creative_task_repo::get_task(&db_path, input.task_id)?
            .ok_or_else(|| AppError::Database("task not found".to_string()))?;
        if !matches!(current_task.status.as_str(), "running" | "cancelling") {
            return Err(AppError::Config(format!(
                "task must be running or cancelling before completion, got {}",
                current_task.status
            )));
        }

        let was_cancelling = current_task.status == "cancelling";
        let final_status = if was_cancelling {
            "cancelled".to_string()
        } else {
            reported_status.clone()
        };
        let error_message = if final_status == "succeeded" {
            None
        } else {
            input.error_message.clone().or_else(|| {
                Some(if was_cancelling {
                    "task cancelled before worker completion".to_string()
                } else {
                    format!("worker completed with status {final_status}")
                })
            })
        };
        let result_json = if final_status == "cancelled" {
            None
        } else {
            input.result_json.clone()
        };
        let asset_id = if final_status == "cancelled" {
            current_task.asset_id
        } else {
            input.asset_id.or(current_task.asset_id)
        };

        let task = creative_task_repo::update_task_status(
            &db_path,
            UpdateCreativeTaskStatusInput {
                id: input.task_id,
                status: final_status.clone(),
                result_json,
                error_message,
                asset_id,
                retry_count_increment: None,
            },
        )?;
        self.settle_parent_batch_if_drained(&db_path, &task)?;
        let _ = creative_task_repo::append_task_event(
            &db_path,
            CreateTaskEventInput {
                task_id: input.task_id,
                event_type: complete_event_type(&final_status).to_string(),
                message: Some(format!("worker completed with status {final_status}")),
                payload_json: Some(
                    serde_json::json!({
                        "reportedStatus": reported_status.clone(),
                        "finalStatus": final_status.clone(),
                        "wasCancelling": was_cancelling,
                    })
                    .to_string(),
                ),
            },
        );

        Ok(WorkerQueueCompleteResult {
            task,
            reported_status,
            final_status,
            was_cancelling,
        })
    }

    pub fn recover_interrupted_tasks(&self) -> AppResult<WorkerQueueRecoverySummary> {
        let db_path = self.db_path()?;
        let running_tasks = creative_task_repo::list_tasks(
            &db_path,
            ListCreativeTasksFilter {
                status: Some("running".to_string()),
                limit: Some(200),
                offset: Some(0),
                batch_job_id: None,
                ..Default::default()
            },
        )?;
        let cancelling_tasks = creative_task_repo::list_tasks(
            &db_path,
            ListCreativeTasksFilter {
                status: Some("cancelling".to_string()),
                limit: Some(200),
                offset: Some(0),
                batch_job_id: None,
                ..Default::default()
            },
        )?;

        let mut summary = WorkerQueueRecoverySummary {
            interrupted_running_tasks: running_tasks.iter().map(|task| task.id).collect(),
            moved_to_retrying: Vec::new(),
            moved_to_failed: Vec::new(),
            cancelled_tasks: Vec::new(),
        };

        for task in running_tasks {
            if task.retry_count < task.max_retries {
                creative_task_repo::update_task_status(
                    &db_path,
                    UpdateCreativeTaskStatusInput {
                        id: task.id,
                        status: "retrying".to_string(),
                        result_json: None,
                        error_message: Some("interrupted during startup recovery".to_string()),
                        asset_id: task.asset_id,
                        retry_count_increment: Some(1),
                    },
                )?;
                let _ = creative_task_repo::append_task_event(
                    &db_path,
                    CreateTaskEventInput {
                        task_id: task.id,
                        event_type: "recovery_retrying".to_string(),
                        message: Some("interrupted running task marked retrying".to_string()),
                        payload_json: Some(
                            serde_json::json!({
                                "status": "retrying",
                                "reason": "startup_recovery"
                            })
                            .to_string(),
                        ),
                    },
                );
                summary.moved_to_retrying.push(task.id);
            } else {
                let recovered = creative_task_repo::update_task_status(
                    &db_path,
                    UpdateCreativeTaskStatusInput {
                        id: task.id,
                        status: "failed".to_string(),
                        result_json: None,
                        error_message: Some("interrupted during startup recovery".to_string()),
                        asset_id: task.asset_id,
                        retry_count_increment: None,
                    },
                )?;
                self.settle_parent_batch_if_drained(&db_path, &recovered)?;
                let _ = creative_task_repo::append_task_event(
                    &db_path,
                    CreateTaskEventInput {
                        task_id: task.id,
                        event_type: "recovery_failed".to_string(),
                        message: Some("interrupted running task marked failed".to_string()),
                        payload_json: Some(
                            serde_json::json!({
                                "status": "failed",
                                "reason": "retry_limit_reached"
                            })
                            .to_string(),
                        ),
                    },
                );
                summary.moved_to_failed.push(task.id);
            }
        }

        for task in cancelling_tasks {
            let recovered = creative_task_repo::update_task_status(
                &db_path,
                UpdateCreativeTaskStatusInput {
                    id: task.id,
                    status: "cancelled".to_string(),
                    result_json: None,
                    error_message: Some("cancelled during startup recovery".to_string()),
                    asset_id: task.asset_id,
                    retry_count_increment: None,
                },
            )?;
            self.settle_parent_batch_if_drained(&db_path, &recovered)?;
            let _ = creative_task_repo::append_task_event(
                &db_path,
                CreateTaskEventInput {
                    task_id: task.id,
                    event_type: "recovery_cancelled".to_string(),
                    message: Some("cancelling task settled to cancelled".to_string()),
                    payload_json: Some(
                        serde_json::json!({
                            "status": "cancelled",
                            "reason": "startup_recovery"
                        })
                        .to_string(),
                    ),
                },
            );
            summary.cancelled_tasks.push(task.id);
        }

        Ok(summary)
    }

    fn db_path(&self) -> AppResult<std::path::PathBuf> {
        self.path_provider.get_db_file_path()
    }

    fn resolve_worker_image_output_dir(&self) -> AppResult<PathBuf> {
        let output_dir = self
            .path_provider
            .get_app_local_data_dir()?
            .join("ai")
            .join("generated");
        fs::create_dir_all(&output_dir)
            .map_err(|error| AppError::Io(format!("failed to create image output dir: {error}")))?;
        Ok(output_dir)
    }
}

#[allow(dead_code)]
pub(crate) fn start_worker_control_server<R: Runtime + 'static>(
    path_provider: PathProvider<R>,
    token: String,
) -> AppResult<WorkerControlServer>
where
    PathProvider<R>: Send,
{
    if token.trim().is_empty() {
        return Err(AppError::Config(
            "worker control token must not be empty".to_string(),
        ));
    }

    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|error| AppError::Process(format!("failed to bind worker control: {error}")))?;
    listener.set_nonblocking(true).map_err(|error| {
        AppError::Process(format!("failed to configure worker control: {error}"))
    })?;
    let port = listener
        .local_addr()
        .map_err(|error| AppError::Process(format!("failed to read worker control port: {error}")))?
        .port();
    let stop = Arc::new(AtomicBool::new(false));
    let stop_for_thread = stop.clone();
    let expected_token = token.clone();
    let handle = thread::spawn(move || {
        let service = WorkerQueueService::new(path_provider);
        let _ = service.recover_expired_task_leases(Some(WORKER_CONTROL_STARTUP_RECOVERY_LIMIT));
        while !stop_for_thread.load(Ordering::SeqCst) {
            match listener.accept() {
                Ok((mut stream, _)) => {
                    let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
                    let _ = stream.set_write_timeout(Some(Duration::from_millis(500)));
                    let response =
                        handle_worker_control_stream(&service, &expected_token, &mut stream);
                    let _ = write_worker_control_response(&mut stream, response);
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(20));
                }
                Err(_) => break,
            }
        }
    });

    Ok(WorkerControlServer {
        url: format!("http://127.0.0.1:{port}/worker"),
        token,
        stop,
        handle: Some(handle),
    })
}

#[derive(Debug)]
struct WorkerControlHttpRequest {
    method: String,
    path: String,
    token: Option<String>,
    body: String,
}

#[derive(Debug)]
struct WorkerControlHttpResponse {
    status_code: u16,
    status_text: &'static str,
    body: Value,
}

fn handle_worker_control_stream<R: Runtime>(
    service: &WorkerQueueService<R>,
    expected_token: &str,
    stream: &mut TcpStream,
) -> WorkerControlHttpResponse {
    let request = match read_worker_control_request(stream) {
        Ok(request) => request,
        Err(error) => {
            return worker_control_response(
                400,
                "Bad Request",
                json!({ "ok": false, "error": error }),
            )
        }
    };

    if request.token.as_deref() != Some(expected_token) {
        return worker_control_response(
            401,
            "Unauthorized",
            json!({ "ok": false, "error": "unauthorized" }),
        );
    }

    if request.method != "POST" {
        return worker_control_response(
            405,
            "Method Not Allowed",
            json!({ "ok": false, "error": "method_not_allowed" }),
        );
    }

    match request.path.as_str() {
        "/worker/claim" => handle_worker_claim(service, &request.body),
        "/worker/checkpoint" => handle_worker_checkpoint(service, &request.body),
        "/worker/heartbeat" => handle_worker_heartbeat(service, &request.body),
        "/worker/complete" => handle_worker_complete(service, &request.body),
        "/worker/recover-expired-leases" => {
            handle_worker_recover_expired_leases(service, &request.body)
        }
        _ => worker_control_response(
            404,
            "Not Found",
            json!({ "ok": false, "error": "not_found" }),
        ),
    }
}

fn handle_worker_claim<R: Runtime>(
    service: &WorkerQueueService<R>,
    body: &str,
) -> WorkerControlHttpResponse {
    let input = match parse_worker_control_json::<WorkerQueueClaimLeaseInput>(body) {
        Ok(input) => input,
        Err(error) => return worker_control_bad_request(error),
    };
    match service.claim_next_task_with_lease(input) {
        Ok(claimed) => worker_control_ok(json!({ "ok": true, "claimed": claimed })),
        Err(error) => worker_control_service_error(error),
    }
}

fn handle_worker_checkpoint<R: Runtime>(
    service: &WorkerQueueService<R>,
    body: &str,
) -> WorkerControlHttpResponse {
    let input = match parse_worker_control_json::<WorkerQueueCheckpointLeaseInput>(body) {
        Ok(input) => input,
        Err(error) => return worker_control_bad_request(error),
    };
    match service.check_cancel_checkpoint_with_lease(input) {
        Ok(result) => {
            let cancel_requested = result.cancel_requested;
            let lease_valid = result.lease_valid;
            worker_control_ok(json!({
                "ok": true,
                "checkpoint": result,
                "cancelRequested": cancel_requested,
                "leaseValid": lease_valid
            }))
        }
        Err(error) => worker_control_service_error(error),
    }
}

fn handle_worker_heartbeat<R: Runtime>(
    service: &WorkerQueueService<R>,
    body: &str,
) -> WorkerControlHttpResponse {
    let input = match parse_worker_control_json::<WorkerQueueHeartbeatLeaseInput>(body) {
        Ok(input) => input,
        Err(error) => return worker_control_bad_request(error),
    };
    match service.heartbeat_task_lease(input) {
        Ok(heartbeat) => worker_control_ok(json!({ "ok": true, "heartbeat": heartbeat })),
        Err(error) => worker_control_service_error(error),
    }
}

fn handle_worker_complete<R: Runtime>(
    service: &WorkerQueueService<R>,
    body: &str,
) -> WorkerControlHttpResponse {
    let input = match parse_worker_control_json::<WorkerQueueCompleteLeaseInput>(body) {
        Ok(input) => input,
        Err(error) => return worker_control_bad_request(error),
    };
    match service.complete_task_with_lease(input) {
        Ok(completed) => worker_control_ok(json!({ "ok": true, "completed": completed })),
        Err(error) => worker_control_service_error(error),
    }
}

fn handle_worker_recover_expired_leases(
    service: &WorkerQueueService<impl Runtime>,
    body: &str,
) -> WorkerControlHttpResponse {
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct RecoverInput {
        limit: Option<i64>,
    }

    let input = match parse_worker_control_json::<RecoverInput>(body) {
        Ok(input) => input,
        Err(error) => return worker_control_bad_request(error),
    };
    match service.recover_expired_task_leases(input.limit) {
        Ok(summary) => worker_control_ok(json!({ "ok": true, "summary": summary })),
        Err(error) => worker_control_service_error(error),
    }
}

fn parse_worker_control_json<T: serde::de::DeserializeOwned>(body: &str) -> Result<T, String> {
    serde_json::from_str::<T>(if body.trim().is_empty() { "{}" } else { body })
        .map_err(|error| format!("invalid_json: {error}"))
}

fn read_worker_control_request(stream: &mut TcpStream) -> Result<WorkerControlHttpRequest, String> {
    let mut buffer = [0_u8; WORKER_CONTROL_READ_BUFFER_BYTES];
    let mut data = Vec::new();
    let mut header_end: Option<usize> = None;
    let mut content_length: Option<usize> = None;

    loop {
        if let (Some(end), Some(length)) = (header_end, content_length) {
            let expected_size = end
                .checked_add(length)
                .ok_or_else(|| "request_too_large".to_string())?;
            if expected_size > WORKER_CONTROL_MAX_REQUEST_BYTES {
                return Err("request_too_large".to_string());
            }
            if data.len() >= expected_size {
                break;
            }
        }

        let size = stream
            .read(&mut buffer)
            .map_err(|error| format!("read_failed: {error}"))?;
        if size == 0 {
            break;
        }
        data.extend_from_slice(&buffer[..size]);
        if data.len() > WORKER_CONTROL_MAX_REQUEST_BYTES {
            return Err("request_too_large".to_string());
        }

        if header_end.is_none() {
            if let Some(position) = data.windows(4).position(|window| window == b"\r\n\r\n") {
                let end = position + 4;
                let head = String::from_utf8_lossy(&data[..position]);
                let length = worker_control_content_length(&head)?;
                if end.saturating_add(length) > WORKER_CONTROL_MAX_REQUEST_BYTES {
                    return Err("request_too_large".to_string());
                }
                header_end = Some(end);
                content_length = Some(length);
            }
        }
    }

    if data.is_empty() {
        return Err("empty_request".to_string());
    }
    let header_end = header_end.ok_or_else(|| "missing_header_terminator".to_string())?;
    let content_length = content_length.unwrap_or(0);
    let expected_size = header_end
        .checked_add(content_length)
        .ok_or_else(|| "request_too_large".to_string())?;
    if data.len() < expected_size {
        return Err("incomplete_body".to_string());
    }

    let head = String::from_utf8_lossy(&data[..header_end - 4]);
    let body = String::from_utf8_lossy(&data[header_end..expected_size]);
    let mut lines = head.lines();
    let request_line = lines
        .next()
        .ok_or_else(|| "missing_request_line".to_string())?;
    let mut request_parts = request_line.split_whitespace();
    let method = request_parts
        .next()
        .ok_or_else(|| "missing_method".to_string())?
        .to_string();
    let path = request_parts
        .next()
        .ok_or_else(|| "missing_path".to_string())?
        .split('?')
        .next()
        .unwrap_or("")
        .to_string();
    let token = lines.find_map(|line| {
        let (name, value) = line.split_once(':')?;
        if name.eq_ignore_ascii_case("x-monster-token") {
            Some(value.trim().to_string())
        } else {
            None
        }
    });

    Ok(WorkerControlHttpRequest {
        method,
        path,
        token,
        body: body.to_string(),
    })
}

fn worker_control_content_length(head: &str) -> Result<usize, String> {
    for line in head.lines().skip(1) {
        let Some((name, value)) = line.split_once(':') else {
            continue;
        };
        if name.eq_ignore_ascii_case("content-length") {
            return value
                .trim()
                .parse::<usize>()
                .map_err(|_| "invalid_content_length".to_string());
        }
    }
    Ok(0)
}

fn write_worker_control_response(
    stream: &mut TcpStream,
    response: WorkerControlHttpResponse,
) -> std::io::Result<()> {
    let body = response.body.to_string();
    let raw = format!(
        "HTTP/1.1 {} {}\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        response.status_code,
        response.status_text,
        body.len(),
        body
    );
    stream.write_all(raw.as_bytes())
}

fn worker_control_ok(body: Value) -> WorkerControlHttpResponse {
    worker_control_response(200, "OK", body)
}

fn worker_control_bad_request(error: String) -> WorkerControlHttpResponse {
    worker_control_response(400, "Bad Request", json!({ "ok": false, "error": error }))
}

fn worker_control_service_error(error: AppError) -> WorkerControlHttpResponse {
    worker_control_response(
        409,
        "Conflict",
        json!({ "ok": false, "error": error.to_string() }),
    )
}

fn worker_control_response(
    status_code: u16,
    status_text: &'static str,
    body: Value,
) -> WorkerControlHttpResponse {
    WorkerControlHttpResponse {
        status_code,
        status_text,
        body,
    }
}

fn normalize_complete_status(status: &str) -> AppResult<String> {
    let value = status.trim().to_ascii_lowercase();
    match value.as_str() {
        "succeeded" | "failed" | "cancelled" | "blocked" => Ok(value),
        _ => Err(AppError::Config(
            "worker completion status must be succeeded, failed, cancelled, or blocked".to_string(),
        )),
    }
}

fn complete_event_type(status: &str) -> &'static str {
    match status {
        "succeeded" => "worker_succeeded",
        "failed" => "worker_failed",
        "cancelled" => "worker_cancelled",
        "blocked" => "worker_blocked",
        _ => "worker_completed",
    }
}

fn task_requires_special_file_settle(task_type: &str) -> bool {
    matches!(task_type, "image.generate.batch" | "demo.image.generate")
}

fn validate_worker_sidecar_output_file(output_dir: &Path, file_path: &str) -> AppResult<String> {
    let output_root = output_dir
        .canonicalize()
        .map_err(|error| AppError::Io(format!("failed to read image output dir: {error}")))?;
    let file = PathBuf::from(file_path);
    let canonical_file = file
        .canonicalize()
        .map_err(|error| AppError::Io(format!("failed to read sidecar image file: {error}")))?;
    if !canonical_file.starts_with(&output_root) {
        return Err(AppError::Process(
            "sidecar image path is outside authorized output dir".to_string(),
        ));
    }
    Ok(canonical_file.to_string_lossy().to_string())
}

fn copy_worker_sidecar_thumbnail(file_path: &str) -> AppResult<String> {
    let source_path = PathBuf::from(file_path);
    let thumbnail_path = source_path.with_file_name(format!(
        "{}-thumb{}",
        source_path
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("image"),
        source_path
            .extension()
            .and_then(|value| value.to_str())
            .map(|ext| format!(".{ext}"))
            .unwrap_or_else(|| ".png".to_string())
    ));
    fs::copy(&source_path, &thumbnail_path)
        .map_err(|error| AppError::Io(format!("failed to create image thumbnail: {error}")))?;
    Ok(thumbnail_path.to_string_lossy().to_string())
}

fn extract_worker_sidecar_prompt_request(
    sidecar_response: &SidecarWorkflowTaskResult,
) -> Option<String> {
    sidecar_response
        .model_runs
        .iter()
        .find_map(|model_run| worker_metadata_text(&model_run.metadata, "promptRequest"))
        .or_else(|| {
            sidecar_response
                .outputs
                .iter()
                .find_map(|output| worker_metadata_text(&output.metadata, "promptRequest"))
        })
}

fn worker_metadata_text(metadata: &Option<Value>, key: &str) -> Option<String> {
    metadata
        .as_ref()
        .and_then(|value| value.get(key))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn worker_simple_prompt_hash(value: &str) -> String {
    let mut hash: u64 = 1469598103934665603;
    for byte in value.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(1099511628211);
    }
    format!("{hash:016x}")
}

fn summarize_worker_text(value: &str) -> String {
    let trimmed = value.trim();
    const MAX_CHARS: usize = 120;
    if trimmed.chars().count() <= MAX_CHARS {
        return trimmed.to_string();
    }
    trimmed.chars().take(MAX_CHARS).collect::<String>() + "..."
}

fn should_retry_worker_sidecar_result(
    task: &CreativeTask,
    final_status: &str,
    sidecar_result: &SidecarWorkflowTaskResult,
) -> bool {
    final_status == "failed"
        && task.retry_count < task.max_retries
        && sidecar_result
            .retry
            .as_ref()
            .map(|retry| retry.should_retry)
            .unwrap_or(false)
}

fn build_worker_sidecar_result_json(
    sidecar_result: &SidecarWorkflowTaskResult,
    final_status: &str,
    asset_ids: &[i64],
    model_run_ids: &[i64],
) -> AppResult<String> {
    let asset_id = asset_ids.first().copied();
    Ok(json!({
        "status": final_status,
        "sidecarStatus": sidecar_result.status.clone(),
        "message": sidecar_result.message.clone(),
        "assetId": asset_id,
        "assetIds": asset_ids,
        "modelRunIds": model_run_ids,
        "outputCount": sidecar_result.outputs.len(),
        "retry": sidecar_result.retry.clone(),
    })
    .to_string())
}

#[allow(dead_code)]
fn validate_worker_identity(worker_id: &str, runtime_instance_id: &str) -> AppResult<()> {
    if worker_id.trim().is_empty() {
        return Err(AppError::Config("worker id must not be empty".to_string()));
    }
    if runtime_instance_id.trim().is_empty() {
        return Err(AppError::Config(
            "runtime instance id must not be empty".to_string(),
        ));
    }
    Ok(())
}

#[allow(dead_code)]
fn validate_claim_token(claim_token: &str) -> AppResult<()> {
    if claim_token.trim().is_empty() {
        return Err(AppError::Config(
            "claim token must not be empty".to_string(),
        ));
    }
    Ok(())
}

#[allow(dead_code)]
fn normalize_lease_duration_ms(value: Option<u64>) -> u128 {
    value.unwrap_or(30_000).clamp(1_000, 15 * 60 * 1_000) as u128
}

#[allow(dead_code)]
fn build_claim_token(worker_id: &str, runtime_instance_id: &str, now_ms: u128) -> String {
    format!(
        "monster-claim-{}-{}-{now_ms}",
        compact_token_part(worker_id),
        compact_token_part(runtime_instance_id)
    )
}

#[allow(dead_code)]
fn compact_token_part(value: &str) -> String {
    value
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_'))
        .take(48)
        .collect::<String>()
}

#[allow(dead_code)]
fn lease_timestamp(value: u128) -> String {
    format!("{value:020}")
}

#[allow(dead_code)]
fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_else(|_| Duration::from_millis(0))
        .as_millis()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infra::creative_asset_repo;
    use crate::infra::creative_batch_repo;
    use crate::infra::creative_db_schema::init_schema;
    use crate::infra::creative_model_run_repo;
    use crate::infra::creative_types::{CreateCreativeBatchJobInput, CreateCreativeTaskInput};
    use crate::infra::creative_types::{ListCreativeAssetsFilter, ListModelRunsFilter};
    use std::io::{Read, Write};
    use std::net::TcpStream;
    use std::path::PathBuf;
    use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

    fn temp_root(name: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be valid")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "monster-workbench-worker-{name}-{}-{nanos}",
            std::process::id()
        ))
    }

    fn service_for(app_dir: PathBuf) -> WorkerQueueService {
        let db_path = app_dir.join("monster_workbench.db");
        WorkerQueueService::new(PathProvider::new_for_test(app_dir, db_path))
    }

    fn post_worker_control(
        server: &WorkerControlServer,
        path: &str,
        token: &str,
        body: Value,
    ) -> (String, Value) {
        let port = server
            .url
            .trim_start_matches("http://127.0.0.1:")
            .split('/')
            .next()
            .expect("server port should exist")
            .parse::<u16>()
            .expect("server port should parse");
        let body = body.to_string();
        let mut stream = TcpStream::connect(("127.0.0.1", port)).expect("server should accept");
        let request = format!(
            "POST {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\nContent-Type: application/json\r\nContent-Length: {}\r\nX-Monster-Token: {token}\r\n\r\n{}",
            body.len(),
            body
        );
        stream
            .write_all(request.as_bytes())
            .expect("request should write");
        let response = read_http_response(&mut stream);
        let response_body = response
            .split("\r\n\r\n")
            .nth(1)
            .expect("response body should exist");
        let parsed = serde_json::from_str::<Value>(response_body).expect("json should parse");
        (response, parsed)
    }

    fn read_http_response(stream: &mut TcpStream) -> String {
        stream
            .set_read_timeout(Some(Duration::from_secs(2)))
            .expect("response read timeout should set");
        let mut buffer = [0_u8; 8192];
        let mut data = Vec::new();
        let mut header_end = None;
        let mut content_length = 0usize;
        let deadline = Instant::now() + Duration::from_secs(5);
        loop {
            match stream.read(&mut buffer) {
                Ok(0) => break,
                Ok(size) => {
                    data.extend_from_slice(&buffer[..size]);
                    if header_end.is_none() {
                        if let Some(position) =
                            data.windows(4).position(|window| window == b"\r\n\r\n")
                        {
                            let end = position + 4;
                            header_end = Some(end);
                            let headers = String::from_utf8_lossy(&data[..end]).into_owned();
                            content_length = headers
                                .lines()
                                .find_map(|line| {
                                    let (name, value) = line.split_once(':')?;
                                    if name.trim().eq_ignore_ascii_case("content-length") {
                                        value.trim().parse::<usize>().ok()
                                    } else {
                                        None
                                    }
                                })
                                .unwrap_or(0);
                            if data.len() >= end + content_length {
                                break;
                            }
                        }
                    } else if let Some(end) = header_end {
                        if data.len() >= end + content_length {
                            break;
                        }
                    }
                }
                Err(error)
                    if matches!(
                        error.kind(),
                        std::io::ErrorKind::WouldBlock
                            | std::io::ErrorKind::TimedOut
                            | std::io::ErrorKind::ConnectionReset
                    ) =>
                {
                    if let Some(end) = header_end {
                        if data.len() >= end + content_length {
                            break;
                        }
                    }
                    if std::io::ErrorKind::ConnectionReset == error.kind()
                        || Instant::now() >= deadline
                    {
                        break;
                    }
                }
                Err(error) => panic!("response should read: {error}"),
            }
        }
        assert!(!data.is_empty(), "response should not be empty");
        String::from_utf8_lossy(&data).into_owned()
    }

    #[test]
    fn claim_next_task_picks_queued_task() {
        let root = temp_root("claim");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());
        let db_path = app_dir.join("monster_workbench.db");

        init_schema(&db_path).expect("schema should init");
        creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "generate_image_prompt".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )
        .expect("task should create");

        let claimed = service
            .claim_next_task(Some("generate_image_prompt".to_string()), None)
            .expect("claim should pass")
            .expect("queued task should be claimed");
        assert_eq!(claimed.status, "running");

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn lease_claim_heartbeat_and_complete_require_current_owner() {
        let root = temp_root("lease-control");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());
        let db_path = app_dir.join("monster_workbench.db");

        init_schema(&db_path).expect("schema should init");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "image.generate.batch".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )
        .expect("task should create");

        let claimed = service
            .claim_next_task_with_lease(WorkerQueueClaimLeaseInput {
                task_type: Some("image.generate.batch".to_string()),
                project_id: Some("project-a".to_string()),
                batch_job_id: None,
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                lease_duration_ms: Some(60_000),
            })
            .expect("lease claim should succeed")
            .expect("queued task should be claimed");
        assert_eq!(claimed.task.id, task.id);
        assert_eq!(claimed.task.status, "running");
        assert!(!claimed.claim_token.is_empty());

        let wrong_heartbeat = service
            .heartbeat_task_lease(WorkerQueueHeartbeatLeaseInput {
                task_id: task.id,
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "wrong-token".to_string(),
                lease_duration_ms: Some(60_000),
            })
            .expect("wrong heartbeat should be handled");
        assert!(wrong_heartbeat.is_none());

        let heartbeat = service
            .heartbeat_task_lease(WorkerQueueHeartbeatLeaseInput {
                task_id: task.id,
                worker_id: claimed.worker_id.clone(),
                runtime_instance_id: claimed.runtime_instance_id.clone(),
                claim_token: claimed.claim_token.clone(),
                lease_duration_ms: Some(60_000),
            })
            .expect("heartbeat should succeed")
            .expect("current owner should heartbeat");
        assert_eq!(heartbeat.task.id, task.id);
        assert_eq!(heartbeat.lease_renewal_count, 1);

        let wrong_complete = service
            .complete_task_with_lease(WorkerQueueCompleteLeaseInput {
                task_id: task.id,
                worker_id: "worker-b".to_string(),
                runtime_instance_id: claimed.runtime_instance_id.clone(),
                claim_token: claimed.claim_token.clone(),
                status: "succeeded".to_string(),
                result_json: Some(r#"{"wrong":true}"#.to_string()),
                error_message: None,
                asset_id: None,
                lease_duration_ms: None,
                sidecar_result: None,
            })
            .expect("wrong complete should be handled");
        assert!(wrong_complete.is_none());

        let completed = service
            .complete_task_with_lease(WorkerQueueCompleteLeaseInput {
                task_id: task.id,
                worker_id: claimed.worker_id,
                runtime_instance_id: claimed.runtime_instance_id,
                claim_token: claimed.claim_token,
                status: "succeeded".to_string(),
                result_json: Some(r#"{"ok":true}"#.to_string()),
                error_message: None,
                asset_id: None,
                lease_duration_ms: None,
                sidecar_result: None,
            })
            .expect("complete should succeed")
            .expect("current owner should complete");
        assert_eq!(completed.final_status, "succeeded");
        assert_eq!(completed.task.status, "succeeded");
        assert_eq!(
            completed.task.result_json.as_deref(),
            Some(r#"{"ok":true}"#)
        );

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn worker_control_server_rejects_missing_or_wrong_runtime_token() {
        let root = temp_root("control-auth");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let db_path = app_dir.join("monster_workbench.db");
        init_schema(&db_path).expect("schema should init");

        let server = start_worker_control_server(
            PathProvider::<Wry>::new_for_test(app_dir.clone(), db_path),
            "runtime-token".to_string(),
        )
        .expect("control server should start");

        let (response, body) = post_worker_control(
            &server,
            "/worker/claim",
            "wrong-token",
            json!({
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a"
            }),
        );
        assert!(response.starts_with("HTTP/1.1 401 Unauthorized"));
        assert_eq!(body["ok"], false);
        assert_eq!(body["error"], "unauthorized");

        drop(server);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn worker_control_server_claims_heartbeats_and_completes_with_lease() {
        let root = temp_root("control-lease");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let db_path = app_dir.join("monster_workbench.db");
        init_schema(&db_path).expect("schema should init");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "image.generate.batch".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )
        .expect("task should create");

        let server = start_worker_control_server(
            PathProvider::<Wry>::new_for_test(app_dir.clone(), db_path.clone()),
            "runtime-token".to_string(),
        )
        .expect("control server should start");

        let (response, body) = post_worker_control(
            &server,
            "/worker/claim",
            "runtime-token",
            json!({
                "taskType": "image.generate.batch",
                "projectId": "project-a",
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "leaseDurationMs": 60000
            }),
        );
        assert!(response.starts_with("HTTP/1.1 200 OK"));
        assert_eq!(body["ok"], true);
        assert_eq!(body["claimed"]["task"]["id"], task.id);
        assert_eq!(body["claimed"]["task"]["status"], "running");
        let claim_token = body["claimed"]["claimToken"]
            .as_str()
            .expect("claim token should exist")
            .to_string();

        let (_, wrong_heartbeat) = post_worker_control(
            &server,
            "/worker/heartbeat",
            "runtime-token",
            json!({
                "taskId": task.id,
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "claimToken": "wrong-token",
                "leaseDurationMs": 60000
            }),
        );
        assert_eq!(wrong_heartbeat["ok"], true);
        assert!(wrong_heartbeat["heartbeat"].is_null());

        let (_, heartbeat) = post_worker_control(
            &server,
            "/worker/heartbeat",
            "runtime-token",
            json!({
                "taskId": task.id,
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "claimToken": claim_token,
                "leaseDurationMs": 60000
            }),
        );
        assert_eq!(heartbeat["ok"], true);
        assert_eq!(heartbeat["heartbeat"]["task"]["id"], task.id);
        assert_eq!(heartbeat["heartbeat"]["leaseRenewalCount"], 1);
        let claim_token = body["claimed"]["claimToken"]
            .as_str()
            .expect("claim token should exist")
            .to_string();

        let (_, checkpoint) = post_worker_control(
            &server,
            "/worker/checkpoint",
            "runtime-token",
            json!({
                "taskId": task.id,
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "claimToken": "wrong-token"
            }),
        );
        assert_eq!(checkpoint["ok"], true);
        assert_eq!(checkpoint["cancelRequested"], true);
        assert_eq!(checkpoint["leaseValid"], false);

        let (_, checkpoint) = post_worker_control(
            &server,
            "/worker/checkpoint",
            "runtime-token",
            json!({
                "taskId": task.id,
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "claimToken": claim_token
            }),
        );
        assert_eq!(checkpoint["ok"], true);
        assert_eq!(checkpoint["cancelRequested"], false);
        assert_eq!(checkpoint["leaseValid"], true);

        let (_, wrong_complete) = post_worker_control(
            &server,
            "/worker/complete",
            "runtime-token",
            json!({
                "taskId": task.id,
                "workerId": "worker-b",
                "runtimeInstanceId": "runtime-a",
                "claimToken": claim_token,
                "status": "succeeded",
                "resultJson": "{\"wrong\":true}"
            }),
        );
        assert_eq!(wrong_complete["ok"], true);
        assert!(wrong_complete["completed"].is_null());
        let claim_token = body["claimed"]["claimToken"]
            .as_str()
            .expect("claim token should exist")
            .to_string();

        let (_, completed) = post_worker_control(
            &server,
            "/worker/complete",
            "runtime-token",
            json!({
                "taskId": task.id,
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "claimToken": claim_token,
                "status": "succeeded",
                "resultJson": "{\"ok\":true}"
            }),
        );
        assert_eq!(completed["ok"], true);
        assert_eq!(completed["completed"]["task"]["status"], "succeeded");
        assert_eq!(completed["completed"]["finalStatus"], "succeeded");

        drop(server);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn worker_control_claim_respects_batch_concurrency() {
        let root = temp_root("control-batch-concurrency");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let db_path = app_dir.join("monster_workbench.db");
        init_schema(&db_path).expect("schema should init");
        let job = creative_batch_repo::create_batch_job(
            &db_path,
            CreateCreativeBatchJobInput {
                project_id: Some("project-a".to_string()),
                name: "Prompt batch".to_string(),
                batch_type: "image.prompt.batch".to_string(),
                status: Some("running".to_string()),
                total_count: Some(2),
                concurrency: Some(1),
                max_retries: Some(1),
                prompt_template: Some("Render {{sequenceNo}}".to_string()),
                provider_id: None,
                model: None,
                image_size: None,
                budget_json: None,
            },
        )
        .expect("batch job should create");
        let first_task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: Some(job.id),
                task_type: "image.prompt.batch".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: Some(1),
            },
        )
        .expect("first task should create");
        let second_task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: Some(job.id),
                task_type: "image.prompt.batch".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: Some(2),
            },
        )
        .expect("second task should create");

        let server = start_worker_control_server(
            PathProvider::<Wry>::new_for_test(app_dir.clone(), db_path.clone()),
            "runtime-token".to_string(),
        )
        .expect("control server should start");

        let (_, first_claim) = post_worker_control(
            &server,
            "/worker/claim",
            "runtime-token",
            json!({
                "taskType": "image.prompt.batch",
                "projectId": "project-a",
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "leaseDurationMs": 60000
            }),
        );
        assert_eq!(first_claim["ok"], true);
        assert_eq!(first_claim["claimed"]["task"]["id"], first_task.id);
        let first_claim_token = first_claim["claimed"]["claimToken"]
            .as_str()
            .expect("claim token should exist")
            .to_string();

        let (_, blocked_claim) = post_worker_control(
            &server,
            "/worker/claim",
            "runtime-token",
            json!({
                "taskType": "image.prompt.batch",
                "projectId": "project-a",
                "workerId": "worker-b",
                "runtimeInstanceId": "runtime-a",
                "leaseDurationMs": 60000
            }),
        );
        assert_eq!(blocked_claim["ok"], true);
        assert!(blocked_claim["claimed"].is_null());

        let (_, completed) = post_worker_control(
            &server,
            "/worker/complete",
            "runtime-token",
            json!({
                "taskId": first_task.id,
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "claimToken": first_claim_token,
                "status": "succeeded",
                "resultJson": "{\"ok\":true}"
            }),
        );
        assert_eq!(completed["ok"], true);
        assert_eq!(completed["completed"]["task"]["status"], "succeeded");

        let (_, second_claim) = post_worker_control(
            &server,
            "/worker/claim",
            "runtime-token",
            json!({
                "taskType": "image.prompt.batch",
                "projectId": "project-a",
                "workerId": "worker-b",
                "runtimeInstanceId": "runtime-a",
                "leaseDurationMs": 60000
            }),
        );
        assert_eq!(second_claim["ok"], true);
        assert_eq!(second_claim["claimed"]["task"]["id"], second_task.id);
        let second_claim_token = second_claim["claimed"]["claimToken"]
            .as_str()
            .expect("claim token should exist")
            .to_string();

        let (_, second_completed) = post_worker_control(
            &server,
            "/worker/complete",
            "runtime-token",
            json!({
                "taskId": second_task.id,
                "workerId": "worker-b",
                "runtimeInstanceId": "runtime-a",
                "claimToken": second_claim_token,
                "status": "succeeded",
                "resultJson": "{\"ok\":true}"
            }),
        );
        assert_eq!(second_completed["ok"], true);
        assert_eq!(second_completed["completed"]["task"]["status"], "succeeded");

        let batch = creative_batch_repo::get_batch_job_snapshot(&db_path, job.id)
            .expect("batch snapshot should load")
            .expect("batch should exist");
        assert_eq!(batch.job.status, "completed");
        assert_eq!(batch.stats.queued_tasks, 0);
        assert_eq!(batch.stats.running_tasks, 0);

        drop(server);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn check_cancel_checkpoint_respects_cancelled_parent_batch() {
        let root = temp_root("checkpoint-cancelled-parent-batch");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());
        let db_path = app_dir.join("monster_workbench.db");
        init_schema(&db_path).expect("schema should init");
        let job = creative_batch_repo::create_batch_job(
            &db_path,
            CreateCreativeBatchJobInput {
                project_id: Some("project-a".to_string()),
                name: "Prompt batch".to_string(),
                batch_type: "image.prompt.batch".to_string(),
                status: Some("cancelled".to_string()),
                total_count: Some(1),
                concurrency: Some(1),
                max_retries: Some(1),
                prompt_template: Some("Render {{sequenceNo}}".to_string()),
                provider_id: None,
                model: None,
                image_size: None,
                budget_json: None,
            },
        )
        .expect("batch job should create");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: Some(job.id),
                task_type: "image.prompt.batch".to_string(),
                status: Some("running".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: Some(1),
            },
        )
        .expect("task should create");

        assert_eq!(
            service
                .check_cancel_checkpoint(task.id)
                .expect("checkpoint should resolve"),
            true
        );

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn check_cancel_checkpoint_does_not_cancel_paused_parent_batch() {
        let root = temp_root("checkpoint-paused-parent-batch");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());
        let db_path = app_dir.join("monster_workbench.db");
        init_schema(&db_path).expect("schema should init");
        let job = creative_batch_repo::create_batch_job(
            &db_path,
            CreateCreativeBatchJobInput {
                project_id: Some("project-a".to_string()),
                name: "Prompt batch".to_string(),
                batch_type: "image.prompt.batch".to_string(),
                status: Some("paused".to_string()),
                total_count: Some(1),
                concurrency: Some(1),
                max_retries: Some(1),
                prompt_template: Some("Render {{sequenceNo}}".to_string()),
                provider_id: None,
                model: None,
                image_size: None,
                budget_json: None,
            },
        )
        .expect("batch job should create");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: Some(job.id),
                task_type: "image.prompt.batch".to_string(),
                status: Some("running".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: Some(1),
            },
        )
        .expect("task should create");

        assert_eq!(
            service
                .check_cancel_checkpoint(task.id)
                .expect("checkpoint should resolve"),
            false
        );

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn worker_control_complete_with_sidecar_result_trusted_settles_text_output() {
        let root = temp_root("control-sidecar-complete");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let db_path = app_dir.join("monster_workbench.db");
        init_schema(&db_path).expect("schema should init");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "image.prompt.batch".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: Some(1),
            },
        )
        .expect("task should create");

        let server = start_worker_control_server(
            PathProvider::<Wry>::new_for_test(app_dir.clone(), db_path.clone()),
            "runtime-token".to_string(),
        )
        .expect("control server should start");
        let long_prompt = format!(
            "A cinematic product photo. {}",
            "rich lighting and surface detail. ".repeat(2_500)
        );
        let (_, claimed) = post_worker_control(
            &server,
            "/worker/claim",
            "runtime-token",
            json!({
                "taskType": "image.prompt.batch",
                "projectId": "project-a",
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "leaseDurationMs": 60000
            }),
        );
        assert_eq!(claimed["ok"], true);
        let claim_token = claimed["claimed"]["claimToken"]
            .as_str()
            .expect("claim token should exist")
            .to_string();

        let (response, completed) = post_worker_control(
            &server,
            "/worker/complete",
            "runtime-token",
            json!({
                "taskId": task.id,
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "claimToken": claim_token,
                "status": "succeeded",
                "leaseDurationMs": 60000,
                "sidecarResult": {
                    "protocolVersion": 1,
                    "taskId": task.id,
                    "status": "succeeded",
                    "message": "prompt built",
                    "outputs": [{
                        "assetType": "demo_image_prompt",
                        "title": "Prompt 1",
                        "content": long_prompt.clone(),
                        "filePath": null,
                        "thumbnailPath": null,
                        "metadata": {
                            "promptRequest": long_prompt.clone()
                        }
                    }],
                    "modelRuns": [{
                        "providerId": "provider-a",
                        "providerType": "openai-compatible",
                        "model": "chat-model",
                        "requestType": "chat",
                        "status": "succeeded",
                        "durationMs": 123,
                        "promptHash": "hash-a",
                        "promptVersionId": null,
                        "inputTokenCount": 10,
                        "outputTokenCount": 20,
                        "costEstimate": null,
                        "errorCode": null,
                        "errorMessage": null,
                        "metadata": {
                            "source": "worker-control-test"
                        }
                    }],
                    "events": [{
                        "eventType": "prompt_built",
                        "message": "prompt generated by sidecar",
                        "payload": {
                            "step": "prompt"
                        }
                    }],
                    "retry": null
                }
            }),
        );
        assert!(response.starts_with("HTTP/1.1 200 OK"));
        assert_eq!(completed["ok"], true);
        assert_eq!(completed["completed"]["task"]["status"], "succeeded");
        assert_eq!(completed["completed"]["finalStatus"], "succeeded");
        let asset_id = completed["completed"]["assetIds"][0]
            .as_i64()
            .expect("asset id should exist");
        let model_run_id = completed["completed"]["modelRunIds"][0]
            .as_i64()
            .expect("model run id should exist");

        let updated = creative_task_repo::get_task(&db_path, task.id)
            .expect("task should load")
            .expect("task should exist");
        assert_eq!(updated.status, "succeeded");
        assert_eq!(updated.asset_id, Some(asset_id));
        assert!(updated
            .result_json
            .as_deref()
            .expect("result json should exist")
            .contains("\"sidecarStatus\":\"succeeded\""));

        let assets = creative_asset_repo::list_assets(
            &db_path,
            ListCreativeAssetsFilter {
                project_id: Some("project-a".to_string()),
                asset_type: Some("demo_image_prompt".to_string()),
                ..Default::default()
            },
        )
        .expect("assets should list");
        assert_eq!(assets.len(), 1);
        assert_eq!(assets[0].id, asset_id);
        assert_eq!(assets[0].content.as_deref(), Some(long_prompt.as_str()));
        assert_eq!(assets[0].status, "ready");
        assert!(assets[0].file_path.is_none());

        let model_runs = creative_model_run_repo::list_model_runs(
            &db_path,
            ListModelRunsFilter {
                task_id: Some(task.id),
                ..Default::default()
            },
        )
        .expect("model runs should list");
        assert_eq!(model_runs.len(), 1);
        assert_eq!(model_runs[0].id, model_run_id);
        assert_eq!(model_runs[0].asset_id, Some(asset_id));
        assert_eq!(model_runs[0].request_type, "chat");

        let events =
            creative_task_repo::list_task_events(&db_path, task.id).expect("events should list");
        assert!(events
            .iter()
            .any(|event| event.event_type == "prompt_built"));
        assert!(events
            .iter()
            .any(|event| event.event_type == "worker_succeeded"));
        assert!(events
            .iter()
            .any(|event| event.event_type == "asset_created"));

        drop(server);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn worker_control_complete_requeues_failed_sidecar_result_when_retry_allowed() {
        let root = temp_root("control-sidecar-retry");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());
        let db_path = app_dir.join("monster_workbench.db");

        init_schema(&db_path).expect("schema should init");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "image.prompt.batch".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(2),
                parent_task_id: None,
                asset_id: None,
                sequence_no: Some(1),
            },
        )
        .expect("task should create");
        let claimed = service
            .claim_next_task_with_lease(WorkerQueueClaimLeaseInput {
                task_type: Some("image.prompt.batch".to_string()),
                project_id: Some("project-a".to_string()),
                batch_job_id: None,
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                lease_duration_ms: Some(60_000),
            })
            .expect("claim should pass")
            .expect("task should claim");
        let sidecar_result = serde_json::from_value::<SidecarWorkflowTaskResult>(json!({
            "protocolVersion": 1,
            "taskId": task.id,
            "status": "failed",
            "message": "provider temporarily failed",
            "outputs": [],
            "modelRuns": [{
                "providerId": "provider-a",
                "providerType": "openai-compatible",
                "model": "chat-model",
                "requestType": "chat",
                "status": "failed",
                "durationMs": 50,
                "promptHash": null,
                "promptVersionId": null,
                "inputTokenCount": null,
                "outputTokenCount": null,
                "costEstimate": null,
                "errorCode": "provider_error",
                "errorMessage": "provider temporarily failed",
                "metadata": null
            }],
            "events": [],
            "retry": {
                "shouldRetry": true,
                "reason": "temporary provider failure"
            }
        }))
        .expect("sidecar result should parse");

        let completed = service
            .complete_task_with_lease(WorkerQueueCompleteLeaseInput {
                task_id: task.id,
                worker_id: claimed.worker_id,
                runtime_instance_id: claimed.runtime_instance_id,
                claim_token: claimed.claim_token,
                status: "failed".to_string(),
                result_json: None,
                error_message: None,
                asset_id: None,
                lease_duration_ms: Some(60_000),
                sidecar_result: Some(sidecar_result),
            })
            .expect("complete should pass")
            .expect("retryable failed result should requeue");

        assert_eq!(completed.final_status, "queued");
        assert_eq!(completed.task.status, "queued");
        assert_eq!(completed.task.retry_count, 1);
        assert_eq!(completed.model_run_ids.len(), 1);
        let events =
            creative_task_repo::list_task_events(&db_path, task.id).expect("events should list");
        assert!(events
            .iter()
            .any(|event| event.event_type == "worker_retrying"));

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn worker_control_complete_rejects_file_outputs_without_specialized_settle() {
        let root = temp_root("control-sidecar-file-output");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let db_path = app_dir.join("monster_workbench.db");
        init_schema(&db_path).expect("schema should init");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "image.prompt.batch".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: Some(1),
            },
        )
        .expect("task should create");

        let server = start_worker_control_server(
            PathProvider::<Wry>::new_for_test(app_dir.clone(), db_path.clone()),
            "runtime-token".to_string(),
        )
        .expect("control server should start");
        let (_, claimed) = post_worker_control(
            &server,
            "/worker/claim",
            "runtime-token",
            json!({
                "taskType": "image.prompt.batch",
                "projectId": "project-a",
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "leaseDurationMs": 60000
            }),
        );
        assert_eq!(claimed["ok"], true);
        let claim_token = claimed["claimed"]["claimToken"]
            .as_str()
            .expect("claim token should exist")
            .to_string();

        let (response, completed) = post_worker_control(
            &server,
            "/worker/complete",
            "runtime-token",
            json!({
                "taskId": task.id,
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "claimToken": claim_token,
                "status": "succeeded",
                "leaseDurationMs": 60000,
                "sidecarResult": {
                    "protocolVersion": 1,
                    "taskId": task.id,
                    "status": "succeeded",
                    "message": "image generated",
                    "outputs": [{
                        "assetType": "demo_image_prompt",
                        "title": "Image 1",
                        "content": null,
                        "filePath": "C:/tmp/generated.png",
                        "thumbnailPath": null,
                        "metadata": null
                    }],
                    "modelRuns": [],
                    "events": [],
                    "retry": null
                }
            }),
        );
        assert!(response.starts_with("HTTP/1.1 409 Conflict"));
        assert_eq!(completed["ok"], false);
        assert!(completed["error"]
            .as_str()
            .expect("error should be string")
            .contains("specialized Rust settle path"));

        let updated = creative_task_repo::get_task(&db_path, task.id)
            .expect("task should load")
            .expect("task should exist");
        assert_eq!(updated.status, "running");
        assert!(updated.asset_id.is_none());

        drop(server);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn worker_control_complete_with_image_file_output_trusted_settles_asset() {
        let root = temp_root("control-sidecar-image-output");
        let app_dir = root.join("app-data");
        let output_dir = app_dir.join("ai").join("generated");
        std::fs::create_dir_all(&output_dir).expect("output dir should create");
        let image_path = output_dir.join("sidecar-image-test.png");
        std::fs::write(&image_path, b"fake-png").expect("image should write");
        let db_path = app_dir.join("monster_workbench.db");
        init_schema(&db_path).expect("schema should init");
        let job = creative_batch_repo::create_batch_job(
            &db_path,
            CreateCreativeBatchJobInput {
                project_id: Some("project-a".to_string()),
                name: "Image batch".to_string(),
                batch_type: "image.generate.batch".to_string(),
                status: Some("running".to_string()),
                total_count: Some(1),
                concurrency: Some(1),
                max_retries: Some(1),
                prompt_template: Some("Render {{sequenceNo}}".to_string()),
                provider_id: None,
                model: None,
                image_size: Some("1024x1024".to_string()),
                budget_json: None,
            },
        )
        .expect("batch job should create");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: Some(job.id),
                task_type: "image.generate.batch".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: Some(3),
            },
        )
        .expect("task should create");

        let server = start_worker_control_server(
            PathProvider::<Wry>::new_for_test(app_dir.clone(), db_path.clone()),
            "runtime-token".to_string(),
        )
        .expect("control server should start");
        let (_, claimed) = post_worker_control(
            &server,
            "/worker/claim",
            "runtime-token",
            json!({
                "taskType": "image.generate.batch",
                "projectId": "project-a",
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "leaseDurationMs": 60000
            }),
        );
        assert_eq!(claimed["ok"], true);
        let claim_token = claimed["claimed"]["claimToken"]
            .as_str()
            .expect("claim token should exist")
            .to_string();

        let (response, completed) = post_worker_control(
            &server,
            "/worker/complete",
            "runtime-token",
            json!({
                "taskId": task.id,
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "claimToken": claim_token,
                "status": "succeeded",
                "leaseDurationMs": 60000,
                "sidecarResult": {
                    "protocolVersion": 1,
                    "taskId": task.id,
                    "status": "succeeded",
                    "message": "image generated",
                    "outputs": [{
                        "assetType": "demo_image",
                        "title": "Image 3",
                        "content": "batch image workflow completed",
                        "filePath": image_path.to_string_lossy(),
                        "thumbnailPath": null,
                        "metadata": {
                            "promptRequest": "Render frame 3",
                            "promptHash": "hash-image"
                        }
                    }],
                    "modelRuns": [{
                        "providerId": "provider-a",
                        "providerType": "openai-compatible",
                        "model": "image-model",
                        "requestType": "image",
                        "status": "succeeded",
                        "durationMs": 250,
                        "promptHash": null,
                        "promptVersionId": null,
                        "inputTokenCount": null,
                        "outputTokenCount": null,
                        "costEstimate": null,
                        "errorCode": null,
                        "errorMessage": null,
                        "metadata": {
                            "promptRequest": "Render frame 3"
                        }
                    }],
                    "events": [{
                        "eventType": "batch_image_workflow_completed",
                        "message": "image generated",
                        "payload": {
                            "batchJobId": job.id,
                            "sequenceNo": 3
                        }
                    }],
                    "retry": null
                }
            }),
        );
        assert!(response.starts_with("HTTP/1.1 200 OK"));
        assert_eq!(completed["ok"], true);
        assert_eq!(completed["completed"]["task"]["status"], "succeeded");
        assert_eq!(completed["completed"]["finalStatus"], "succeeded");
        let asset_id = completed["completed"]["assetIds"][0]
            .as_i64()
            .expect("asset id should exist");

        let updated = creative_task_repo::get_task(&db_path, task.id)
            .expect("task should load")
            .expect("task should exist");
        assert_eq!(updated.status, "succeeded");
        assert_eq!(updated.asset_id, Some(asset_id));

        let assets = creative_asset_repo::list_assets(
            &db_path,
            ListCreativeAssetsFilter {
                project_id: Some("project-a".to_string()),
                asset_type: Some("demo_image".to_string()),
                ..Default::default()
            },
        )
        .expect("assets should list");
        assert_eq!(assets.len(), 1);
        assert_eq!(assets[0].id, asset_id);
        let expected_file_path = image_path
            .canonicalize()
            .expect("image path should canonicalize")
            .to_string_lossy()
            .to_string();
        assert_eq!(
            assets[0].file_path.as_deref(),
            Some(expected_file_path.as_str())
        );
        let thumbnail_path = assets[0]
            .thumbnail_path
            .clone()
            .expect("thumbnail should exist");
        assert!(PathBuf::from(&thumbnail_path).exists());

        let model_runs = creative_model_run_repo::list_model_runs(
            &db_path,
            ListModelRunsFilter {
                task_id: Some(task.id),
                ..Default::default()
            },
        )
        .expect("model runs should list");
        assert_eq!(model_runs.len(), 1);
        assert_eq!(model_runs[0].asset_id, Some(asset_id));
        assert_eq!(model_runs[0].request_type, "image");

        let events =
            creative_task_repo::list_task_events(&db_path, task.id).expect("events should list");
        assert!(events
            .iter()
            .any(|event| event.event_type == "batch_image_workflow_completed"));
        assert!(events
            .iter()
            .any(|event| event.event_type == "image_asset_saved"));
        assert!(events
            .iter()
            .any(|event| event.event_type == "worker_succeeded"));

        drop(server);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn worker_control_server_recovers_expired_leases() {
        let root = temp_root("control-recover");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let db_path = app_dir.join("monster_workbench.db");
        init_schema(&db_path).expect("schema should init");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "image.generate.batch".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(2),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )
        .expect("task should create");

        let server = start_worker_control_server(
            PathProvider::<Wry>::new_for_test(app_dir.clone(), db_path.clone()),
            "runtime-token".to_string(),
        )
        .expect("control server should start");
        let (_, warmup) = post_worker_control(
            &server,
            "/worker/recover-expired-leases",
            "runtime-token",
            json!({ "limit": 10 }),
        );
        assert_eq!(warmup["ok"], true);
        assert_eq!(warmup["summary"]["requeuedTasks"], json!([]));

        creative_task_repo::claim_next_queued_task_with_lease(
            &db_path,
            creative_task_repo::ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    project_id: Some("project-a".to_string()),
                    task_type: Some("image.generate.batch".to_string()),
                    limit: Some(1),
                    offset: Some(0),
                    ..Default::default()
                },
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-a".to_string(),
                claimed_at: "00000000000000000001".to_string(),
                lease_expires_at: "00000000000000000002".to_string(),
            },
        )
        .expect("lease claim should succeed")
        .expect("task should be claimed");

        let (_, recovered) = post_worker_control(
            &server,
            "/worker/recover-expired-leases",
            "runtime-token",
            json!({ "limit": 10 }),
        );
        assert_eq!(recovered["ok"], true);
        assert_eq!(recovered["summary"]["requeuedTasks"], json!([task.id]));

        drop(server);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn worker_control_server_startup_recovers_expired_leases_before_claim() {
        let root = temp_root("control-startup-recover");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let db_path = app_dir.join("monster_workbench.db");
        init_schema(&db_path).expect("schema should init");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "image.generate.batch".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(2),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )
        .expect("task should create");
        creative_task_repo::claim_next_queued_task_with_lease(
            &db_path,
            creative_task_repo::ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    project_id: Some("project-a".to_string()),
                    task_type: Some("image.generate.batch".to_string()),
                    limit: Some(1),
                    offset: Some(0),
                    ..Default::default()
                },
                worker_id: "expired-worker".to_string(),
                runtime_instance_id: "expired-runtime".to_string(),
                claim_token: "expired-claim".to_string(),
                claimed_at: "00000000000000000001".to_string(),
                lease_expires_at: "00000000000000000002".to_string(),
            },
        )
        .expect("lease claim should succeed")
        .expect("task should be claimed");

        let server = start_worker_control_server(
            PathProvider::<Wry>::new_for_test(app_dir.clone(), db_path.clone()),
            "runtime-token".to_string(),
        )
        .expect("control server should start");
        let (_, claimed) = post_worker_control(
            &server,
            "/worker/claim",
            "runtime-token",
            json!({
                "taskType": "image.generate.batch",
                "projectId": "project-a",
                "workerId": "new-worker",
                "runtimeInstanceId": "new-runtime",
                "leaseDurationMs": 60000
            }),
        );
        assert_eq!(claimed["ok"], true);
        assert_eq!(claimed["claimed"]["task"]["id"], task.id);
        assert!(claimed["claimed"]["claimToken"].is_string());

        drop(server);
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn cancel_pending_task_marks_cancelled() {
        let root = temp_root("cancel");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());
        let db_path = app_dir.join("monster_workbench.db");

        init_schema(&db_path).expect("schema should init");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "generate_image_prompt".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )
        .expect("task should create");

        let result = service
            .request_cancel(task.id)
            .expect("cancel should succeed");
        assert_eq!(result.task.status, "cancelled");
        assert!(!result.was_running);

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn complete_running_task_marks_succeeded() {
        let root = temp_root("complete");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());
        let db_path = app_dir.join("monster_workbench.db");

        init_schema(&db_path).expect("schema should init");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "generate_image_prompt".to_string(),
                status: Some("running".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )
        .expect("task should create");

        let result = service
            .complete_task(WorkerQueueCompleteTaskInput {
                task_id: task.id,
                status: "succeeded".to_string(),
                result_json: Some(r#"{"ok":true}"#.to_string()),
                error_message: None,
                asset_id: None,
            })
            .expect("complete should succeed");
        assert_eq!(result.task.status, "succeeded");
        assert_eq!(result.reported_status, "succeeded");
        assert_eq!(result.final_status, "succeeded");
        assert!(!result.was_cancelling);

        let events =
            creative_task_repo::list_task_events(&db_path, task.id).expect("events should list");
        assert!(events
            .iter()
            .any(|event| event.event_type == "worker_succeeded"));

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn complete_task_settles_drained_parent_batch() {
        let root = temp_root("complete-batch");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());
        let db_path = app_dir.join("monster_workbench.db");

        init_schema(&db_path).expect("schema should init");
        let job = creative_batch_repo::create_batch_job(
            &db_path,
            CreateCreativeBatchJobInput {
                project_id: Some("project-a".to_string()),
                name: "Prompt batch".to_string(),
                batch_type: "image.prompt.batch".to_string(),
                status: Some("running".to_string()),
                total_count: Some(1),
                concurrency: Some(1),
                max_retries: Some(1),
                prompt_template: Some("Render {{sequenceNo}}".to_string()),
                provider_id: None,
                model: None,
                image_size: None,
                budget_json: None,
            },
        )
        .expect("batch job should create");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: Some(job.id),
                task_type: "image.prompt.batch".to_string(),
                status: Some("running".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: Some(1),
            },
        )
        .expect("task should create");

        let result = service
            .complete_task(WorkerQueueCompleteTaskInput {
                task_id: task.id,
                status: "succeeded".to_string(),
                result_json: Some(r#"{"ok":true}"#.to_string()),
                error_message: None,
                asset_id: None,
            })
            .expect("complete should succeed");
        assert_eq!(result.task.status, "succeeded");

        let updated_batch = creative_batch_repo::get_batch_job_snapshot(&db_path, job.id)
            .expect("batch snapshot should query")
            .expect("batch should exist");
        assert_eq!(updated_batch.job.status, "completed");

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn complete_cancelling_task_does_not_resurrect_success() {
        let root = temp_root("complete-cancelling");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());
        let db_path = app_dir.join("monster_workbench.db");

        init_schema(&db_path).expect("schema should init");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "generate_image_prompt".to_string(),
                status: Some("cancelling".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(1),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )
        .expect("task should create");

        let result = service
            .complete_task(WorkerQueueCompleteTaskInput {
                task_id: task.id,
                status: "succeeded".to_string(),
                result_json: Some(r#"{"shouldNotPersist":true}"#.to_string()),
                error_message: None,
                asset_id: None,
            })
            .expect("complete should settle cancellation");
        assert_eq!(result.reported_status, "succeeded");
        assert_eq!(result.final_status, "cancelled");
        assert!(result.was_cancelling);
        assert_eq!(result.task.status, "cancelled");
        assert!(result.task.result_json.is_none());

        let events =
            creative_task_repo::list_task_events(&db_path, task.id).expect("events should list");
        assert!(events
            .iter()
            .any(|event| event.event_type == "worker_cancelled"));

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn recovery_moves_running_task_to_retrying() {
        let root = temp_root("recover");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());
        let db_path = app_dir.join("monster_workbench.db");

        init_schema(&db_path).expect("schema should init");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "generate_image_prompt".to_string(),
                status: Some("running".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(2),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )
        .expect("task should create");

        let summary = service
            .recover_interrupted_tasks()
            .expect("recovery should succeed");
        assert_eq!(summary.interrupted_running_tasks, vec![task.id]);
        assert_eq!(summary.moved_to_retrying, vec![task.id]);

        let updated = creative_task_repo::get_task(&db_path, task.id)
            .expect("task should query")
            .expect("task should exist");
        assert_eq!(updated.status, "retrying");
        assert_eq!(updated.retry_count, 1);

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn recover_interrupted_tasks_settles_drained_parent_batch() {
        let root = temp_root("recover-batch");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());
        let db_path = app_dir.join("monster_workbench.db");

        init_schema(&db_path).expect("schema should init");
        let job = creative_batch_repo::create_batch_job(
            &db_path,
            CreateCreativeBatchJobInput {
                project_id: Some("project-a".to_string()),
                name: "Prompt batch".to_string(),
                batch_type: "image.prompt.batch".to_string(),
                status: Some("running".to_string()),
                total_count: Some(1),
                concurrency: Some(1),
                max_retries: Some(0),
                prompt_template: Some("Render {{sequenceNo}}".to_string()),
                provider_id: None,
                model: None,
                image_size: None,
                budget_json: None,
            },
        )
        .expect("batch job should create");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: Some(job.id),
                task_type: "image.prompt.batch".to_string(),
                status: Some("running".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(0),
                parent_task_id: None,
                asset_id: None,
                sequence_no: Some(1),
            },
        )
        .expect("task should create");

        let summary = service
            .recover_interrupted_tasks()
            .expect("recovery should succeed");
        assert_eq!(summary.moved_to_failed, vec![task.id]);

        let updated_batch = creative_batch_repo::get_batch_job_snapshot(&db_path, job.id)
            .expect("batch snapshot should query")
            .expect("batch should exist");
        assert_eq!(updated_batch.job.status, "completed");

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn recover_expired_task_leases_requeues_via_service() {
        let root = temp_root("recover-expired-lease");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());
        let db_path = app_dir.join("monster_workbench.db");

        init_schema(&db_path).expect("schema should init");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: None,
                task_type: "image.generate.batch".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(2),
                parent_task_id: None,
                asset_id: None,
                sequence_no: None,
            },
        )
        .expect("task should create");

        creative_task_repo::claim_next_queued_task_with_lease(
            &db_path,
            creative_task_repo::ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    project_id: Some("project-a".to_string()),
                    task_type: Some("image.generate.batch".to_string()),
                    limit: Some(1),
                    offset: Some(0),
                    ..Default::default()
                },
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-a".to_string(),
                claimed_at: "00000000000000000001".to_string(),
                lease_expires_at: "00000000000000000002".to_string(),
            },
        )
        .expect("lease claim should succeed")
        .expect("task should be claimed");

        let summary = service
            .recover_expired_task_leases(Some(10))
            .expect("expired lease recovery should succeed");
        assert_eq!(summary.requeued_tasks, vec![task.id]);

        let updated = creative_task_repo::get_task(&db_path, task.id)
            .expect("task should query")
            .expect("task should exist");
        assert_eq!(updated.status, "queued");
        assert_eq!(updated.retry_count, 1);

        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn recover_expired_task_leases_settles_drained_parent_batch() {
        let root = temp_root("recover-expired-lease-batch");
        let app_dir = root.join("app-data");
        std::fs::create_dir_all(&app_dir).expect("app dir should create");
        let service = service_for(app_dir.clone());
        let db_path = app_dir.join("monster_workbench.db");

        init_schema(&db_path).expect("schema should init");
        let job = creative_batch_repo::create_batch_job(
            &db_path,
            CreateCreativeBatchJobInput {
                project_id: Some("project-a".to_string()),
                name: "Generate batch".to_string(),
                batch_type: "image.generate.batch".to_string(),
                status: Some("running".to_string()),
                total_count: Some(1),
                concurrency: Some(1),
                max_retries: Some(0),
                prompt_template: Some("Render {{sequenceNo}}".to_string()),
                provider_id: None,
                model: None,
                image_size: Some("1024x1024".to_string()),
                budget_json: None,
            },
        )
        .expect("batch job should create");
        let task = creative_task_repo::create_task(
            &db_path,
            CreateCreativeTaskInput {
                project_id: Some("project-a".to_string()),
                goal_id: None,
                batch_job_id: Some(job.id),
                task_type: "image.generate.batch".to_string(),
                status: Some("queued".to_string()),
                priority: Some(10),
                payload_json: None,
                max_retries: Some(0),
                parent_task_id: None,
                asset_id: None,
                sequence_no: Some(1),
            },
        )
        .expect("task should create");

        creative_task_repo::claim_next_queued_task_with_lease(
            &db_path,
            creative_task_repo::ClaimTaskLeaseInput {
                filter: ListCreativeTasksFilter {
                    project_id: Some("project-a".to_string()),
                    task_type: Some("image.generate.batch".to_string()),
                    batch_job_id: Some(job.id),
                    limit: Some(1),
                    offset: Some(0),
                    ..Default::default()
                },
                worker_id: "worker-a".to_string(),
                runtime_instance_id: "runtime-a".to_string(),
                claim_token: "claim-a".to_string(),
                claimed_at: "00000000000000000001".to_string(),
                lease_expires_at: "00000000000000000002".to_string(),
            },
        )
        .expect("lease claim should succeed")
        .expect("task should be claimed");

        let summary = service
            .recover_expired_task_leases(Some(10))
            .expect("expired lease recovery should succeed");
        assert_eq!(summary.failed_tasks, vec![task.id]);

        let updated_task = creative_task_repo::get_task(&db_path, task.id)
            .expect("task should query")
            .expect("task should exist");
        assert_eq!(updated_task.status, "failed");

        let updated_batch = creative_batch_repo::get_batch_job_snapshot(&db_path, job.id)
            .expect("batch snapshot should query")
            .expect("batch should exist");
        assert_eq!(updated_batch.job.status, "completed");
        assert_eq!(updated_batch.stats.queued_tasks, 0);
        assert_eq!(updated_batch.stats.running_tasks, 0);

        let _ = std::fs::remove_dir_all(&root);
    }
}
