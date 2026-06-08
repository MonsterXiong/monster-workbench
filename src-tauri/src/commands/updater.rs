use crate::services::task_service::TaskService;
use tauri::State;
use std::sync::Mutex;

type TaskState<'a> = State<'a, Mutex<TaskService>>;

#[tauri::command]
pub fn trigger_update_download(task_id: String, task_name: String, state: TaskState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.start_dummy_task(task_id, task_name).map_err(|e| e.to_json_string())
}
