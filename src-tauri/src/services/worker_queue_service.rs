use crate::infra::creative_task_repo;
use crate::infra::creative_types::{
    CreateTaskEventInput, CreativeTask, ListCreativeTasksFilter, UpdateCreativeTaskStatusInput,
};
use crate::infra::path::PathProvider;
use crate::infra::{AppError, AppResult};

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

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerQueueCompleteTaskInput {
    pub task_id: i64,
    pub status: String,
    pub result_json: Option<String>,
    pub error_message: Option<String>,
    pub asset_id: Option<i64>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerQueueCompleteResult {
    pub task: CreativeTask,
    pub reported_status: String,
    pub final_status: String,
    pub was_cancelling: bool,
}

pub struct WorkerQueueService {
    path_provider: PathProvider,
}

impl WorkerQueueService {
    pub fn new(path_provider: PathProvider) -> Self {
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

    pub fn check_cancel_checkpoint(&self, task_id: i64) -> AppResult<bool> {
        if task_id <= 0 {
            return Err(AppError::Config("task id must be positive".to_string()));
        }

        let task = creative_task_repo::get_task(&self.db_path()?, task_id)?
            .ok_or_else(|| AppError::Database("task not found".to_string()))?;
        Ok(matches!(task.status.as_str(), "cancelling" | "cancelled"))
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
                creative_task_repo::update_task_status(
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
            creative_task_repo::update_task_status(
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infra::creative_db_schema::init_schema;
    use crate::infra::creative_types::CreateCreativeTaskInput;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

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
}
