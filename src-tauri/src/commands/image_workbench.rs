use crate::infra::image_workbench_types::{
    ImageWorkbenchAsset, ImageWorkbenchGroup, ImageWorkbenchJob, ImageWorkbenchSnapshot,
    ImageWorkbenchTemplate, TagImageWorkbenchAssetsGroupResult,
};
use crate::services::ai_service::AiProviderService;
use crate::services::image_workbench_cleanup::{
    CleanupImageWorkbenchDeletedAssetsResult, CleanupImageWorkbenchInvalidAssetsResult,
};
use crate::services::image_workbench_import::{
    ImportImageWorkbenchGeneratedAssetsRequest, ImportImageWorkbenchGeneratedAssetsResult,
};
use crate::services::image_workbench_mask::{
    SaveImageWorkbenchMaskRequest, SaveImageWorkbenchMaskResult,
};
use crate::services::image_workbench_service::{
    CreateImageWorkbenchJobRequest, DeleteImageWorkbenchAssetsRequest,
    DeleteImageWorkbenchAssetsResult, DeleteImageWorkbenchJobResult,
    ExportImageWorkbenchGroupRequest, ImageWorkbenchContractSummary, ImageWorkbenchService,
    ImportImageWorkbenchReferenceRequest, ImportImageWorkbenchReferenceResult,
    QueryImageWorkbenchAssetsRequest, RecordImageWorkbenchAssetRequest,
    RemoveImageWorkbenchStoryboardGroupRequest, ReplanImageWorkbenchStoryboardGroupRequest,
    SaveImageWorkbenchTemplateRequest, SetImageWorkbenchAssetFavoriteRequest,
    SetImageWorkbenchAssetQualityIssuesRequest, SetImageWorkbenchAssetRatingRequest,
    TagImageWorkbenchAssetsGroupRequest, UpdateImageWorkbenchTaskStatusRequest,
};
use crate::services::runtime_janitor::WorkerIdentity;
use std::sync::Mutex;
use tauri::{AppHandle, State};

type ImageWorkbenchState<'a> = State<'a, Mutex<ImageWorkbenchService>>;
type AiProviderState<'a> = State<'a, Mutex<AiProviderService>>;
type WorkerIdentityState<'a> = State<'a, WorkerIdentity>;

#[tauri::command]
pub fn get_image_workbench_contract(
    state: ImageWorkbenchState<'_>,
) -> Result<ImageWorkbenchContractSummary, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    Ok(service.contract_summary())
}

