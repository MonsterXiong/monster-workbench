use crate::infra::image_workbench_types::{
    ImageWorkbenchAsset, ImageWorkbenchJob, ImageWorkbenchSnapshot, ImageWorkbenchTemplate,
};
use crate::services::ai_service::AiProviderService;
use crate::services::image_workbench_service::{
    CreateImageWorkbenchJobRequest, ImageWorkbenchContractSummary, ImageWorkbenchService,
    RecordImageWorkbenchAssetRequest, SaveImageWorkbenchTemplateRequest,
    SetImageWorkbenchAssetFavoriteRequest, UpdateImageWorkbenchTaskStatusRequest,
};
use std::sync::Mutex;
use tauri::{AppHandle, State};

type ImageWorkbenchState<'a> = State<'a, Mutex<ImageWorkbenchService>>;
type AiProviderState<'a> = State<'a, Mutex<AiProviderService>>;

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
) -> Result<ImageWorkbenchSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .start_job_runner(app_handle, &job_id)
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
pub fn retry_image_workbench_failed_tasks(
    job_id: String,
    state: ImageWorkbenchState<'_>,
) -> Result<ImageWorkbenchSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .retry_failed_tasks(&job_id)
        .map_err(|e| e.to_json_string())
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
    state: ImageWorkbenchState<'_>,
) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.delete_job(&job_id).map_err(|e| e.to_json_string())
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
