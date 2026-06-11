use crate::services::log_service::LogService;
use crate::services::sidecar_lifecycle_service::SidecarLifecycleService;
use std::sync::Mutex;
use tauri::State;

type SidecarState<'a> = State<'a, Mutex<SidecarLifecycleService>>;
type LogState<'a> = State<'a, Mutex<LogService>>;
const SIDECAR_RUNTIME_DIAGNOSTIC_LOG_FILE: &str = "sidecar-runtime.log";

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

#[tauri::command]
pub fn poll_sidecar_runtime_events(
    state: SidecarState<'_>,
    log_state: LogState<'_>,
    after: Option<u64>,
    limit: Option<u64>,
) -> Result<crate::services::sidecar_lifecycle_service::SidecarRuntimeEventsResponse, String> {
    let (response, diagnostic_events) = {
        let mut service = state.lock().unwrap_or_else(|e| e.into_inner());
        let response = service
            .poll_runtime_events(after, limit)
            .map_err(|e| e.to_json_string())?;
        let diagnostic_events = service.take_new_runtime_events_for_diagnostics(&response);
        (response, diagnostic_events)
    };

    if !diagnostic_events.is_empty() {
        let logger = log_state.lock().unwrap_or_else(|e| e.into_inner());
        for event in &diagnostic_events {
            let _ = logger.write_log(
                SIDECAR_RUNTIME_DIAGNOSTIC_LOG_FILE,
                &format_sidecar_runtime_event(event),
            );
        }
    }

    Ok(response)
}

fn format_sidecar_runtime_event(
    event: &crate::services::sidecar_lifecycle_service::SidecarRuntimeEvent,
) -> String {
    format!(
        "[{}] [SIDECAR_RUNTIME] runtime={} startedAt={} sourceEventId={} taskId={} workflow={} eventType={} message={}",
        event.created_at,
        event.runtime_instance_id.as_deref().unwrap_or("unknown"),
        event.runtime_started_at.as_deref().unwrap_or("unknown"),
        event.id,
        event
            .task_id
            .map(|value| value.to_string())
            .unwrap_or_else(|| "-".to_string()),
        event.workflow_type.as_deref().unwrap_or("-"),
        compact_log_field(&event.event_type),
        event
            .message
            .as_deref()
            .map(compact_log_field)
            .unwrap_or_else(|| "-".to_string())
    )
}

fn compact_log_field(value: &str) -> String {
    const MAX_LOG_FIELD_CHARS: usize = 500;
    let compact = value.split_whitespace().collect::<Vec<_>>().join(" ");
    compact.chars().take(MAX_LOG_FIELD_CHARS).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::sidecar_lifecycle_service::SidecarRuntimeEvent;

    #[test]
    fn format_sidecar_runtime_event_omits_payload_and_compacts_message() {
        let line = format_sidecar_runtime_event(&SidecarRuntimeEvent {
            id: 7,
            runtime_instance_id: Some("runtime-1".to_string()),
            runtime_started_at: Some("2026-06-12T08:00:00Z".to_string()),
            task_id: Some(42),
            workflow_type: Some("image_prompt".to_string()),
            event_type: "workflow_step_completed".to_string(),
            message: Some("prompt\nbuilt\twith spacing".to_string()),
            payload: Some(serde_json::json!({ "apiKey": "secret" })),
            created_at: "2026-06-12T08:00:01Z".to_string(),
        });

        assert!(line.contains("runtime=runtime-1"));
        assert!(line.contains("sourceEventId=7"));
        assert!(line.contains("taskId=42"));
        assert!(line.contains("message=prompt built with spacing"));
        assert!(!line.contains("apiKey"));
        assert!(!line.contains("secret"));
    }
}
