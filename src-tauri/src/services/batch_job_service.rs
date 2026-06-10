use crate::infra::creative_db::{
    CreateCreativeAssetInput, CreateCreativeBatchJobInput, CreateCreativeTaskInput,
    CreateModelRunInput, CreateTaskEventInput, CreativeBatchJob, CreativeBatchJobSnapshot,
    CreativeDbInfra, CreativeTask, ListCreativeBatchJobsFilter, ListCreativeTasksFilter,
    UpdateCreativeBatchJobInput, UpdateCreativeTaskStatusInput,
};
use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};
use crate::services::ai_service::{AiProviderConfig, AiProviderService};
use crate::services::task_service::CreativeTaskEventPayload;
use serde_json::{json, Value};
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use std::time::Instant;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBatchImageJobInput {
    pub project_id: Option<String>,
    pub name: String,
    pub batch_type: Option<String>,
    pub total_count: Option<i64>,
    pub concurrency: Option<i64>,
    pub max_retries: Option<i64>,
    pub prompt_template: Option<String>,
    pub provider_id: Option<String>,
    pub model: Option<String>,
    pub image_size: Option<String>,
    pub budget_json: Option<String>,
    pub provider_config: Option<BatchPromptProviderConfigInput>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchPromptProviderConfigInput {
    pub provider: String,
    pub display_name: String,
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub timeout_ms: Option<u64>,
    pub queue_mode: Option<String>,
    pub max_concurrency: Option<usize>,
    pub queue_key: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreativeBatchJobEventPayload {
    pub batch_job_id: i64,
    pub project_id: Option<String>,
    pub batch_type: String,
    pub status: String,
    pub total_tasks: i64,
    pub queued_tasks: i64,
    pub running_tasks: i64,
    pub succeeded_tasks: i64,
    pub failed_tasks: i64,
    pub cancelled_tasks: i64,
    pub created_at: String,
    pub message: Option<String>,
}

pub struct BatchJobService {
    app_handle: AppHandle,
    path_provider: PathProvider,
    active_supervisors: Arc<Mutex<HashSet<i64>>>,
}

impl BatchJobService {
    pub fn new(app_handle: AppHandle, path_provider: PathProvider) -> Self {
        Self {
            app_handle,
            path_provider,
            active_supervisors: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    pub fn create_batch_image_job(
        &self,
        input: CreateBatchImageJobInput,
    ) -> AppResult<CreativeBatchJobSnapshot> {
        validate_create_batch_job_input(&input)?;
        let db_path = self.db_path()?;
        let batch_type = input
            .batch_type
            .clone()
            .unwrap_or_else(|| "demo.image.mock".to_string());
        let total_count = input.total_count.unwrap_or(100).clamp(1, 1000);
        let concurrency = input.concurrency.unwrap_or(5).clamp(1, 10);
        let max_retries = input.max_retries.unwrap_or(0).clamp(0, 5);

        let job = CreativeDbInfra::create_batch_job(
            &db_path,
            CreateCreativeBatchJobInput {
                project_id: input.project_id.clone(),
                name: input.name,
                batch_type: batch_type.clone(),
                status: Some("draft".to_string()),
                total_count: Some(total_count),
                concurrency: Some(concurrency),
                max_retries: Some(max_retries),
                prompt_template: input.prompt_template.clone(),
                provider_id: input.provider_id.clone(),
                model: input.model.clone(),
                image_size: input.image_size.clone(),
                budget_json: input.budget_json.clone(),
            },
        )?;

        for sequence_no in 1..=total_count {
            let payload_json = json!({
                "batchJobId": job.id,
                "sequenceNo": sequence_no,
                "batchType": batch_type,
                "promptTemplate": input.prompt_template,
                "providerConfig": input.provider_config,
            })
            .to_string();
            let task = CreativeDbInfra::create_task(
                &db_path,
                CreateCreativeTaskInput {
                    project_id: job.project_id.clone(),
                    goal_id: None,
                    batch_job_id: Some(job.id),
                    task_type: batch_type.clone(),
                    status: Some("queued".to_string()),
                    priority: Some(0),
                    payload_json: Some(payload_json),
                    max_retries: Some(max_retries),
                    parent_task_id: None,
                    asset_id: None,
                    sequence_no: Some(sequence_no),
                },
            )?;
            let _ = CreativeDbInfra::append_task_event(
                &db_path,
                CreateTaskEventInput {
                    task_id: task.id,
                    event_type: "queued".to_string(),
                    message: Some(format!("batch task queued #{}", sequence_no)),
                    payload_json: Some(
                        serde_json::json!({
                            "batchJobId": job.id,
                            "sequenceNo": sequence_no,
                        })
                        .to_string(),
                    ),
                },
            );
        }

        let snapshot =
            CreativeDbInfra::get_batch_job_snapshot(&db_path, job.id)?.ok_or_else(|| {
                AppError::Database("batch job snapshot missing after creation".to_string())
            })?;
        self.emit_batch_snapshot(
            "batch-job-created",
            &snapshot,
            Some("batch job created".to_string()),
        )?;
        Ok(snapshot)
    }

    pub fn list_batch_jobs(
        &self,
        filter: ListCreativeBatchJobsFilter,
    ) -> AppResult<Vec<CreativeBatchJob>> {
        CreativeDbInfra::list_batch_jobs(&self.db_path()?, filter)
    }

    pub fn get_batch_job(&self, batch_job_id: i64) -> AppResult<CreativeBatchJobSnapshot> {
        if batch_job_id <= 0 {
            return Err(AppError::Config(
                "batch_job_id must be positive".to_string(),
            ));
        }
        CreativeDbInfra::get_batch_job_snapshot(&self.db_path()?, batch_job_id)?
            .ok_or_else(|| AppError::Database("batch job not found".to_string()))
    }

    pub fn list_batch_job_tasks(
        &self,
        batch_job_id: i64,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> AppResult<Vec<CreativeTask>> {
        if batch_job_id <= 0 {
            return Err(AppError::Config(
                "batch_job_id must be positive".to_string(),
            ));
        }
        CreativeDbInfra::list_tasks(
            &self.db_path()?,
            ListCreativeTasksFilter {
                batch_job_id: Some(batch_job_id),
                limit,
                offset,
                ..Default::default()
            },
        )
    }

    pub fn start_batch_job(&self, batch_job_id: i64) -> AppResult<CreativeBatchJobSnapshot> {
        let snapshot = self.transition_batch_job(batch_job_id, "running", Some("batch started"))?;
        self.spawn_supervisor_if_needed(batch_job_id)?;
        Ok(snapshot)
    }

    pub fn pause_batch_job(&self, batch_job_id: i64) -> AppResult<CreativeBatchJobSnapshot> {
        self.transition_batch_job(batch_job_id, "paused", Some("batch paused"))
    }

    pub fn resume_batch_job(&self, batch_job_id: i64) -> AppResult<CreativeBatchJobSnapshot> {
        let snapshot = self.transition_batch_job(batch_job_id, "running", Some("batch resumed"))?;
        self.spawn_supervisor_if_needed(batch_job_id)?;
        Ok(snapshot)
    }

    pub fn cancel_batch_job(&self, batch_job_id: i64) -> AppResult<CreativeBatchJobSnapshot> {
        if batch_job_id <= 0 {
            return Err(AppError::Config(
                "batch_job_id must be positive".to_string(),
            ));
        }

        let db_path = self.db_path()?;
        CreativeDbInfra::update_batch_job(
            &db_path,
            UpdateCreativeBatchJobInput {
                id: batch_job_id,
                status: Some("cancelled".to_string()),
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

        let cancelled_task_ids =
            CreativeDbInfra::cancel_queued_batch_tasks(&db_path, batch_job_id)?;
        for task_id in cancelled_task_ids {
            if let Some(task) = CreativeDbInfra::get_task(&db_path, task_id)? {
                let _ = CreativeDbInfra::append_task_event(
                    &db_path,
                    CreateTaskEventInput {
                        task_id,
                        event_type: "batch_cancelled".to_string(),
                        message: Some("queued task cancelled by batch".to_string()),
                        payload_json: Some(
                            serde_json::json!({
                                "batchJobId": batch_job_id,
                                "status": "cancelled",
                            })
                            .to_string(),
                        ),
                    },
                );
                let _ = self.emit_task_status_changed(&task, "cancelled by batch");
            }
        }

        let cancelling_task_ids =
            CreativeDbInfra::mark_running_batch_tasks_cancelling(&db_path, batch_job_id)?;
        for task_id in cancelling_task_ids {
            if let Some(task) = CreativeDbInfra::get_task(&db_path, task_id)? {
                let _ = CreativeDbInfra::append_task_event(
                    &db_path,
                    CreateTaskEventInput {
                        task_id,
                        event_type: "cancel_requested".to_string(),
                        message: Some("running task marked cancelling by batch".to_string()),
                        payload_json: Some(
                            serde_json::json!({
                                "batchJobId": batch_job_id,
                                "status": "cancelling",
                            })
                            .to_string(),
                        ),
                    },
                );
                let _ = self.emit_task_status_changed(&task, "batch cancelling");
            }
        }

        let snapshot = self.get_batch_job(batch_job_id)?;
        self.emit_batch_snapshot(
            "batch-job-status-changed",
            &snapshot,
            Some("batch cancelled".to_string()),
        )?;
        self.emit_batch_snapshot(
            "batch-job-progress",
            &snapshot,
            Some("batch progress updated".to_string()),
        )?;
        Ok(snapshot)
    }

    fn transition_batch_job(
        &self,
        batch_job_id: i64,
        status: &str,
        message: Option<&str>,
    ) -> AppResult<CreativeBatchJobSnapshot> {
        if batch_job_id <= 0 {
            return Err(AppError::Config(
                "batch_job_id must be positive".to_string(),
            ));
        }
        let db_path = self.db_path()?;
        CreativeDbInfra::update_batch_job(
            &db_path,
            UpdateCreativeBatchJobInput {
                id: batch_job_id,
                status: Some(status.to_string()),
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
        let snapshot = CreativeDbInfra::get_batch_job_snapshot(&db_path, batch_job_id)?
            .ok_or_else(|| AppError::Database("batch job not found".to_string()))?;
        self.emit_batch_snapshot(
            "batch-job-status-changed",
            &snapshot,
            message.map(|value| value.to_string()),
        )?;
        self.emit_batch_snapshot(
            "batch-job-progress",
            &snapshot,
            Some("batch progress updated".to_string()),
        )?;
        Ok(snapshot)
    }

    fn spawn_supervisor_if_needed(&self, batch_job_id: i64) -> AppResult<()> {
        let mut active = self
            .active_supervisors
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if !active.insert(batch_job_id) {
            return Ok(());
        }

        let db_path = self.db_path()?;
        let app_handle = self.app_handle.clone();
        let active_supervisors = self.active_supervisors.clone();
        thread::spawn(move || {
            run_batch_supervisor(app_handle, db_path, active_supervisors, batch_job_id);
        });
        Ok(())
    }

    fn emit_batch_snapshot(
        &self,
        event_name: &str,
        snapshot: &CreativeBatchJobSnapshot,
        message: Option<String>,
    ) -> AppResult<()> {
        let payload = CreativeBatchJobEventPayload {
            batch_job_id: snapshot.job.id,
            project_id: snapshot.job.project_id.clone(),
            batch_type: snapshot.job.batch_type.clone(),
            status: snapshot.job.status.clone(),
            total_tasks: snapshot.stats.total_tasks,
            queued_tasks: snapshot.stats.queued_tasks,
            running_tasks: snapshot.stats.running_tasks,
            succeeded_tasks: snapshot.stats.succeeded_tasks,
            failed_tasks: snapshot.stats.failed_tasks,
            cancelled_tasks: snapshot.stats.cancelled_tasks,
            created_at: snapshot.job.updated_at.clone(),
            message,
        };
        self.app_handle
            .emit(event_name, payload)
            .map_err(|error| AppError::Process(format!("failed to emit {event_name}: {error}")))
    }

    fn emit_task_status_changed(&self, task: &CreativeTask, message: &str) -> AppResult<()> {
        self.app_handle
            .emit(
                "creative-task-status-changed",
                CreativeTaskEventPayload {
                    task_id: task.id,
                    project_id: task.project_id.clone(),
                    status: task.status.clone(),
                    message: Some(message.to_string()),
                    created_at: task.updated_at.clone(),
                },
            )
            .map_err(|error| {
                AppError::Process(format!(
                    "failed to emit creative-task-status-changed: {error}"
                ))
            })
    }

    fn db_path(&self) -> AppResult<std::path::PathBuf> {
        self.path_provider.get_db_file_path()
    }
}

fn run_batch_supervisor(
    app_handle: AppHandle,
    db_path: std::path::PathBuf,
    active_supervisors: Arc<Mutex<HashSet<i64>>>,
    batch_job_id: i64,
) {
    let result = run_batch_supervisor_inner(&app_handle, &db_path, batch_job_id);
    if let Err(error) = result {
        let _ = app_handle.emit(
            "batch-job-status-changed",
            CreativeBatchJobEventPayload {
                batch_job_id,
                project_id: None,
                batch_type: "demo.image.mock".to_string(),
                status: "failed".to_string(),
                total_tasks: 0,
                queued_tasks: 0,
                running_tasks: 0,
                succeeded_tasks: 0,
                failed_tasks: 0,
                cancelled_tasks: 0,
                created_at: String::new(),
                message: Some(error.to_string()),
            },
        );
    }

    let mut active = active_supervisors
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    active.remove(&batch_job_id);
}

fn run_batch_supervisor_inner(
    app_handle: &AppHandle,
    db_path: &std::path::Path,
    batch_job_id: i64,
) -> AppResult<()> {
    loop {
        let snapshot =
            CreativeDbInfra::get_batch_job_snapshot(db_path, batch_job_id)?.ok_or_else(|| {
                AppError::Database("batch job not found while supervising".to_string())
            })?;

        emit_batch_progress(app_handle, &snapshot, "batch progress updated")?;

        match snapshot.job.status.as_str() {
            "paused" => break,
            "cancelled" => {
                if snapshot.stats.running_tasks == 0 && snapshot.stats.cancelling_tasks == 0 {
                    break;
                }
            }
            "running" => {
                let available_slots =
                    (snapshot.job.concurrency - snapshot.stats.running_tasks).max(0);
                for _ in 0..available_slots {
                    let Some(task) = CreativeDbInfra::claim_next_queued_task(
                        db_path,
                        ListCreativeTasksFilter {
                            batch_job_id: Some(batch_job_id),
                            limit: Some(1),
                            offset: Some(0),
                            ..Default::default()
                        },
                    )?
                    else {
                        break;
                    };

                    emit_task_status(
                        app_handle,
                        &task,
                        "creative-task-status-changed",
                        "status changed to running",
                    )?;
                    let _ = CreativeDbInfra::append_task_event(
                        db_path,
                        CreateTaskEventInput {
                            task_id: task.id,
                            event_type: if snapshot.job.batch_type == "demo.image.prompt" {
                                "prompt_started".to_string()
                            } else {
                                "mock_started".to_string()
                            },
                            message: Some(if snapshot.job.batch_type == "demo.image.prompt" {
                                "prompt worker started".to_string()
                            } else {
                                "mock worker started".to_string()
                            }),
                            payload_json: Some(
                                json!({
                                    "batchJobId": batch_job_id,
                                    "sequenceNo": task.sequence_no,
                                    "batchType": snapshot.job.batch_type,
                                })
                                .to_string(),
                            ),
                        },
                    );
                    emit_task_status(
                        app_handle,
                        &task,
                        "creative-task-event",
                        if snapshot.job.batch_type == "demo.image.prompt" {
                            "prompt worker started"
                        } else {
                            "mock worker started"
                        },
                    )?;
                    let task_db_path = db_path.to_path_buf();
                    let task_app_handle = app_handle.clone();
                    let batch_type = snapshot.job.batch_type.clone();
                    thread::spawn(move || {
                        let _ = if batch_type == "demo.image.prompt" {
                            run_prompt_task_worker(
                                &task_app_handle,
                                &task_db_path,
                                batch_job_id,
                                task,
                            )
                        } else {
                            run_mock_task_worker(
                                &task_app_handle,
                                &task_db_path,
                                batch_job_id,
                                task,
                            )
                        };
                    });
                }

                let refreshed = CreativeDbInfra::get_batch_job_snapshot(db_path, batch_job_id)?
                    .ok_or_else(|| {
                        AppError::Database("batch job not found during refresh".to_string())
                    })?;
                if refreshed.stats.queued_tasks == 0
                    && refreshed.stats.running_tasks == 0
                    && refreshed.stats.cancelling_tasks == 0
                {
                    CreativeDbInfra::update_batch_job(
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
                    let completed = CreativeDbInfra::get_batch_job_snapshot(db_path, batch_job_id)?
                        .ok_or_else(|| {
                            AppError::Database("batch job missing after completion".to_string())
                        })?;
                    emit_batch_progress(app_handle, &completed, "batch completed")?;
                    emit_batch_status(app_handle, &completed, "batch completed")?;
                    break;
                }
            }
            "completed" | "failed" | "blocked" => break,
            _ => {}
        }

        thread::sleep(Duration::from_millis(200));
    }

    Ok(())
}

fn run_mock_task_worker(
    app_handle: &AppHandle,
    db_path: &std::path::Path,
    batch_job_id: i64,
    task: CreativeTask,
) -> AppResult<()> {
    let duration_ms = mock_duration_ms(task.sequence_no.unwrap_or(task.id));
    let mut elapsed_ms = 0_u64;

    while elapsed_ms < duration_ms {
        thread::sleep(Duration::from_millis(200));
        elapsed_ms = (elapsed_ms + 200).min(duration_ms);

        let batch = CreativeDbInfra::get_batch_job(db_path, batch_job_id)?.ok_or_else(|| {
            AppError::Database("batch job not found while running task".to_string())
        })?;
        let current_task = CreativeDbInfra::get_task(db_path, task.id)?.ok_or_else(|| {
            AppError::Database("task not found while running mock worker".to_string())
        })?;
        if batch.status == "cancelled"
            || matches!(current_task.status.as_str(), "cancelling" | "cancelled")
        {
            let cancelled_task = CreativeDbInfra::update_task_status(
                db_path,
                UpdateCreativeTaskStatusInput {
                    id: task.id,
                    status: "cancelled".to_string(),
                    result_json: None,
                    error_message: Some("mock task cancelled".to_string()),
                    asset_id: current_task.asset_id,
                    retry_count_increment: None,
                },
            )?;
            let _ = CreativeDbInfra::append_task_event(
                db_path,
                CreateTaskEventInput {
                    task_id: task.id,
                    event_type: "mock_cancelled".to_string(),
                    message: Some("mock worker observed cancellation".to_string()),
                    payload_json: Some(
                        serde_json::json!({
                            "batchJobId": batch_job_id,
                            "durationMs": elapsed_ms,
                        })
                        .to_string(),
                    ),
                },
            );
            emit_task_status(
                app_handle,
                &cancelled_task,
                "creative-task-status-changed",
                "status changed to cancelled",
            )?;
            emit_task_status(
                app_handle,
                &cancelled_task,
                "creative-task-event",
                "mock worker observed cancellation",
            )?;
            return Ok(());
        }
    }

    let should_fail = mock_should_fail(task.sequence_no.unwrap_or(task.id));
    let updated_task = CreativeDbInfra::update_task_status(
        db_path,
        UpdateCreativeTaskStatusInput {
            id: task.id,
            status: if should_fail {
                "failed".to_string()
            } else {
                "succeeded".to_string()
            },
            result_json: if should_fail {
                None
            } else {
                Some(
                    serde_json::json!({
                        "mock": true,
                        "batchJobId": batch_job_id,
                        "sequenceNo": task.sequence_no,
                        "durationMs": duration_ms,
                    })
                    .to_string(),
                )
            },
            error_message: if should_fail {
                Some("mock worker deterministic failure".to_string())
            } else {
                None
            },
            asset_id: task.asset_id,
            retry_count_increment: None,
        },
    )?;
    let event_message = if should_fail {
        "mock worker finished with failure"
    } else {
        "mock worker finished successfully"
    };
    let event_type = if should_fail {
        "mock_failed"
    } else {
        "mock_succeeded"
    };
    let _ = CreativeDbInfra::append_task_event(
        db_path,
        CreateTaskEventInput {
            task_id: task.id,
            event_type: event_type.to_string(),
            message: Some(event_message.to_string()),
            payload_json: Some(
                serde_json::json!({
                    "batchJobId": batch_job_id,
                    "sequenceNo": task.sequence_no,
                    "durationMs": duration_ms,
                })
                .to_string(),
            ),
        },
    );
    emit_task_status(
        app_handle,
        &updated_task,
        "creative-task-status-changed",
        &format!("status changed to {}", updated_task.status),
    )?;
    emit_task_status(
        app_handle,
        &updated_task,
        "creative-task-event",
        event_message,
    )?;
    Ok(())
}

fn run_prompt_task_worker(
    app_handle: &AppHandle,
    db_path: &std::path::Path,
    batch_job_id: i64,
    task: CreativeTask,
) -> AppResult<()> {
    let batch = CreativeDbInfra::get_batch_job(db_path, batch_job_id)?.ok_or_else(|| {
        AppError::Database("batch job not found while running prompt task".to_string())
    })?;
    let current_task = CreativeDbInfra::get_task(db_path, task.id)?.ok_or_else(|| {
        AppError::Database("task not found while running prompt worker".to_string())
    })?;
    if batch.status == "cancelled"
        || matches!(current_task.status.as_str(), "cancelling" | "cancelled")
    {
        let cancelled_task = CreativeDbInfra::update_task_status(
            db_path,
            UpdateCreativeTaskStatusInput {
                id: task.id,
                status: "cancelled".to_string(),
                result_json: None,
                error_message: Some("prompt task cancelled".to_string()),
                asset_id: current_task.asset_id,
                retry_count_increment: None,
            },
        )?;
        let _ = CreativeDbInfra::append_task_event(
            db_path,
            CreateTaskEventInput {
                task_id: task.id,
                event_type: "prompt_cancelled".to_string(),
                message: Some("prompt worker observed cancellation".to_string()),
                payload_json: Some(json!({ "batchJobId": batch_job_id }).to_string()),
            },
        );
        emit_task_status(
            app_handle,
            &cancelled_task,
            "creative-task-status-changed",
            "status changed to cancelled",
        )?;
        emit_task_status(
            app_handle,
            &cancelled_task,
            "creative-task-event",
            "prompt worker observed cancellation",
        )?;
        return Ok(());
    }

    let prompt_request = build_prompt_request(&task)?;
    let provider_config = build_provider_config(&task, &prompt_request)?;
    let model_started = Instant::now();
    let ai_service = AiProviderService::new(app_handle.clone());
    let provider_result = ai_service.test_provider(
        provider_config.clone(),
        "chat".to_string(),
        Some(format!("batch-prompt-task-{}", task.id)),
        None,
    );
    let duration_ms = model_started.elapsed().as_millis() as i64;

    match provider_result {
        Ok(result) => {
            let prompt_text = result
                .text
                .clone()
                .filter(|value| !value.trim().is_empty())
                .ok_or_else(|| {
                    AppError::Process("provider returned empty prompt text".to_string())
                })?;

            let asset = CreativeDbInfra::create_asset(
                db_path,
                CreateCreativeAssetInput {
                    project_id: task.project_id.clone(),
                    asset_type: "demo_image_prompt".to_string(),
                    title: Some(format!(
                        "Batch prompt #{}",
                        task.sequence_no.unwrap_or(task.id)
                    )),
                    content: Some(prompt_text.clone()),
                    file_path: None,
                    thumbnail_path: None,
                    metadata_json: Some(
                        json!({
                            "batchJobId": batch_job_id,
                            "sourceTaskId": task.id,
                            "sequenceNo": task.sequence_no,
                            "promptTemplate": prompt_request,
                            "provenance": {
                                "sourceTaskId": task.id,
                                "batchJobId": batch_job_id
                            }
                        })
                        .to_string(),
                    ),
                    status: Some("ready".to_string()),
                },
            )?;

            let model_run = CreativeDbInfra::create_model_run(
                db_path,
                CreateModelRunInput {
                    project_id: task.project_id.clone(),
                    task_id: Some(task.id),
                    asset_id: Some(asset.id),
                    provider_id: Some(provider_config.display_name.clone()),
                    provider_type: Some(provider_config.provider.clone()),
                    model: Some(provider_config.model.clone()),
                    request_type: "chat".to_string(),
                    status: if result.ok {
                        "succeeded".to_string()
                    } else {
                        "failed".to_string()
                    },
                    duration_ms: Some(duration_ms),
                    prompt_hash: Some(simple_prompt_hash(&prompt_request)),
                    prompt_version_id: Some(format!("batch:{}:{}", batch_job_id, task.id)),
                    input_token_count: None,
                    output_token_count: None,
                    cost_estimate: None,
                    error_code: None,
                    error_message: None,
                    metadata_json: Some(
                        json!({
                            "requestId": result.request_id,
                            "baseUrl": result.base_url,
                            "queueWaitMs": result.queue_wait_ms,
                            "message": result.message,
                        })
                        .to_string(),
                    ),
                    finished_at: None,
                },
            )?;

            let updated_task = CreativeDbInfra::update_task_status(
                db_path,
                UpdateCreativeTaskStatusInput {
                    id: task.id,
                    status: "succeeded".to_string(),
                    result_json: Some(
                        json!({
                            "assetId": asset.id,
                            "modelRunId": model_run.id,
                            "promptExcerpt": summarize_prompt_text(&prompt_text),
                            "durationMs": duration_ms,
                        })
                        .to_string(),
                    ),
                    error_message: None,
                    asset_id: Some(asset.id),
                    retry_count_increment: None,
                },
            )?;
            let _ = CreativeDbInfra::append_task_event(
                db_path,
                CreateTaskEventInput {
                    task_id: task.id,
                    event_type: "prompt_asset_saved".to_string(),
                    message: Some(format!("prompt asset created: {}", asset.id)),
                    payload_json: Some(
                        json!({
                            "assetId": asset.id,
                            "modelRunId": model_run.id,
                            "durationMs": duration_ms,
                        })
                        .to_string(),
                    ),
                },
            );
            emit_task_status(
                app_handle,
                &updated_task,
                "creative-task-status-changed",
                "status changed to succeeded",
            )?;
            emit_task_status(
                app_handle,
                &updated_task,
                "creative-task-event",
                "prompt worker finished successfully",
            )?;
        }
        Err(error) => {
            if current_task.retry_count < current_task.max_retries {
                let retry_task = CreativeDbInfra::update_task_status(
                    db_path,
                    UpdateCreativeTaskStatusInput {
                        id: task.id,
                        status: "queued".to_string(),
                        result_json: None,
                        error_message: Some(error.to_string()),
                        asset_id: current_task.asset_id,
                        retry_count_increment: Some(1),
                    },
                )?;
                let _ = CreativeDbInfra::create_model_run(
                    db_path,
                    CreateModelRunInput {
                        project_id: task.project_id.clone(),
                        task_id: Some(task.id),
                        asset_id: None,
                        provider_id: Some(provider_config.display_name.clone()),
                        provider_type: Some(provider_config.provider.clone()),
                        model: Some(provider_config.model.clone()),
                        request_type: "chat".to_string(),
                        status: "failed".to_string(),
                        duration_ms: Some(duration_ms),
                        prompt_hash: Some(simple_prompt_hash(&prompt_request)),
                        prompt_version_id: Some(format!("batch:{}:{}", batch_job_id, task.id)),
                        input_token_count: None,
                        output_token_count: None,
                        cost_estimate: None,
                        error_code: Some("provider_error".to_string()),
                        error_message: Some(error.to_string()),
                        metadata_json: Some(json!({ "retryScheduled": true }).to_string()),
                        finished_at: None,
                    },
                );
                let _ = CreativeDbInfra::append_task_event(
                    db_path,
                    CreateTaskEventInput {
                        task_id: task.id,
                        event_type: "prompt_retry_scheduled".to_string(),
                        message: Some("prompt worker scheduled retry".to_string()),
                        payload_json: Some(
                            json!({
                                "retryCount": retry_task.retry_count,
                                "maxRetries": retry_task.max_retries,
                                "error": error.to_string(),
                            })
                            .to_string(),
                        ),
                    },
                );
                emit_task_status(
                    app_handle,
                    &retry_task,
                    "creative-task-status-changed",
                    "status changed to queued",
                )?;
                emit_task_status(
                    app_handle,
                    &retry_task,
                    "creative-task-event",
                    "prompt worker scheduled retry",
                )?;
            } else {
                let failed_task = CreativeDbInfra::update_task_status(
                    db_path,
                    UpdateCreativeTaskStatusInput {
                        id: task.id,
                        status: "failed".to_string(),
                        result_json: None,
                        error_message: Some(error.to_string()),
                        asset_id: current_task.asset_id,
                        retry_count_increment: None,
                    },
                )?;
                let _ = CreativeDbInfra::create_model_run(
                    db_path,
                    CreateModelRunInput {
                        project_id: task.project_id.clone(),
                        task_id: Some(task.id),
                        asset_id: None,
                        provider_id: Some(provider_config.display_name.clone()),
                        provider_type: Some(provider_config.provider.clone()),
                        model: Some(provider_config.model.clone()),
                        request_type: "chat".to_string(),
                        status: "failed".to_string(),
                        duration_ms: Some(duration_ms),
                        prompt_hash: Some(simple_prompt_hash(&prompt_request)),
                        prompt_version_id: Some(format!("batch:{}:{}", batch_job_id, task.id)),
                        input_token_count: None,
                        output_token_count: None,
                        cost_estimate: None,
                        error_code: Some("provider_error".to_string()),
                        error_message: Some(error.to_string()),
                        metadata_json: Some(json!({ "retryScheduled": false }).to_string()),
                        finished_at: None,
                    },
                );
                let _ = CreativeDbInfra::append_task_event(
                    db_path,
                    CreateTaskEventInput {
                        task_id: task.id,
                        event_type: "prompt_failed".to_string(),
                        message: Some("prompt worker finished with failure".to_string()),
                        payload_json: Some(json!({ "error": error.to_string() }).to_string()),
                    },
                );
                emit_task_status(
                    app_handle,
                    &failed_task,
                    "creative-task-status-changed",
                    "status changed to failed",
                )?;
                emit_task_status(
                    app_handle,
                    &failed_task,
                    "creative-task-event",
                    "prompt worker finished with failure",
                )?;
            }
        }
    }

    Ok(())
}

fn emit_batch_progress(
    app_handle: &AppHandle,
    snapshot: &CreativeBatchJobSnapshot,
    message: &str,
) -> AppResult<()> {
    let payload = CreativeBatchJobEventPayload {
        batch_job_id: snapshot.job.id,
        project_id: snapshot.job.project_id.clone(),
        batch_type: snapshot.job.batch_type.clone(),
        status: snapshot.job.status.clone(),
        total_tasks: snapshot.stats.total_tasks,
        queued_tasks: snapshot.stats.queued_tasks,
        running_tasks: snapshot.stats.running_tasks,
        succeeded_tasks: snapshot.stats.succeeded_tasks,
        failed_tasks: snapshot.stats.failed_tasks,
        cancelled_tasks: snapshot.stats.cancelled_tasks,
        created_at: snapshot.job.updated_at.clone(),
        message: Some(message.to_string()),
    };
    app_handle
        .emit("batch-job-progress", payload)
        .map_err(|error| AppError::Process(format!("failed to emit batch-job-progress: {error}")))
}

fn emit_batch_status(
    app_handle: &AppHandle,
    snapshot: &CreativeBatchJobSnapshot,
    message: &str,
) -> AppResult<()> {
    let payload = CreativeBatchJobEventPayload {
        batch_job_id: snapshot.job.id,
        project_id: snapshot.job.project_id.clone(),
        batch_type: snapshot.job.batch_type.clone(),
        status: snapshot.job.status.clone(),
        total_tasks: snapshot.stats.total_tasks,
        queued_tasks: snapshot.stats.queued_tasks,
        running_tasks: snapshot.stats.running_tasks,
        succeeded_tasks: snapshot.stats.succeeded_tasks,
        failed_tasks: snapshot.stats.failed_tasks,
        cancelled_tasks: snapshot.stats.cancelled_tasks,
        created_at: snapshot.job.updated_at.clone(),
        message: Some(message.to_string()),
    };
    app_handle
        .emit("batch-job-status-changed", payload)
        .map_err(|error| {
            AppError::Process(format!("failed to emit batch-job-status-changed: {error}"))
        })
}

fn emit_task_status(
    app_handle: &AppHandle,
    task: &CreativeTask,
    event_name: &str,
    message: &str,
) -> AppResult<()> {
    app_handle
        .emit(
            event_name,
            CreativeTaskEventPayload {
                task_id: task.id,
                project_id: task.project_id.clone(),
                status: task.status.clone(),
                message: Some(message.to_string()),
                created_at: task.updated_at.clone(),
            },
        )
        .map_err(|error| AppError::Process(format!("failed to emit {event_name}: {error}")))
}

fn mock_duration_ms(sequence_no: i64) -> u64 {
    1000 + ((sequence_no.max(1) as u64 * 137) % 2001)
}

fn mock_should_fail(sequence_no: i64) -> bool {
    sequence_no.max(1) % 9 == 0
}

fn build_prompt_request(task: &CreativeTask) -> AppResult<String> {
    let payload = task
        .payload_json
        .as_deref()
        .map(|raw| serde_json::from_str::<Value>(raw))
        .transpose()
        .map_err(|error| AppError::Config(format!("invalid batch prompt payload: {error}")))?;
    let template = payload
        .as_ref()
        .and_then(|value| value.get("promptTemplate"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("Create a production-ready image prompt for a clean visual concept.");
    let sequence_no = task.sequence_no.unwrap_or(task.id);
    Ok(template
        .replace("{{sequenceNo}}", &sequence_no.to_string())
        .replace("{{index}}", &sequence_no.to_string()))
}

fn build_provider_config(task: &CreativeTask, prompt_request: &str) -> AppResult<AiProviderConfig> {
    let payload = task
        .payload_json
        .as_deref()
        .map(|raw| serde_json::from_str::<Value>(raw))
        .transpose()
        .map_err(|error| AppError::Config(format!("invalid batch prompt payload: {error}")))?;
    let config_value = payload
        .as_ref()
        .and_then(|value| value.get("providerConfig"))
        .cloned()
        .ok_or_else(|| {
            AppError::Config("providerConfig is required for prompt batch".to_string())
        })?;
    let provider_config: BatchPromptProviderConfigInput = serde_json::from_value(config_value)
        .map_err(|error| AppError::Config(format!("invalid providerConfig: {error}")))?;

    Ok(AiProviderConfig {
        provider: provider_config.provider,
        display_name: provider_config.display_name,
        base_url: provider_config.base_url,
        api_key: provider_config.api_key,
        remember_api_key: false,
        model: provider_config.model.clone(),
        test_prompt: prompt_request.to_string(),
        image_model: provider_config.model,
        image_prompt: String::new(),
        image_count: 1,
        image_size: "1024x1024".to_string(),
        timeout_ms: provider_config.timeout_ms.unwrap_or(60_000),
        queue_mode: provider_config
            .queue_mode
            .unwrap_or_else(|| "serial".to_string()),
        max_concurrency: provider_config.max_concurrency.unwrap_or(1),
        queue_key: provider_config.queue_key.unwrap_or_default(),
    })
}

fn summarize_prompt_text(value: &str) -> String {
    let trimmed = value.trim();
    const MAX_CHARS: usize = 120;
    if trimmed.chars().count() <= MAX_CHARS {
        return trimmed.to_string();
    }
    trimmed.chars().take(MAX_CHARS).collect::<String>() + "..."
}

fn simple_prompt_hash(value: &str) -> String {
    let mut hash: u64 = 1469598103934665603;
    for byte in value.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(1099511628211);
    }
    format!("{hash:016x}")
}

fn validate_create_batch_job_input(input: &CreateBatchImageJobInput) -> AppResult<()> {
    if input.name.trim().is_empty() {
        return Err(AppError::Config("batch job name is required".to_string()));
    }
    let batch_type = input.batch_type.as_deref().unwrap_or("demo.image.mock");
    if !matches!(
        batch_type,
        "demo.image.mock" | "demo.image.prompt" | "demo.image.generate"
    ) {
        return Err(AppError::Config(format!(
            "unsupported batch type: {batch_type}"
        )));
    }
    if let Some(total_count) = input.total_count {
        if total_count <= 0 || total_count > 1000 {
            return Err(AppError::Config(
                "total_count must be between 1 and 1000".to_string(),
            ));
        }
    }
    if let Some(concurrency) = input.concurrency {
        if concurrency <= 0 || concurrency > 10 {
            return Err(AppError::Config(
                "concurrency must be between 1 and 10".to_string(),
            ));
        }
    }
    if batch_type == "demo.image.prompt" && input.provider_config.is_none() {
        return Err(AppError::Config(
            "provider_config is required for prompt batch".to_string(),
        ));
    }
    Ok(())
}
