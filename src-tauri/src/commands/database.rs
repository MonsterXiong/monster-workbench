use crate::services::database_service::DatabaseService;
use std::sync::Mutex;
use tauri::State;

type DatabaseState<'a> = State<'a, Mutex<DatabaseService>>;

#[tauri::command]
pub fn export_database(target_path: String, state: DatabaseState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .export_database(&target_path)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn import_database(src_path: String, state: DatabaseState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .import_database(&src_path)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn reset_database(state: DatabaseState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.reset_database().map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn check_db_status(state: DatabaseState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.check_status().map_err(|e| e.to_json_string())
}
