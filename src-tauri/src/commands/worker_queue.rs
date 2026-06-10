use crate::infra::creative_db::CreativeTask;
use crate::services::worker_queue_service::{
    WorkerQueueCancelResult, WorkerQueueRecoverySummary, WorkerQueueService,
};
use std::sync::Mutex;
use tauri::State;

type WorkerQueueState<'a> = State<'a, Mutex<WorkerQueueService>>;

#[tauri::command]
pub fn claim_next_creative_task(
    task_type: Option<String>,
    project_id: Option<String>,
    state: WorkerQueueState<'_>,
) -> Result<Option<CreativeTask>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .claim_next_task(task_type, project_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn request_creative_task_cancel(
    task_id: i64,
    state: WorkerQueueState<'_>,
) -> Result<WorkerQueueCancelResult, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .request_cancel(task_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn check_task_cancel_checkpoint(
    task_id: i64,
    state: WorkerQueueState<'_>,
) -> Result<bool, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .check_cancel_checkpoint(task_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn recover_interrupted_creative_tasks(
    state: WorkerQueueState<'_>,
) -> Result<WorkerQueueRecoverySummary, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .recover_interrupted_tasks()
        .map_err(|e| e.to_json_string())
}
