use crate::services::auth_service::AuthService;
use tauri::State;
use std::sync::Mutex;

type AuthState<'a> = State<'a, Mutex<AuthService>>;

#[tauri::command]
pub fn verify_admin_password(password: String, state: AuthState<'_>) -> Result<bool, String> {
    let service = state.lock().unwrap_or_else(|e| e.into_inner());
    service.verify_admin_password(&password).map_err(|e| e.to_json_string())
}
