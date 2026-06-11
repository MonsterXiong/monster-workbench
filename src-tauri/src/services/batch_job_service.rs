use crate::infra::creative_db::{
    CreateCreativeAssetInput, CreateCreativeBatchJobInput, CreateCreativeTaskInput,
    CreateModelRunInput, CreateTaskEventInput, CreativeBatchJob, CreativeBatchJobSnapshot,
    CreativeTask, ListCreativeBatchJobsFilter, ListCreativeTasksFilter, UpdateCreativeBatchJobInput,
    UpdateCreativeTaskStatusInput,
};
use crate::infra::creative_asset_repo;
use crate::infra::creative_batch_repo;
use crate::infra::creative_model_run_repo;
use crate::infra::creative_task_repo;
use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};
use crate::services::ai_service::{AiProviderConfig, AiProviderService};
use crate::services::task_service::CreativeTaskEventPayload;
use serde_json::{json, Value};
use std::collections::HashSet;
use std::fs;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Runtime, Wry};

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

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct BatchExecutionBudget {
    max_consecutive_failures: Option<i64>,
}

pub struct BatchJobService<R: Runtime = Wry> {
    app_handle: AppHandle<R>,
    path_provider: PathProvider,
    active_supervisors: Arc<Mutex<HashSet<i64>>>,
}

