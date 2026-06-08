use crate::services::config_service::ConfigService;
use tauri::State;
use std::sync::Mutex;

type ConfigState<'a> = State<'a, Mutex<ConfigService>>;

#[tauri::command]
pub fn get_preference_config(state: ConfigState<'_>) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.get_config().map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn save_preference_config(content: String, state: ConfigState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.save_config(&content).map_err(|e| e.to_json_string())
}
