use crate::infra::creative_task_repo;
use crate::infra::creative_types::{CreateTaskEventInput, CreativeTask, TaskEvent};
use crate::infra::{AppError, AppResult};
use crate::services::sidecar_lifecycle_service::{SidecarWorkflowEvent, SidecarWorkflowTaskResult};
use std::path::Path;

pub(crate) fn validate_sidecar_task_result(
    task: &CreativeTask,
    sidecar_response: &SidecarWorkflowTaskResult,
) -> AppResult<()> {
    if sidecar_response.protocol_version != 1 {
        return Err(AppError::Process(format!(
            "unsupported sidecar protocol version: {}",
            sidecar_response.protocol_version
        )));
    }
    if sidecar_response.task_id != task.id {
        return Err(AppError::Process(format!(
            "sidecar task id mismatch: expected {}, got {}",
            task.id, sidecar_response.task_id
        )));
    }
    Ok(())
}

pub(crate) fn append_sidecar_result_events(
    db_path: &Path,
    task_id: i64,
    sidecar_response: &SidecarWorkflowTaskResult,
) -> AppResult<Vec<TaskEvent>> {
    append_sidecar_task_events(db_path, task_id, &sidecar_response.events)
}

fn append_sidecar_task_events(
    db_path: &Path,
    task_id: i64,
    events: &[SidecarWorkflowEvent],
) -> AppResult<Vec<TaskEvent>> {
    let mut persisted_events = Vec::new();
    for event in events {
        persisted_events.push(creative_task_repo::append_task_event(
            db_path,
            CreateTaskEventInput {
                task_id,
                event_type: event.event_type.clone(),
                message: event.message.clone(),
                payload_json: event
                    .payload
                    .as_ref()
                    .map(serde_json::to_string)
                    .transpose()
                    .map_err(|error| {
                        AppError::Config(format!("failed to encode sidecar event payload: {error}"))
                    })?,
            },
        )?);
    }
    Ok(persisted_events)
}
