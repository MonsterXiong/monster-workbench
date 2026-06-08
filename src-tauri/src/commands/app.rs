use crate::services::app_service::AppService;
use tauri::State;
use std::sync::Mutex;

type AppState<'a> = State<'a, Mutex<AppService>>;

#[tauri::command]
pub fn get_app_paths(state: AppState<'_>) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.get_local_data_dir().map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn get_app_version(state: AppState<'_>) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    Ok(service.get_version())
}
