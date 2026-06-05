use crate::services::system_service::SystemService;

type SystemState<'a> = tauri::State<'a, std::sync::Mutex<SystemService>>;

#[tauri::command]
pub fn get_app_paths(state: SystemState<'_>) -> Result<String, String> {
    let service = state.lock().unwrap();
    service.get_app_local_data_dir()
}

#[tauri::command]
pub fn write_file_data(content: String, state: SystemState<'_>) -> Result<String, String> {
    let service = state.lock().unwrap();
    service.write_test_file(&content)
}

#[tauri::command]
pub fn read_file_data(state: SystemState<'_>) -> Result<String, String> {
    let service = state.lock().unwrap();
    service.read_test_file()
}

#[tauri::command]
pub fn open_system_path(path: String, state: SystemState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap();
    service.open_path(&path)
}

#[tauri::command]
pub fn control_window(action: String, window: tauri::Window) -> Result<(), String> {
    // 采用 Tauri v2 魔术参数接收窗口实例进行原生操控
    match action.as_str() {
        "minimize" => {
            window.minimize().map_err(|e| e.to_string())?;
        }
        "maximize" => {
            let is_max = window.is_maximized().unwrap_or(false);
            if is_max {
                window.unmaximize().map_err(|e| e.to_string())?;
            } else {
                window.maximize().map_err(|e| e.to_string())?;
            }
        }
        "hide" => {
            window.hide().map_err(|e| e.to_string())?;
        }
        _ => return Err(format!("未识别的窗口控制指令: {}", action)),
    }
    Ok(())
}

#[tauri::command]
pub fn select_folder(state: SystemState<'_>) -> Result<Option<String>, String> {
    let service = state.lock().unwrap();
    service.select_folder()
}

#[tauri::command]
pub fn select_file(state: SystemState<'_>) -> Result<Option<String>, String> {
    let service = state.lock().unwrap();
    service.select_file()
}

#[tauri::command]
pub fn create_directory_structure(root_path: Option<String>, items: Vec<crate::services::system_service::PathItem>, state: SystemState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap();
    service.create_directory_structure(root_path, items)
}

#[tauri::command]
pub fn find_port_process(port: u16, state: SystemState<'_>) -> Result<Vec<crate::services::system_service::PortProcessInfo>, String> {
    let service = state.lock().unwrap();
    service.find_port_process(port)
}

#[tauri::command]
pub fn kill_process_by_pid(pid: u32, state: SystemState<'_>) -> Result<(), String> {
    let service = state.lock().unwrap();
    service.kill_process_by_pid(pid)
}

#[tauri::command]
pub fn read_directory_tree(dir_path: String, skip_dirs: Vec<String>, max_depth: u32, state: SystemState<'_>) -> Result<String, String> {
    let service = state.lock().unwrap();
    service.read_directory_tree(&dir_path, skip_dirs, max_depth)
}

