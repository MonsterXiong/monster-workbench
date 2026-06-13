use crate::infra::creative_asset_repo;
use crate::infra::creative_model_run_repo;
use crate::infra::creative_task_repo;
use crate::infra::creative_types::{
    CreateCreativeAssetInput, CreateModelRunInput, CreateTaskEventInput, CreativeAsset,
    CreativeTask, TaskEvent,
};
use crate::infra::{AppError, AppResult};
use crate::services::sidecar_lifecycle_service::{
    SidecarWorkflowEvent, SidecarWorkflowModelRun, SidecarWorkflowOutput, SidecarWorkflowTaskResult,
};
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

pub(crate) fn persist_sidecar_model_runs(
    db_path: &Path,
    task: &CreativeTask,
    asset_id: Option<i64>,
    model_runs: &[SidecarWorkflowModelRun],
    prompt_hash_fallback: Option<&str>,
    metadata_error_context: &str,
) -> AppResult<Vec<i64>> {
    let prompt_hash_fallback = prompt_hash_fallback.map(ToString::to_string);
    let mut model_run_ids = Vec::new();
    for model_run in model_runs {
        let persisted = creative_model_run_repo::create_model_run(
            db_path,
            CreateModelRunInput {
                project_id: task.project_id.clone(),
                task_id: Some(task.id),
                asset_id,
                provider_id: model_run.provider_id.clone(),
                provider_type: model_run.provider_type.clone(),
                model: model_run.model.clone(),
                request_type: model_run.request_type.clone(),
                status: model_run.status.clone(),
                duration_ms: model_run.duration_ms,
                prompt_hash: model_run
                    .prompt_hash
                    .clone()
                    .or_else(|| prompt_hash_fallback.clone()),
                prompt_version_id: model_run.prompt_version_id.clone(),
                input_token_count: model_run.input_token_count,
                output_token_count: model_run.output_token_count,
                cost_estimate: model_run.cost_estimate,
                error_code: model_run.error_code.clone(),
                error_message: model_run.error_message.clone(),
                metadata_json: model_run
                    .metadata
                    .as_ref()
                    .map(serde_json::to_string)
                    .transpose()
                    .map_err(|error| {
                        AppError::Config(format!(
                            "failed to encode {metadata_error_context}: {error}"
                        ))
                    })?,
                finished_at: None,
            },
        )?;
        model_run_ids.push(persisted.id);
    }
    Ok(model_run_ids)
}

pub(crate) fn persist_cancelled_sidecar_model_runs(
    db_path: &Path,
    task: &CreativeTask,
    asset_id: Option<i64>,
    model_runs: &[SidecarWorkflowModelRun],
    prompt_hash_fallback: Option<&str>,
    metadata_error_context: &str,
) -> AppResult<Vec<i64>> {
    let cancelled_model_runs = model_runs
        .iter()
        .cloned()
        .map(|mut model_run| {
            model_run.status = "cancelled".to_string();
            model_run
        })
        .collect::<Vec<_>>();
    persist_sidecar_model_runs(
        db_path,
        task,
        asset_id,
        &cancelled_model_runs,
        prompt_hash_fallback,
        metadata_error_context,
    )
}

pub(crate) fn create_ready_sidecar_asset(
    db_path: &Path,
    project_id: Option<String>,
    output: &SidecarWorkflowOutput,
    content_override: Option<String>,
    metadata_error_context: &str,
) -> AppResult<CreativeAsset> {
    creative_asset_repo::create_asset(
        db_path,
        CreateCreativeAssetInput {
            project_id,
            asset_type: output.asset_type.clone(),
            title: output.title.clone(),
            content: content_override.or_else(|| output.content.clone()),
            file_path: output.file_path.clone(),
            thumbnail_path: output.thumbnail_path.clone(),
            metadata_json: output
                .metadata
                .as_ref()
                .map(serde_json::to_string)
                .transpose()
                .map_err(|error| {
                    AppError::Config(format!(
                        "failed to encode {metadata_error_context}: {error}"
                    ))
                })?,
            status: Some("ready".to_string()),
        },
    )
}