#[tauri::command]
pub fn create_image_workbench_job(
    request: CreateImageWorkbenchJobRequest,
    state: ImageWorkbenchState<'_>,
) -> Result<ImageWorkbenchSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.create_job(request).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn list_image_workbench_jobs(
    limit: Option<u32>,
    state: ImageWorkbenchState<'_>,
) -> Result<Vec<ImageWorkbenchJob>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.list_jobs(limit).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn list_image_workbench_assets(
    limit: Option<u32>,
    state: ImageWorkbenchState<'_>,
) -> Result<Vec<ImageWorkbenchAsset>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.list_assets(limit).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn query_image_workbench_assets(
    request: QueryImageWorkbenchAssetsRequest,
    state: ImageWorkbenchState<'_>,
) -> Result<Vec<ImageWorkbenchAsset>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .query_assets(request)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn list_image_workbench_groups(
    job_id: String,
    state: ImageWorkbenchState<'_>,
) -> Result<Vec<ImageWorkbenchGroup>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.list_groups(job_id).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn import_image_workbench_reference(
    request: ImportImageWorkbenchReferenceRequest,
    state: ImageWorkbenchState<'_>,
) -> Result<ImportImageWorkbenchReferenceResult, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .import_reference_image(request)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn import_image_workbench_generated_assets(
    request: ImportImageWorkbenchGeneratedAssetsRequest,
    state: ImageWorkbenchState<'_>,
) -> Result<ImportImageWorkbenchGeneratedAssetsResult, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .import_generated_assets(request)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn get_image_workbench_job_snapshot(
    job_id: String,
    state: ImageWorkbenchState<'_>,
) -> Result<ImageWorkbenchSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .get_snapshot(&job_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn update_image_workbench_task_status(
    request: UpdateImageWorkbenchTaskStatusRequest,
    state: ImageWorkbenchState<'_>,
) -> Result<ImageWorkbenchSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .update_task_status(request)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn start_image_workbench_job_runner(
    job_id: String,
    app_handle: AppHandle,
    state: ImageWorkbenchState<'_>,
    worker_identity: WorkerIdentityState<'_>,
) -> Result<ImageWorkbenchSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    let worker_id = worker_identity.worker_id.clone();
    service
        .start_job_runner(app_handle, &job_id, worker_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn cancel_image_workbench_job(
    job_id: String,
    state: ImageWorkbenchState<'_>,
    ai_state: AiProviderState<'_>,
) -> Result<ImageWorkbenchSnapshot, String> {
    let snapshot = {
        let service = state.lock().unwrap_or_else(|e| e.into_inner());
        service
            .cancel_job(&job_id)
            .map_err(|e| e.to_json_string())?
    };
    let ai_service = ai_state.lock().unwrap_or_else(|e| e.into_inner());
    for task in &snapshot.tasks {
        let _ = ai_service.cancel_generation_task(&task.id);
    }
    Ok(snapshot)
}

#[tauri::command]
pub fn cancel_image_workbench_task(
    task_id: String,
    state: ImageWorkbenchState<'_>,
    ai_state: AiProviderState<'_>,
) -> Result<ImageWorkbenchSnapshot, String> {
    let snapshot = {
        let service = state.lock().unwrap_or_else(|e| e.into_inner());
        service
            .cancel_task(&task_id)
            .map_err(|e| e.to_json_string())?
    };
    let ai_service = ai_state.lock().unwrap_or_else(|e| e.into_inner());
    let _ = ai_service.cancel_generation_task(&task_id);
    Ok(snapshot)
}

#[tauri::command]
pub fn retry_image_workbench_failed_tasks(
    job_id: String,
    app_handle: AppHandle,
    state: ImageWorkbenchState<'_>,
    worker_identity: WorkerIdentityState<'_>,
) -> Result<ImageWorkbenchSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    let worker_id = worker_identity.worker_id.clone();
    let snapshot = service
        .retry_failed_tasks(&job_id)
        .map_err(|e| e.to_json_string())?;
    service
        .start_job_runner(app_handle, &job_id, worker_id)
        .map_err(|e| e.to_json_string())?;
    Ok(snapshot)
}

#[tauri::command]
pub fn replan_image_workbench_storyboard_group(
    request: ReplanImageWorkbenchStoryboardGroupRequest,
    app_handle: AppHandle,
    state: ImageWorkbenchState<'_>,
    worker_identity: WorkerIdentityState<'_>,
) -> Result<ImageWorkbenchSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    let worker_id = worker_identity.worker_id.clone();
    let snapshot = service
        .replan_storyboard_group(request)
        .map_err(|e| e.to_json_string())?;
    let job_id = snapshot.job.id.clone();
    service
        .start_job_runner(app_handle, &job_id, worker_id)
        .map_err(|e| e.to_json_string())?;
    Ok(snapshot)
}

#[tauri::command]
pub fn remove_image_workbench_storyboard_group(
    request: RemoveImageWorkbenchStoryboardGroupRequest,
    state: ImageWorkbenchState<'_>,
    ai_state: AiProviderState<'_>,
) -> Result<ImageWorkbenchSnapshot, String> {
    let (snapshot, task_ids) = {
        let service = state.lock().unwrap_or_else(|e| e.into_inner());
        service
            .remove_storyboard_group(request)
            .map_err(|e| e.to_json_string())?
    };
    let ai_service = ai_state.lock().unwrap_or_else(|e| e.into_inner());
    for task_id in task_ids {
        let _ = ai_service.cancel_generation_task(&task_id);
    }
    Ok(snapshot)
}

