use crate::infra::creative_db::{
    CreativeProject, ListCreativeProjectsFilter, UpsertCreativeProjectInput,
};
use crate::services::creative_project_service::CreativeProjectService;
use std::sync::Mutex;
use tauri::State;

type ProjectState<'a> = State<'a, Mutex<CreativeProjectService>>;

#[tauri::command]
pub fn upsert_creative_project(
    input: UpsertCreativeProjectInput,
    state: ProjectState<'_>,
) -> Result<CreativeProject, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .upsert_project(input)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn get_creative_project(
    id: String,
    state: ProjectState<'_>,
) -> Result<Option<CreativeProject>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.get_project(&id).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn list_creative_projects(
    filter: Option<ListCreativeProjectsFilter>,
    state: ProjectState<'_>,
) -> Result<Vec<CreativeProject>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .list_projects(filter.unwrap_or_default())
        .map_err(|e| e.to_json_string())
}
