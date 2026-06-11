use crate::infra::creative_types::{
    CreateAssetLinkInput, CreateCreativeTaskInput, CreateTaskEventInput, CreativeAsset,
    CreativeTask, ListAssetLinksFilter, ListCreativeAssetsFilter, ListCreativeTasksFilter,
    TaskEvent, UpdateCreativeTaskStatusInput,
};
use crate::services::sidecar_lifecycle_service::SidecarLifecycleService;
use crate::services::task_service::{
    CreateCreativeAssetServiceInput, GenerateImagePromptWorkflowInput,
    GenerateImagePromptWorkflowResult, ReviewAssetQualityStubInput, ReviewAssetQualityStubResult,
    TaskService,
};
use std::sync::Mutex;
use tauri::State;

type TaskState<'a> = State<'a, Mutex<TaskService>>;
type SidecarState<'a> = State<'a, Mutex<SidecarLifecycleService>>;

#[tauri::command]
pub fn create_creative_task(
    input: CreateCreativeTaskInput,
    state: TaskState<'_>,
) -> Result<CreativeTask, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .create_creative_task(input)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn get_creative_task(id: i64, state: TaskState<'_>) -> Result<Option<CreativeTask>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .get_creative_task(id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn list_creative_tasks(
    filter: Option<ListCreativeTasksFilter>,
    state: TaskState<'_>,
) -> Result<Vec<CreativeTask>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .list_creative_tasks(filter.unwrap_or_default())
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn update_creative_task_status(
    input: UpdateCreativeTaskStatusInput,
    state: TaskState<'_>,
) -> Result<CreativeTask, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .update_creative_task_status(input)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn append_task_event(
    input: CreateTaskEventInput,
    state: TaskState<'_>,
) -> Result<TaskEvent, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .append_task_event(input)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn run_generate_image_prompt_workflow(
    input: GenerateImagePromptWorkflowInput,
    task_state: TaskState<'_>,
    sidecar_state: SidecarState<'_>,
) -> Result<GenerateImagePromptWorkflowResult, String> {
    let task_service = task_state.lock().unwrap_or_else(|e| e.into_inner());
    task_service
        .run_generate_image_prompt_workflow_with_endpoint_provider(input, || {
            let mut sidecar_service = sidecar_state.lock().unwrap_or_else(|e| e.into_inner());
            sidecar_service.ensure_runtime_endpoint()
        })
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn run_review_asset_quality_stub(
    input: ReviewAssetQualityStubInput,
    task_state: TaskState<'_>,
) -> Result<ReviewAssetQualityStubResult, String> {
    let task_service = task_state.lock().unwrap_or_else(|e| e.into_inner());
    task_service
        .run_review_asset_quality_stub(input)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn create_creative_asset(
    input: CreateCreativeAssetServiceInput,
    state: TaskState<'_>,
) -> Result<CreativeAsset, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .create_creative_asset(input)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn list_creative_assets(
    filter: Option<ListCreativeAssetsFilter>,
    state: TaskState<'_>,
) -> Result<Vec<CreativeAsset>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .list_creative_assets(filter.unwrap_or_default())
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn create_asset_link(
    input: CreateAssetLinkInput,
    state: TaskState<'_>,
) -> Result<crate::infra::creative_types::AssetLink, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .create_asset_link(input)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn list_asset_links(
    filter: Option<ListAssetLinksFilter>,
    state: TaskState<'_>,
) -> Result<Vec<crate::infra::creative_types::AssetLink>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .list_asset_links(filter.unwrap_or_default())
        .map_err(|e| e.to_json_string())
}