#[tauri::command]
pub fn recover_image_workbench_interrupted_jobs(
    state: ImageWorkbenchState<'_>,
) -> Result<u32, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .recover_interrupted_jobs()
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn delete_image_workbench_job(
    job_id: String,
    delete_assets: Option<bool>,
    state: ImageWorkbenchState<'_>,
    ai_state: AiProviderState<'_>,
) -> Result<DeleteImageWorkbenchJobResult, String> {
    let (task_ids, result) = {
        let service = state.lock().unwrap_or_else(|e| e.into_inner());
        let snapshot = service
            .get_snapshot(&job_id)
            .map_err(|e| e.to_json_string())?;
        let result = service
            .delete_job(&job_id, delete_assets.unwrap_or(false))
            .map_err(|e| e.to_json_string())?;
        let task_ids = snapshot
            .tasks
            .iter()
            .filter(|task| {
                matches!(
                    task.status.as_str(),
                    "queued" | "running" | "validating" | "retrying"
                )
            })
            .map(|task| task.id.clone())
            .collect::<Vec<_>>();
        (task_ids, result)
    };
    let ai_service = ai_state.lock().unwrap_or_else(|e| e.into_inner());
    for task_id in task_ids {
        let _ = ai_service.cancel_generation_task(&task_id);
    }
    Ok(result)
}

#[tauri::command]
pub fn export_image_workbench_job(
    job_id: String,
    state: ImageWorkbenchState<'_>,
) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.export_job(&job_id).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn export_image_workbench_asset(
    asset_id: String,
    state: ImageWorkbenchState<'_>,
) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .export_asset(&asset_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn export_image_workbench_group(
    request: ExportImageWorkbenchGroupRequest,
    state: ImageWorkbenchState<'_>,
) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .export_group(request)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn delete_image_workbench_assets(
    request: DeleteImageWorkbenchAssetsRequest,
    state: ImageWorkbenchState<'_>,
) -> Result<DeleteImageWorkbenchAssetsResult, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .delete_assets(request)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn tag_image_workbench_assets_group(
    request: TagImageWorkbenchAssetsGroupRequest,
    state: ImageWorkbenchState<'_>,
) -> Result<TagImageWorkbenchAssetsGroupResult, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .tag_assets_group(request)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn cleanup_image_workbench_deleted_assets(
    state: ImageWorkbenchState<'_>,
) -> Result<CleanupImageWorkbenchDeletedAssetsResult, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .cleanup_deleted_job_assets()
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn cleanup_image_workbench_invalid_assets(
    state: ImageWorkbenchState<'_>,
) -> Result<CleanupImageWorkbenchInvalidAssetsResult, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .cleanup_invalid_assets()
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn save_image_workbench_mask(
    request: SaveImageWorkbenchMaskRequest,
    state: ImageWorkbenchState<'_>,
) -> Result<SaveImageWorkbenchMaskResult, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.save_mask(request).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn record_image_workbench_task_asset(
    request: RecordImageWorkbenchAssetRequest,
    state: ImageWorkbenchState<'_>,
) -> Result<ImageWorkbenchSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .record_asset(request)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn set_image_workbench_asset_favorite(
    request: SetImageWorkbenchAssetFavoriteRequest,
    state: ImageWorkbenchState<'_>,
) -> Result<ImageWorkbenchSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .set_asset_favorite(request)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn set_image_workbench_asset_rating(
    request: SetImageWorkbenchAssetRatingRequest,
    state: ImageWorkbenchState<'_>,
) -> Result<ImageWorkbenchSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .set_asset_rating(request)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn set_image_workbench_asset_quality_issues(
    request: SetImageWorkbenchAssetQualityIssuesRequest,
    state: ImageWorkbenchState<'_>,
) -> Result<ImageWorkbenchSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .set_asset_quality_issues(request)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn list_image_workbench_templates(
    state: ImageWorkbenchState<'_>,
) -> Result<Vec<ImageWorkbenchTemplate>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.list_templates().map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn save_image_workbench_template(
    request: SaveImageWorkbenchTemplateRequest,
    state: ImageWorkbenchState<'_>,
) -> Result<ImageWorkbenchTemplate, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .save_template(request)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn delete_image_workbench_template(
    template_id: String,
    state: ImageWorkbenchState<'_>,
) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .delete_template(&template_id)
        .map_err(|e| e.to_json_string())
}
