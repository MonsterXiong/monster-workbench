use crate::services::file_service::{FileService, PathItem};
use tauri::State;
use std::sync::Mutex;

type FileState<'a> = State<'a, Mutex<FileService>>;

#[tauri::command]
pub fn select_folder(state: FileState<'_>) -> Result<Option<String>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.select_folder().map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn select_file(state: FileState<'_>) -> Result<Option<String>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.select_file().map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn upload_file(
    src_path: String,
    file_type: String,
    year_month: String,
    uuid_name: String,
    state: FileState<'_>
) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.upload_file(&src_path, &file_type, &year_month, &uuid_name).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn list_uploaded_files(
    file_type: Option<String>,
    state: FileState<'_>
) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.list_uploaded_files(file_type.as_deref()).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn delete_uploaded_file(
    rel_path: String,
    state: FileState<'_>
) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.delete_uploaded_file(&rel_path).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn write_file_data(content: String, state: FileState<'_>) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.write_test_file(&content).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn read_file_data(state: FileState<'_>) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.read_test_file().map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn create_directory_structure(
    root_path: Option<String>,
    items: Vec<PathItem>,
    state: FileState<'_>
) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.create_directory_structure(root_path, items).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn read_directory_tree(
    dir_path: String,
    skip_dirs: Vec<String>,
    max_depth: u32,
    state: FileState<'_>
) -> Result<String, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.read_directory_tree(&dir_path, skip_dirs, max_depth).map_err(|e| e.to_json_string())
}
