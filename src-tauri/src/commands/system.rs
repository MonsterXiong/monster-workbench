use crate::services::log_service::LogService;
use crate::services::system_service::{PortProcessInfo, SystemService};
use std::sync::Mutex;
use tauri::{State, Window};

type SystemState<'a> = State<'a, Mutex<SystemService>>;
type LogState<'a> = State<'a, Mutex<LogService>>;

#[tauri::command]
pub fn open_system_path(path: String, state: SystemState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .open_system_path(&path)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn control_window(
    action: String,
    window: Window,
    state: SystemState<'_>,
) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .control_window(&action, window)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn find_port_process(
    port: u16,
    state: SystemState<'_>,
) -> Result<Vec<PortProcessInfo>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .find_port_process(port)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn kill_process_by_pid(pid: u32, state: SystemState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .kill_process_by_pid(pid)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn kill_process_by_name(name: String, state: SystemState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .kill_process_by_name(&name)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn is_process_running(name: String, state: SystemState<'_>) -> Result<bool, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .is_process_running(&name)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn find_process_by_name(name: String, state: SystemState<'_>) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .find_process_by_name(&name)
        .map_err(|e| e.to_json_string())
}

#[tauri::command(rename_all = "camelCase")]
pub fn write_text_file(
    path: String,
    contents: String,
    state: SystemState<'_>,
) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .write_text_file(&path, &contents)
        .map_err(|e| e.to_json_string())
}

#[tauri::command(rename_all = "camelCase")]
pub fn read_text_file(path: String, state: SystemState<'_>) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .read_text_file(&path)
        .map_err(|e| e.to_json_string())
}

#[tauri::command(rename_all = "camelCase")]
pub fn write_log_entry(file_name: String, line: String, state: LogState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .write_log(&file_name, &line)
        .map_err(|e| e.to_json_string())
}

#[tauri::command(rename_all = "camelCase")]
pub fn read_log_file(file_name: String, state: LogState<'_>) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.read_log(&file_name).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn clear_all_logs(state: LogState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.clear_logs().map_err(|e| e.to_json_string())
}

#[tauri::command(rename_all = "camelCase")]
pub fn export_log_file(
    file_name: String,
    target_path: String,
    state: LogState<'_>,
) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .export_log(&file_name, &target_path)
        .map_err(|e| e.to_json_string())
}

#[tauri::command(rename_all = "camelCase")]
pub fn export_system_diagnostics(
    target_path: String,
    current_time: String,
    state: SystemState<'_>,
) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .export_system_diagnostics(&target_path, &current_time)
        .map_err(|e| e.to_json_string())
}
