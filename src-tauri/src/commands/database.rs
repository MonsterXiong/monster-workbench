use crate::infra::creative_db::{
    CreateAssetLinkInput, CreateCreativeTaskInput, CreateTaskEventInput, CreativeAsset,
    CreativeBatchJob, CreativeBatchJobSnapshot, CreativeTask, ListAssetLinksFilter,
    ListCreativeAssetsFilter, ListCreativeBatchJobsFilter, ListCreativeTasksFilter, TaskEvent,
    UpdateCreativeTaskStatusInput,
};
use crate::services::batch_job_service::{BatchJobService, CreateBatchImageJobInput};
use crate::services::database_service::DatabaseService;
use crate::services::goal_service::{
    CreateGoalMultiAgentStubInput, CreativeGoalStatusSnapshot, GoalService,
};
use crate::services::sidecar_lifecycle_service::SidecarLifecycleService;
use crate::services::task_service::{
    CreateCreativeAssetServiceInput, GenerateImagePromptWorkflowInput,
    GenerateImagePromptWorkflowResult, ReviewAssetQualityStubInput, ReviewAssetQualityStubResult,
    TaskService,
};
use crate::services::worker_queue_service::{
    WorkerQueueCancelResult, WorkerQueueRecoverySummary, WorkerQueueService,
};
use std::sync::Mutex;
use tauri::State;

type DatabaseState<'a> = State<'a, Mutex<DatabaseService>>;
type BatchJobState<'a> = State<'a, Mutex<BatchJobService>>;
type GoalState<'a> = State<'a, Mutex<GoalService>>;
type TaskState<'a> = State<'a, Mutex<TaskService>>;
type SidecarState<'a> = State<'a, Mutex<SidecarLifecycleService>>;
type WorkerQueueState<'a> = State<'a, Mutex<WorkerQueueService>>;

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

#[tauri::command]
pub fn create_batch_image_job(
    input: CreateBatchImageJobInput,
    state: BatchJobState<'_>,
) -> Result<CreativeBatchJobSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .create_batch_image_job(input)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn list_batch_jobs(
    filter: Option<ListCreativeBatchJobsFilter>,
    state: BatchJobState<'_>,
) -> Result<Vec<CreativeBatchJob>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .list_batch_jobs(filter.unwrap_or_default())
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn get_batch_job(
    batch_job_id: i64,
    state: BatchJobState<'_>,
) -> Result<CreativeBatchJobSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .get_batch_job(batch_job_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn start_batch_job(
    batch_job_id: i64,
    state: BatchJobState<'_>,
) -> Result<CreativeBatchJobSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .start_batch_job(batch_job_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn pause_batch_job(
    batch_job_id: i64,
    state: BatchJobState<'_>,
) -> Result<CreativeBatchJobSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .pause_batch_job(batch_job_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn resume_batch_job(
    batch_job_id: i64,
    state: BatchJobState<'_>,
) -> Result<CreativeBatchJobSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .resume_batch_job(batch_job_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn cancel_batch_job(
    batch_job_id: i64,
    state: BatchJobState<'_>,
) -> Result<CreativeBatchJobSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .cancel_batch_job(batch_job_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn list_batch_job_tasks(
    batch_job_id: i64,
    limit: Option<i64>,
    offset: Option<i64>,
    state: BatchJobState<'_>,
) -> Result<Vec<CreativeTask>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .list_batch_job_tasks(batch_job_id, limit, offset)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn create_creative_goal(
    input: crate::infra::creative_db::CreateCreativeGoalInput,
    state: GoalState<'_>,
) -> Result<crate::infra::creative_db::CreativeGoal, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.create_goal(input).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn list_creative_goals(
    filter: Option<crate::infra::creative_db::ListCreativeGoalsFilter>,
    state: GoalState<'_>,
) -> Result<Vec<crate::infra::creative_db::CreativeGoal>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .list_goals(filter.unwrap_or_default())
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn create_goal_multi_agent_stub(
    input: CreateGoalMultiAgentStubInput,
    state: GoalState<'_>,
) -> Result<crate::services::goal_service::GoalMultiAgentStubResult, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .create_goal_multi_agent_stub(input)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn get_goal_status(
    goal_id: i64,
    state: GoalState<'_>,
) -> Result<CreativeGoalStatusSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .get_goal_status(goal_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn stop_creative_goal(
    goal_id: i64,
    state: GoalState<'_>,
) -> Result<CreativeGoalStatusSnapshot, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.stop_goal(goal_id).map_err(|e| e.to_json_string())
}

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
pub fn run_generate_image_prompt_workflow(
    input: GenerateImagePromptWorkflowInput,
    task_state: TaskState<'_>,
    sidecar_state: SidecarState<'_>,
) -> Result<GenerateImagePromptWorkflowResult, String> {
    let task_service = task_state.lock().unwrap_or_else(|e| e.into_inner());
    let mut sidecar_service = sidecar_state.lock().unwrap_or_else(|e| e.into_inner());
    task_service
        .run_generate_image_prompt_workflow(input, &mut sidecar_service)
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
) -> Result<crate::infra::creative_db::AssetLink, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .create_asset_link(input)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn list_asset_links(
    filter: Option<ListAssetLinksFilter>,
    state: TaskState<'_>,
) -> Result<Vec<crate::infra::creative_db::AssetLink>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .list_asset_links(filter.unwrap_or_default())
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn claim_next_creative_task(
    task_type: Option<String>,
    project_id: Option<String>,
    state: WorkerQueueState<'_>,
) -> Result<Option<CreativeTask>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .claim_next_task(task_type, project_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn request_creative_task_cancel(
    task_id: i64,
    state: WorkerQueueState<'_>,
) -> Result<WorkerQueueCancelResult, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .request_cancel(task_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn check_task_cancel_checkpoint(
    task_id: i64,
    state: WorkerQueueState<'_>,
) -> Result<bool, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .check_cancel_checkpoint(task_id)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn recover_interrupted_creative_tasks(
    state: WorkerQueueState<'_>,
) -> Result<WorkerQueueRecoverySummary, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .recover_interrupted_tasks()
        .map_err(|e| e.to_json_string())
}
