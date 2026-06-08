use crate::services::navigation_service::{
    NavigationItem,
    NavigationService,
    PagedResult,
    SortOrderItem,
};
use tauri::State;
use std::sync::Mutex;

type NavState<'a> = State<'a, Mutex<NavigationService>>;

#[tauri::command]
pub fn init_navigation_db(db_path: String, state: NavState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.init_navigation_db(&db_path).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn get_navigation_list(
    db_path: String,
    keyword: Option<String>,
    category: Option<String>,
    is_featured: Option<i32>,
    is_hot: Option<i32>,
    page: u32,
    page_size: u32,
    state: NavState<'_>,
) -> Result<PagedResult<NavigationItem>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service
        .get_navigation_list(&db_path, keyword, category, is_featured, is_hot, page, page_size)
        .map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn add_navigation(db_path: String, item: NavigationItem, state: NavState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.add_navigation(&db_path, item).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn update_navigation(db_path: String, item: NavigationItem, state: NavState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.update_navigation(&db_path, item).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn delete_navigation(db_path: String, id: i32, state: NavState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.delete_navigation(&db_path, id).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn batch_delete_navigation(db_path: String, ids: Vec<i32>, state: NavState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.batch_delete_navigation(&db_path, ids).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn increment_navigation_clicks(db_path: String, id: i32, state: NavState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.increment_clicks(&db_path, id).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn get_navigation_categories(db_path: String, state: NavState<'_>) -> Result<Vec<String>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.get_categories(&db_path).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn migrate_navigation_category(
    db_path: String,
    from_cat: String,
    to_cat: String,
    state: NavState<'_>,
) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.migrate_category(&db_path, &from_cat, &to_cat).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn clear_navigation_file_references(
    db_path: String,
    rel_path: String,
    state: NavState<'_>,
) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.clear_file_references(&db_path, &rel_path).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn check_navigation_file_references(
    db_path: String,
    rel_path: String,
    state: NavState<'_>,
) -> Result<Vec<String>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.check_file_references(&db_path, &rel_path).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn save_navigation_sort_order(
    db_path: String,
    orders: Vec<SortOrderItem>,
    state: NavState<'_>,
) -> Result<(), String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.save_sort_order(&db_path, orders).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn get_all_navigation_list(db_path: String, state: NavState<'_>) -> Result<Vec<NavigationItem>, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.get_all_navigation_list(&db_path).map_err(|e| e.to_json_string())
}

#[tauri::command]
pub fn import_navigation_list(
    db_path: String,
    items: Vec<NavigationItem>,
    state: NavState<'_>,
) -> Result<u32, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.import_navigation_list(&db_path, items).map_err(|e| e.to_json_string())
}
