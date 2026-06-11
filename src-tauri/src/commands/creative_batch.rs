use crate::infra::creative_types::{
    CreativeBatchJob, CreativeBatchJobSnapshot, CreativeTask, ListCreativeBatchJobsFilter,
};
use crate::services::batch_job_service::{BatchJobService, CreateBatchImageJobInput};
use std::sync::Mutex;
use tauri::State;

type BatchJobState<'a> = State<'a, Mutex<BatchJobService>>;

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

