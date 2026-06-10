use crate::services::sidecar_lifecycle_service::SidecarLifecycleService;
use std::sync::Mutex;
use tauri::State;

type SidecarState<'a> = State<'a, Mutex<SidecarLifecycleService>>;

#[tauri::command]
pub fn get_sidecar_status(
    state: SidecarState<'_>,
) -> Result<crate::services::sidecar_lifecycle_service::SidecarStatusSnapshot, String> {
    let mut service = state.lock().unwrap_or_else(|e| e.into_inner());
    Ok(service.get_status())
}

#[tauri::command]
pub fn start_sidecar_dev_health_server(
    state: SidecarState<'_>,
) -> Result<crate::services::sidecar_lifecycle_service::SidecarStatusSnapshot, String> {
    let mut service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .start_dev_health_server()
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn check_sidecar_health(
    state: SidecarState<'_>,
) -> Result<crate::services::sidecar_lifecycle_service::SidecarStatusSnapshot, String> {
    let mut service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.check_health().map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn stop_sidecar_dev_health_server(
    state: SidecarState<'_>,
) -> Result<crate::services::sidecar_lifecycle_service::SidecarStatusSnapshot, String> {
    let mut service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .stop_dev_health_server()
        .map_err(|e| e.to_json_string())
}