impl<R: Runtime> BatchJobService<R> {
    pub fn new(app_handle: AppHandle<R>, path_provider: PathProvider) -> Self {
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

        let job = creative_batch_repo::create_batch_job(
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
            let task = creative_task_repo::create_task(
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
            let _ = creative_task_repo::append_task_event(
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
            creative_batch_repo::get_batch_job_snapshot(&db_path, job.id)?.ok_or_else(|| {
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
        creative_batch_repo::list_batch_jobs(&self.db_path()?, filter)
    }

    pub fn get_batch_job(&self, batch_job_id: i64) -> AppResult<CreativeBatchJobSnapshot> {
        if batch_job_id <= 0 {
            return Err(AppError::Config(
                "batch_job_id must be positive".to_string(),
            ));
        }
        creative_batch_repo::get_batch_job_snapshot(&self.db_path()?, batch_job_id)?
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
        creative_task_repo::list_tasks(
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
        creative_batch_repo::update_batch_job(
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

        let cancelled_task_ids = creative_task_repo::cancel_queued_batch_tasks(&db_path, batch_job_id)?;
        for task_id in cancelled_task_ids {
            if let Some(task) = creative_task_repo::get_task(&db_path, task_id)? {
                let _ = creative_task_repo::append_task_event(
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
            creative_task_repo::mark_running_batch_tasks_cancelling(&db_path, batch_job_id)?;
        for task_id in cancelling_task_ids {
            if let Some(task) = creative_task_repo::get_task(&db_path, task_id)? {
                let _ = creative_task_repo::append_task_event(
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
        creative_batch_repo::update_batch_job(
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
        let snapshot = creative_batch_repo::get_batch_job_snapshot(&db_path, batch_job_id)?
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

fn run_batch_supervisor<R: Runtime>(
    app_handle: AppHandle<R>,
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

fn run_batch_supervisor_inner<R: Runtime>(
    app_handle: &AppHandle<R>,
    db_path: &std::path::Path,
    batch_job_id: i64,
) -> AppResult<()> {
    loop {
        let snapshot =
            creative_batch_repo::get_batch_job_snapshot(db_path, batch_job_id)?.ok_or_else(|| {
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
                    let Some(task) = creative_task_repo::claim_next_queued_task(
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
                    let (started_event_type, started_message) =
                        batch_worker_started_labels(&snapshot.job.batch_type);
                    let _ = creative_task_repo::append_task_event(
                        db_path,
                        CreateTaskEventInput {
                            task_id: task.id,
                            event_type: started_event_type.to_string(),
                            message: Some(started_message.to_string()),
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
                    emit_task_status(app_handle, &task, "creative-task-event", started_message)?;
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
                        } else if batch_type == "demo.image.generate" {
                            run_generate_task_worker(
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

                let refreshed = creative_batch_repo::get_batch_job_snapshot(db_path, batch_job_id)?
                    .ok_or_else(|| {
                        AppError::Database("batch job not found during refresh".to_string())
                    })?;
                if refreshed.stats.queued_tasks == 0
                    && refreshed.stats.running_tasks == 0
                    && refreshed.stats.cancelling_tasks == 0
                {
                    creative_batch_repo::update_batch_job(
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
                    let completed =
                        creative_batch_repo::get_batch_job_snapshot(db_path, batch_job_id)?
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

fn resolve_max_consecutive_failures(batch: &CreativeBatchJob) -> i64 {
    batch
        .budget_json
        .as_deref()
        .and_then(|raw| serde_json::from_str::<BatchExecutionBudget>(raw).ok())
        .and_then(|budget| budget.max_consecutive_failures)
        .unwrap_or(20)
        .clamp(1, 1000)
}

fn batch_worker_started_labels(batch_type: &str) -> (&'static str, &'static str) {
    match batch_type {
        "demo.image.prompt" => ("prompt_started", "prompt worker started"),
        "demo.image.generate" => ("image_started", "image worker started"),
        _ => ("mock_started", "mock worker started"),
    }
}

fn should_auto_pause_after_failure(
    db_path: &std::path::Path,
    batch_job_id: i64,
    threshold: i64,
) -> AppResult<bool> {
    if threshold <= 0 {
        return Ok(false);
    }

    let tasks = creative_task_repo::list_tasks(
        db_path,
        ListCreativeTasksFilter {
            batch_job_id: Some(batch_job_id),
            limit: Some(1000),
            offset: Some(0),
            ..Default::default()
        },
    )?;

    let mut terminal_tasks = tasks
        .into_iter()
        .filter(|task| matches!(task.status.as_str(), "succeeded" | "failed" | "cancelled"))
        .collect::<Vec<_>>();
    terminal_tasks.sort_by(|left, right| {
        right
            .updated_at
            .cmp(&left.updated_at)
            .then_with(|| right.id.cmp(&left.id))
    });

    let consecutive_failures = terminal_tasks
        .iter()
        .take_while(|task| task.status == "failed")
        .count() as i64;
    Ok(consecutive_failures >= threshold)
}

fn maybe_auto_pause_batch_after_failure<R: Runtime>(
    app_handle: &AppHandle<R>,
    db_path: &std::path::Path,
    batch_job_id: i64,
    failure_message: &str,
) -> AppResult<bool> {
    let Some(batch) = creative_batch_repo::get_batch_job(db_path, batch_job_id)? else {
        return Ok(false);
    };
    if batch.status != "running" {
        return Ok(false);
    }

    let threshold = resolve_max_consecutive_failures(&batch);
    if !should_auto_pause_after_failure(db_path, batch_job_id, threshold)? {
        return Ok(false);
    }

    creative_batch_repo::update_batch_job(
        db_path,
        UpdateCreativeBatchJobInput {
            id: batch_job_id,
            status: Some("paused".to_string()),
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

    let snapshot =
        creative_batch_repo::get_batch_job_snapshot(db_path, batch_job_id)?.ok_or_else(|| {
            AppError::Database("batch job snapshot missing after auto pause".to_string())
        })?;
    let message = format!(
        "batch auto-paused after {} consecutive failures: {}",
        threshold,
        summarize_prompt_text(failure_message)
    );
    emit_batch_status(app_handle, &snapshot, &message)?;
    emit_batch_progress(app_handle, &snapshot, &message)?;
    Ok(true)
}

fn run_mock_task_worker<R: Runtime>(
    app_handle: &AppHandle<R>,
    db_path: &std::path::Path,
    batch_job_id: i64,
    task: CreativeTask,
) -> AppResult<()> {
    let duration_ms = mock_duration_ms(task.sequence_no.unwrap_or(task.id));
    let mut elapsed_ms = 0_u64;

    while elapsed_ms < duration_ms {
        thread::sleep(Duration::from_millis(200));
        elapsed_ms = (elapsed_ms + 200).min(duration_ms);

        let batch = creative_batch_repo::get_batch_job(db_path, batch_job_id)?.ok_or_else(|| {
            AppError::Database("batch job not found while running task".to_string())
        })?;
        let current_task = creative_task_repo::get_task(db_path, task.id)?.ok_or_else(|| {
            AppError::Database("task not found while running mock worker".to_string())
        })?;
        if batch.status == "cancelled"
            || matches!(current_task.status.as_str(), "cancelling" | "cancelled")
        {
            let cancelled_task = creative_task_repo::update_task_status(
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
            let _ = creative_task_repo::append_task_event(
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
    let updated_task = creative_task_repo::update_task_status(
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
    let _ = creative_task_repo::append_task_event(
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

fn run_prompt_task_worker<R: Runtime>(
    app_handle: &AppHandle<R>,
    db_path: &std::path::Path,
    batch_job_id: i64,
    task: CreativeTask,
) -> AppResult<()> {
    let batch = creative_batch_repo::get_batch_job(db_path, batch_job_id)?.ok_or_else(|| {
        AppError::Database("batch job not found while running prompt task".to_string())
    })?;
    let current_task = creative_task_repo::get_task(db_path, task.id)?.ok_or_else(|| {
        AppError::Database("task not found while running prompt worker".to_string())
    })?;
    if batch.status == "cancelled"
        || matches!(current_task.status.as_str(), "cancelling" | "cancelled")
    {
        let cancelled_task = creative_task_repo::update_task_status(
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
        let _ = creative_task_repo::append_task_event(
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

            let asset = creative_asset_repo::create_asset(
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

            let model_run = creative_model_run_repo::create_model_run(
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

            let updated_task = creative_task_repo::update_task_status(
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
            let _ = creative_task_repo::append_task_event(
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
                let retry_task = creative_task_repo::update_task_status(
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
                let _ = creative_model_run_repo::create_model_run(
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
                let _ = creative_task_repo::append_task_event(
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
                let failed_task = creative_task_repo::update_task_status(
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
                let _ = creative_model_run_repo::create_model_run(
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
                let _ = creative_task_repo::append_task_event(
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
                let _ = maybe_auto_pause_batch_after_failure(
                    app_handle,
                    db_path,
                    batch_job_id,
                    &error.to_string(),
                );
            }
        }
    }

    Ok(())
}

fn run_generate_task_worker<R: Runtime>(
    app_handle: &AppHandle<R>,
    db_path: &std::path::Path,
    batch_job_id: i64,
    task: CreativeTask,
) -> AppResult<()> {
    let batch = creative_batch_repo::get_batch_job(db_path, batch_job_id)?.ok_or_else(|| {
        AppError::Database("batch job not found while running generate task".to_string())
    })?;
    let current_task = creative_task_repo::get_task(db_path, task.id)?.ok_or_else(|| {
        AppError::Database("task not found while running generate worker".to_string())
    })?;
    if batch.status == "cancelled"
        || matches!(current_task.status.as_str(), "cancelling" | "cancelled")
    {
        let cancelled_task = creative_task_repo::update_task_status(
            db_path,
            UpdateCreativeTaskStatusInput {
                id: task.id,
                status: "cancelled".to_string(),
                result_json: None,
                error_message: Some("image task cancelled".to_string()),
                asset_id: current_task.asset_id,
                retry_count_increment: None,
            },
        )?;
        let _ = creative_task_repo::append_task_event(
            db_path,
            CreateTaskEventInput {
                task_id: task.id,
                event_type: "image_cancelled".to_string(),
                message: Some("image worker observed cancellation".to_string()),
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
            "image worker observed cancellation",
        )?;
        return Ok(());
    }

    let prompt_request = build_prompt_request(&task)?;
    let provider_config =
        build_image_provider_config(&task, &prompt_request, batch.image_size.as_deref())?;
    let model_started = Instant::now();
    let ai_service = AiProviderService::new(app_handle.clone());
    let provider_result = ai_service.test_provider(
        provider_config.clone(),
        "image".to_string(),
        Some(format!("batch-image-task-{}", task.id)),
        None,
    );
    let duration_ms = model_started.elapsed().as_millis() as i64;

    match provider_result {
        Ok(result) if result.ok => {
            let (file_path, thumbnail_path, saved_files) =
                resolve_generate_image_paths(db_path, batch_job_id, task.id, &result)?;
            let image_asset = creative_asset_repo::create_asset(
                db_path,
                CreateCreativeAssetInput {
                    project_id: task.project_id.clone(),
                    asset_type: "demo_image".to_string(),
                    title: Some(format!(
                        "Batch image #{}",
                        task.sequence_no.unwrap_or(task.id)
                    )),
                    content: Some(result.message.clone()),
                    file_path: Some(file_path.clone()),
                    thumbnail_path: Some(thumbnail_path.clone()),
                    metadata_json: Some(
                        json!({
                            "batchJobId": batch_job_id,
                            "sourceTaskId": task.id,
                            "sequenceNo": task.sequence_no,
                            "promptTemplate": prompt_request,
                            "providerResult": result,
                            "savedFiles": saved_files,
                            "filePath": file_path,
                            "thumbnailPath": thumbnail_path,
                        })
                        .to_string(),
                    ),
                    status: Some("ready".to_string()),
                },
            )?;

            let model_run = creative_model_run_repo::create_model_run(
                db_path,
                CreateModelRunInput {
                    project_id: task.project_id.clone(),
                    task_id: Some(task.id),
                    asset_id: Some(image_asset.id),
                    provider_id: Some(provider_config.display_name.clone()),
                    provider_type: Some(provider_config.provider.clone()),
                    model: Some(provider_config.image_model.clone()),
                    request_type: "image".to_string(),
                    status: "succeeded".to_string(),
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
                            "apiImageSize": result.api_image_size,
                            "requestedImageSize": result.requested_image_size,
                            "actualImageSize": result.actual_image_size,
                            "fallbackImageSize": result.fallback_image_size,
                            "imageAttempts": result.image_attempts,
                        })
                        .to_string(),
                    ),
                    finished_at: None,
                },
            )?;

            let updated_task = creative_task_repo::update_task_status(
                db_path,
                UpdateCreativeTaskStatusInput {
                    id: task.id,
                    status: "succeeded".to_string(),
                    result_json: Some(
                        json!({
                            "assetId": image_asset.id,
                            "modelRunId": model_run.id,
                            "filePath": file_path,
                            "thumbnailPath": thumbnail_path,
                            "promptExcerpt": summarize_prompt_text(&prompt_request),
                            "durationMs": duration_ms,
                        })
                        .to_string(),
                    ),
                    error_message: None,
                    asset_id: Some(image_asset.id),
                    retry_count_increment: None,
                },
            )?;
            let _ = creative_task_repo::append_task_event(
                db_path,
                CreateTaskEventInput {
                    task_id: task.id,
                    event_type: "image_asset_saved".to_string(),
                    message: Some(format!("image asset created: {}", image_asset.id)),
                    payload_json: Some(
                        json!({
                            "assetId": image_asset.id,
                            "modelRunId": model_run.id,
                            "filePath": file_path,
                            "thumbnailPath": thumbnail_path,
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
                "image worker finished successfully",
            )?;
        }
        Ok(result) => {
            handle_generate_failure(
                app_handle,
                db_path,
                batch_job_id,
                task,
                &provider_config,
                prompt_request,
                duration_ms,
                result.message.clone(),
            )?;
        }
        Err(error) => {
            handle_generate_failure(
                app_handle,
                db_path,
                batch_job_id,
                task,
                &provider_config,
                prompt_request,
                duration_ms,
                error.to_string(),
            )?;
        }
    }

    Ok(())
}

fn emit_batch_progress<R: Runtime>(
    app_handle: &AppHandle<R>,
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

fn emit_batch_status<R: Runtime>(
    app_handle: &AppHandle<R>,
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

fn emit_task_status<R: Runtime>(
    app_handle: &AppHandle<R>,
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

fn build_image_provider_config(
    task: &CreativeTask,
    prompt_request: &str,
    image_size: Option<&str>,
) -> AppResult<AiProviderConfig> {
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
            AppError::Config("providerConfig is required for generate batch".to_string())
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
        image_prompt: prompt_request.to_string(),
        image_count: 1,
        image_size: image_size.unwrap_or("1024x1024").to_string(),
        timeout_ms: provider_config.timeout_ms.unwrap_or(60_000),
        queue_mode: provider_config
            .queue_mode
            .unwrap_or_else(|| "serial".to_string()),
        max_concurrency: provider_config.max_concurrency.unwrap_or(1),
        queue_key: provider_config.queue_key.unwrap_or_default(),
    })
}

fn resolve_generate_image_paths(
    db_path: &std::path::Path,
    batch_job_id: i64,
    task_id: i64,
    result: &crate::services::ai_service::AiProviderTestResult,
) -> AppResult<(String, String, String)> {
    let source_path = result
        .image_paths
        .as_ref()
        .and_then(|paths| paths.first().cloned())
        .or_else(|| {
            result
                .saved_files
                .as_ref()
                .and_then(|files| files.first().map(|file| file.path.clone()))
        })
        .ok_or_else(|| AppError::Process("image provider returned no saved file".to_string()))?;

    let source_path = std::path::PathBuf::from(&source_path);
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

    if source_path.exists() {
        let _ = fs::copy(&source_path, &thumbnail_path);
    }

    let _ = db_path;
    let _ = batch_job_id;
    let _ = task_id;

    Ok((
        source_path.to_string_lossy().to_string(),
        thumbnail_path.to_string_lossy().to_string(),
        serde_json::to_string(&result.saved_files).unwrap_or_else(|_| "[]".to_string()),
    ))
}

fn handle_generate_failure<R: Runtime>(
    app_handle: &AppHandle<R>,
    db_path: &std::path::Path,
    batch_job_id: i64,
    task: CreativeTask,
    provider_config: &AiProviderConfig,
    prompt_request: String,
    duration_ms: i64,
    error_message: String,
) -> AppResult<()> {
    if current_retry_count(&task) < task.max_retries {
        let retry_task = creative_task_repo::update_task_status(
            db_path,
            UpdateCreativeTaskStatusInput {
                id: task.id,
                status: "queued".to_string(),
                result_json: None,
                error_message: Some(error_message.clone()),
                asset_id: task.asset_id,
                retry_count_increment: Some(1),
            },
        )?;
        let _ = creative_model_run_repo::create_model_run(
            db_path,
            CreateModelRunInput {
                project_id: task.project_id.clone(),
                task_id: Some(task.id),
                asset_id: None,
                provider_id: Some(provider_config.display_name.clone()),
                provider_type: Some(provider_config.provider.clone()),
                model: Some(provider_config.image_model.clone()),
                request_type: "image".to_string(),
                status: "failed".to_string(),
                duration_ms: Some(duration_ms),
                prompt_hash: Some(simple_prompt_hash(&prompt_request)),
                prompt_version_id: Some(format!("batch:{}:{}", batch_job_id, task.id)),
                input_token_count: None,
                output_token_count: None,
                cost_estimate: None,
                error_code: Some("provider_error".to_string()),
                error_message: Some(error_message.clone()),
                metadata_json: Some(json!({ "retryScheduled": true }).to_string()),
                finished_at: None,
            },
        );
        let _ = creative_task_repo::append_task_event(
            db_path,
            CreateTaskEventInput {
                task_id: task.id,
                event_type: "image_retry_scheduled".to_string(),
                message: Some("image worker scheduled retry".to_string()),
                payload_json: Some(
                    json!({
                        "retryCount": retry_task.retry_count,
                        "maxRetries": retry_task.max_retries,
                        "error": error_message,
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
            "image worker scheduled retry",
        )?;
    } else {
        let failed_task = creative_task_repo::update_task_status(
            db_path,
            UpdateCreativeTaskStatusInput {
                id: task.id,
                status: "failed".to_string(),
                result_json: None,
                error_message: Some(error_message.clone()),
                asset_id: task.asset_id,
                retry_count_increment: None,
            },
        )?;
        let _ = creative_model_run_repo::create_model_run(
            db_path,
            CreateModelRunInput {
                project_id: task.project_id.clone(),
                task_id: Some(task.id),
                asset_id: None,
                provider_id: Some(provider_config.display_name.clone()),
                provider_type: Some(provider_config.provider.clone()),
                model: Some(provider_config.image_model.clone()),
                request_type: "image".to_string(),
                status: "failed".to_string(),
                duration_ms: Some(duration_ms),
                prompt_hash: Some(simple_prompt_hash(&prompt_request)),
                prompt_version_id: Some(format!("batch:{}:{}", batch_job_id, task.id)),
                input_token_count: None,
                output_token_count: None,
                cost_estimate: None,
                error_code: Some("provider_error".to_string()),
                error_message: Some(error_message.clone()),
                metadata_json: Some(json!({ "retryScheduled": false }).to_string()),
                finished_at: None,
            },
        );
        let _ = creative_task_repo::append_task_event(
            db_path,
            CreateTaskEventInput {
                task_id: task.id,
                event_type: "image_failed".to_string(),
                message: Some("image worker finished with failure".to_string()),
                payload_json: Some(json!({ "error": error_message }).to_string()),
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
            "image worker finished with failure",
        )?;
        let _ =
            maybe_auto_pause_batch_after_failure(app_handle, db_path, batch_job_id, &error_message);
    }

    Ok(())
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
    if matches!(batch_type, "demo.image.prompt" | "demo.image.generate")
        && input.provider_config.is_none()
    {
        return Err(AppError::Config(
            "provider_config is required for prompt/generate batch".to_string(),
        ));
    }
    Ok(())
}

fn current_retry_count(task: &CreativeTask) -> i64 {
    task.retry_count
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infra::creative_db::{
        CreativeAsset, ListCreativeAssetsFilter, ListModelRunsFilter, UpdateCreativeBatchJobInput,
    };
    use crate::infra::creative_db_schema::init_schema;
    use crate::infra::{
        creative_asset_repo, creative_batch_repo, creative_model_run_repo, creative_task_repo,
    };
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::path::PathBuf;
    use std::process::Command;
    use std::thread::JoinHandle;
    use std::time::{Duration, SystemTime, UNIX_EPOCH};

    const TINY_PNG_BASE64: &str =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2p8Z0AAAAASUVORK5CYII=";

    fn python_available() -> bool {
        Command::new("python")
            .arg("--version")
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
            || Command::new("py")
                .args(["-3", "--version"])
                .output()
                .map(|output| output.status.success())
                .unwrap_or(false)
    }

    fn temp_root(name: &str) -> PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!(
            "monster-workbench-batch-job-{name}-{}-{stamp}",
            std::process::id()
        ))
    }

    fn provider_config(base_url: String, model: &str) -> BatchPromptProviderConfigInput {
        BatchPromptProviderConfigInput {
            provider: "custom".to_string(),
            display_name: "Local Test Provider".to_string(),
            base_url,
            api_key: "local-test-key".to_string(),
            model: model.to_string(),
            timeout_ms: Some(15_000),
            queue_mode: Some("serial".to_string()),
            max_concurrency: Some(1),
            queue_key: Some("batch-test".to_string()),
        }
    }

    fn start_prompt_provider_server(prompt_text: &'static str) -> (String, JoinHandle<()>) {
        let listener = TcpListener::bind("127.0.0.1:0").expect("listener should bind");
        listener
            .set_nonblocking(true)
            .expect("listener should allow non-blocking");
        let base_url = format!(
            "http://127.0.0.1:{}",
            listener.local_addr().expect("addr should exist").port()
        );
        let handle = std::thread::spawn(move || {
            let deadline = std::time::Instant::now() + Duration::from_secs(10);
            let mut handled = 0;
            while handled < 1 && std::time::Instant::now() < deadline {
                match listener.accept() {
                    Ok((mut stream, _)) => {
                        let request = read_http_request(&mut stream);
                        let body = if request.starts_with("POST /chat/completions ") {
                            serde_json::json!({
                                "choices": [
                                    {
                                        "message": {
                                            "content": prompt_text
                                        }
                                    }
                                ]
                            })
                            .to_string()
                        } else {
                            "{\"error\":\"unexpected route\"}".to_string()
                        };
                        write_json_response(&mut stream, 200, &body);
                        handled += 1;
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        std::thread::sleep(Duration::from_millis(10));
                    }
                    Err(error) => panic!("prompt test server accept failed: {error}"),
                }
            }
        });
        (base_url, handle)
    }

    fn start_image_provider_server(model: &'static str) -> (String, JoinHandle<()>) {
        let listener = TcpListener::bind("127.0.0.1:0").expect("listener should bind");
        listener
            .set_nonblocking(true)
            .expect("listener should allow non-blocking");
        let base_url = format!(
            "http://127.0.0.1:{}",
            listener.local_addr().expect("addr should exist").port()
        );
        let handle = std::thread::spawn(move || {
            let deadline = std::time::Instant::now() + Duration::from_secs(10);
            let mut handled = 0;
            while handled < 2 && std::time::Instant::now() < deadline {
                match listener.accept() {
                    Ok((mut stream, _)) => {
                        let request = read_http_request(&mut stream);
                        let body = if request.starts_with("GET /models ") {
                            serde_json::json!({
                                "data": [
                                    {
                                        "id": model
                                    }
                                ]
                            })
                            .to_string()
                        } else if request.starts_with("POST /images/generations ") {
                            serde_json::json!({
                                "data": [
                                    {
                                        "b64_json": TINY_PNG_BASE64
                                    }
                                ]
                            })
                            .to_string()
                        } else {
                            "{\"error\":\"unexpected route\"}".to_string()
                        };
                        write_json_response(&mut stream, 200, &body);
                        handled += 1;
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        std::thread::sleep(Duration::from_millis(10));
                    }
                    Err(error) => panic!("image test server accept failed: {error}"),
                }
            }
        });
        (base_url, handle)
    }

    fn start_failing_image_provider_server(model: &'static str) -> (String, JoinHandle<()>) {
        let listener = TcpListener::bind("127.0.0.1:0").expect("listener should bind");
        listener
            .set_nonblocking(true)
            .expect("listener should allow non-blocking");
        let base_url = format!(
            "http://127.0.0.1:{}",
            listener.local_addr().expect("addr should exist").port()
        );
        let handle = std::thread::spawn(move || {
            let deadline = std::time::Instant::now() + Duration::from_secs(10);
            let mut handled = 0;
            while handled < 4 && std::time::Instant::now() < deadline {
                match listener.accept() {
                    Ok((mut stream, _)) => {
                        let request = read_http_request(&mut stream);
                        if request.starts_with("GET /models ") {
                            let body = serde_json::json!({
                                "data": [
                                    {
                                        "id": model
                                    }
                                ]
                            })
                            .to_string();
                            write_json_response(&mut stream, 200, &body);
                        } else if request.starts_with("POST /images/generations ") {
                            let body = serde_json::json!({
                                "error": {
                                    "message": "rate limit for test auto pause"
                                }
                            })
                            .to_string();
                            write_json_response(&mut stream, 500, &body);
                        } else {
                            write_json_response(
                                &mut stream,
                                404,
                                "{\"error\":\"unexpected route\"}",
                            );
                        }
                        handled += 1;
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        std::thread::sleep(Duration::from_millis(10));
                    }
                    Err(error) => panic!("failing image test server accept failed: {error}"),
                }
            }
        });
        (base_url, handle)
    }

    fn read_http_request(stream: &mut std::net::TcpStream) -> String {
        stream
            .set_read_timeout(Some(Duration::from_secs(2)))
            .expect("read timeout should set");
        let mut buffer = [0_u8; 8192];
        let mut data = Vec::new();
        let mut header_end = None;
        let mut content_length = 0usize;
        let deadline = std::time::Instant::now() + Duration::from_secs(5);
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
                        std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut
                    ) =>
                {
                    if let Some(end) = header_end {
                        if data.len() >= end + content_length {
                            break;
                        }
                    }
                    if std::time::Instant::now() >= deadline {
                        break;
                    }
                }
                Err(error) => panic!("request read failed: {error}"),
            }
        }
        String::from_utf8_lossy(&data).into_owned()
    }

    fn write_json_response(stream: &mut std::net::TcpStream, status: u16, body: &str) {
        let response = format!(
            "HTTP/1.1 {status} OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
        stream
            .write_all(response.as_bytes())
            .expect("response should write");
        stream.flush().expect("response should flush");
    }

    fn cleanup_asset_files(asset: &CreativeAsset) {
        if let Some(path) = &asset.file_path {
            let _ = std::fs::remove_file(path);
        }
        if let Some(path) = &asset.thumbnail_path {
            let _ = std::fs::remove_file(path);
        }
    }

    #[test]
    fn batch_worker_started_labels_match_batch_type() {
        assert_eq!(
            batch_worker_started_labels("demo.image.mock"),
            ("mock_started", "mock worker started")
        );
        assert_eq!(
            batch_worker_started_labels("demo.image.prompt"),
            ("prompt_started", "prompt worker started")
        );
        assert_eq!(
            batch_worker_started_labels("demo.image.generate"),
            ("image_started", "image worker started")
        );
    }

    #[test]
    fn auto_pause_batch_when_generate_failures_hit_budget_threshold() {
        if !python_available() {
            eprintln!("python runtime is unavailable; skipping generate auto-pause test");
            return;
        }

        let app = tauri::test::mock_app();
        let root = temp_root("generate-auto-pause");
        let db_path = root.join("monster_workbench.db");
        let generated_root = root.join("generated");
        let path_provider = PathProvider::new_for_test(root.clone(), db_path.clone());
        let service = BatchJobService::new(app.handle().clone(), path_provider.clone());
        init_schema(&db_path).expect("schema should init");
        std::env::set_var("MONSTER_TOOLS_TEST_OUTPUT_DIR", &generated_root);

        let (base_url, server) = start_failing_image_provider_server("gpt-image-1");
        let snapshot = service
            .create_batch_image_job(CreateBatchImageJobInput {
                project_id: Some("project-batch-image".to_string()),
                name: "Image Batch Auto Pause".to_string(),
                batch_type: Some("demo.image.generate".to_string()),
                total_count: Some(2),
                concurrency: Some(1),
                max_retries: Some(0),
                prompt_template: Some("Render batch image {{sequenceNo}}".to_string()),
                provider_id: Some("local-test".to_string()),
                model: Some("gpt-image-1".to_string()),
                image_size: Some("1024x1024".to_string()),
                budget_json: Some(json!({ "maxConsecutiveFailures": 2 }).to_string()),
                provider_config: Some(provider_config(base_url, "gpt-image-1")),
            })
            .expect("batch job should create");

        creative_batch_repo::update_batch_job(
            &db_path,
            UpdateCreativeBatchJobInput {
                id: snapshot.job.id,
                status: Some("running".to_string()),
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
        )
        .expect("batch should transition to running");

        let tasks = service
            .list_batch_job_tasks(snapshot.job.id, Some(10), Some(0))
            .expect("task list should load");
        assert_eq!(tasks.len(), 2);

        for task in tasks {
            let running_task = creative_task_repo::update_task_status(
                &db_path,
                UpdateCreativeTaskStatusInput {
                    id: task.id,
                    status: "running".to_string(),
                    result_json: None,
                    error_message: None,
                    asset_id: None,
                    retry_count_increment: None,
                },
            )
            .expect("task should move to running");

            run_generate_task_worker(app.handle(), &db_path, snapshot.job.id, running_task)
                .expect("generate worker should complete even on failure");
        }

        server
            .join()
            .expect("failing image test server should join");

        let refreshed = creative_batch_repo::get_batch_job_snapshot(&db_path, snapshot.job.id)
            .expect("snapshot should load")
            .expect("batch job should exist");
        assert_eq!(refreshed.job.status, "paused");
        assert_eq!(refreshed.stats.failed_tasks, 2);

        let failed_tasks = service
            .list_batch_job_tasks(snapshot.job.id, Some(10), Some(0))
            .expect("task list should load");
        assert!(failed_tasks.iter().all(|task| task.status == "failed"));

        std::env::remove_var("MONSTER_TOOLS_TEST_OUTPUT_DIR");
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn prompt_batch_worker_persists_prompt_asset_and_model_run() {
        if !python_available() {
            eprintln!("python runtime is unavailable; skipping prompt batch worker test");
            return;
        }

        let app = tauri::test::mock_app();
        let root = temp_root("prompt");
        let db_path = root.join("monster_workbench.db");
        let path_provider = PathProvider::new_for_test(root.clone(), db_path.clone());
        let service = BatchJobService::new(app.handle().clone(), path_provider.clone());
        init_schema(&db_path).expect("schema should init");

        let (base_url, server) = start_prompt_provider_server(
            "A polished cinematic prompt about a quiet neon street scene.",
        );
        let snapshot = service
            .create_batch_image_job(CreateBatchImageJobInput {
                project_id: Some("project-batch-prompt".to_string()),
                name: "Prompt Batch".to_string(),
                batch_type: Some("demo.image.prompt".to_string()),
                total_count: Some(1),
                concurrency: Some(1),
                max_retries: Some(0),
                prompt_template: Some("Prompt {{sequenceNo}}".to_string()),
                provider_id: Some("local-test".to_string()),
                model: Some("gpt-4.1-mini".to_string()),
                image_size: Some("1024x1024".to_string()),
                budget_json: None,
                provider_config: Some(provider_config(base_url, "gpt-4.1-mini")),
            })
            .expect("batch job should create");

        creative_batch_repo::update_batch_job(
            &db_path,
            UpdateCreativeBatchJobInput {
                id: snapshot.job.id,
                status: Some("running".to_string()),
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
        )
        .expect("batch should transition to running");

        let task = service
            .list_batch_job_tasks(snapshot.job.id, Some(10), Some(0))
            .expect("task list should load")
            .into_iter()
            .next()
            .expect("task should exist");
        let running_task = creative_task_repo::update_task_status(
            &db_path,
            UpdateCreativeTaskStatusInput {
                id: task.id,
                status: "running".to_string(),
                result_json: None,
                error_message: None,
                asset_id: None,
                retry_count_increment: None,
            },
        )
        .expect("task should move to running");

        run_prompt_task_worker(app.handle(), &db_path, snapshot.job.id, running_task)
            .expect("prompt worker should succeed");
        server.join().expect("prompt test server should join");

        let persisted_task = creative_task_repo::get_task(&db_path, task.id)
            .expect("task lookup should succeed")
            .expect("task should exist");
        assert_eq!(persisted_task.status, "succeeded");
        let asset_id = persisted_task
            .asset_id
            .expect("task should reference an asset");

        let assets = creative_asset_repo::list_assets(
            &db_path,
            ListCreativeAssetsFilter {
                asset_type: Some("demo_image_prompt".to_string()),
                ..Default::default()
            },
        )
        .expect("asset list should succeed");
        assert_eq!(assets.len(), 1);
        assert_eq!(assets[0].id, asset_id);
        assert!(assets[0]
            .content
            .as_deref()
            .unwrap_or_default()
            .contains("quiet neon street scene"));

        let model_runs = creative_model_run_repo::list_model_runs(
            &db_path,
            ListModelRunsFilter {
                task_id: Some(task.id),
                ..Default::default()
            },
        )
        .expect("model runs should list");
        assert_eq!(model_runs.len(), 1);
        assert_eq!(model_runs[0].request_type, "chat");
        assert_eq!(model_runs[0].status, "succeeded");

        let events = creative_task_repo::list_task_events(&db_path, task.id)
            .expect("events should list");
        assert!(
            events
                .iter()
                .any(|event| event.event_type == "prompt_asset_saved"),
            "prompt worker should persist prompt_asset_saved event"
        );

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn generate_batch_worker_persists_image_asset_files_and_model_run() {
        if !python_available() {
            eprintln!("python runtime is unavailable; skipping generate batch worker test");
            return;
        }

        let app = tauri::test::mock_app();
        let root = temp_root("generate");
        let db_path = root.join("monster_workbench.db");
        let generated_root = root.join("generated");
        let path_provider = PathProvider::new_for_test(root.clone(), db_path.clone());
        let service = BatchJobService::new(app.handle().clone(), path_provider.clone());
        init_schema(&db_path).expect("schema should init");
        std::env::set_var("MONSTER_TOOLS_TEST_OUTPUT_DIR", &generated_root);

        let (base_url, server) = start_image_provider_server("gpt-image-1");
        let snapshot = service
            .create_batch_image_job(CreateBatchImageJobInput {
                project_id: Some("project-batch-image".to_string()),
                name: "Image Batch".to_string(),
                batch_type: Some("demo.image.generate".to_string()),
                total_count: Some(1),
                concurrency: Some(1),
                max_retries: Some(0),
                prompt_template: Some("Render batch image {{sequenceNo}}".to_string()),
                provider_id: Some("local-test".to_string()),
                model: Some("gpt-image-1".to_string()),
                image_size: Some("1024x1024".to_string()),
                budget_json: None,
                provider_config: Some(provider_config(base_url, "gpt-image-1")),
            })
            .expect("batch job should create");

        creative_batch_repo::update_batch_job(
            &db_path,
            UpdateCreativeBatchJobInput {
                id: snapshot.job.id,
                status: Some("running".to_string()),
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
        )
        .expect("batch should transition to running");

        let task = service
            .list_batch_job_tasks(snapshot.job.id, Some(10), Some(0))
            .expect("task list should load")
            .into_iter()
            .next()
            .expect("task should exist");
        let running_task = creative_task_repo::update_task_status(
            &db_path,
            UpdateCreativeTaskStatusInput {
                id: task.id,
                status: "running".to_string(),
                result_json: None,
                error_message: None,
                asset_id: None,
                retry_count_increment: None,
            },
        )
        .expect("task should move to running");

        run_generate_task_worker(app.handle(), &db_path, snapshot.job.id, running_task)
            .expect("image worker should succeed");
        server.join().expect("image test server should join");

        let persisted_task = creative_task_repo::get_task(&db_path, task.id)
            .expect("task lookup should succeed")
            .expect("task should exist");
        assert_eq!(persisted_task.status, "succeeded");
        let asset_id = persisted_task
            .asset_id
            .expect("task should reference an asset");

        let assets = creative_asset_repo::list_assets(
            &db_path,
            ListCreativeAssetsFilter {
                asset_type: Some("demo_image".to_string()),
                ..Default::default()
            },
        )
        .expect("asset list should succeed");
        assert_eq!(assets.len(), 1);
        assert_eq!(assets[0].id, asset_id);
        assert!(assets[0]
            .file_path
            .as_deref()
            .map(std::path::Path::new)
            .is_some_and(|path| path.exists()));
        assert!(assets[0]
            .thumbnail_path
            .as_deref()
            .map(std::path::Path::new)
            .is_some_and(|path| path.exists()));

        let model_runs = creative_model_run_repo::list_model_runs(
            &db_path,
            ListModelRunsFilter {
                task_id: Some(task.id),
                ..Default::default()
            },
        )
        .expect("model runs should list");
        assert_eq!(model_runs.len(), 1);
        assert_eq!(model_runs[0].request_type, "image");
        assert_eq!(model_runs[0].status, "succeeded");

        let events = creative_task_repo::list_task_events(&db_path, task.id)
            .expect("events should list");
        assert!(
            events
                .iter()
                .any(|event| event.event_type == "image_asset_saved"),
            "image worker should persist image_asset_saved event"
        );

        cleanup_asset_files(&assets[0]);
        std::env::remove_var("MONSTER_TOOLS_TEST_OUTPUT_DIR");
        let _ = std::fs::remove_dir_all(root);
    }
}
