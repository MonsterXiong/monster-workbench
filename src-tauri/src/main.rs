#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]


mod services;
mod commands;

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState};

fn create_main_window(app: &AppHandle) -> tauri::Result<()> {
    WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Monster Tools")
        .inner_size(1100.0, 760.0)
        .min_inner_size(900.0, 630.0)
        .build()?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let handle = app.handle().clone();
            create_main_window(&handle)?;

            // 1. 初始化系统业务服务
            if let Ok(home_dir) = handle.path().home_dir() {
                let tools_dir = home_dir.join(".monster-tools");
                if !tools_dir.exists() {
                    let _ = std::fs::create_dir_all(&tools_dir);
                }
            }

            let system_service = services::system_service::SystemService::new(handle.clone());
            app.manage(std::sync::Mutex::new(system_service));

            // 2. 创建托盘菜单
            let quit_i = MenuItem::with_id(app.handle(), "quit", "退出应用", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app.handle(), "show", "显示窗口", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app.handle(), &[&show_i, &quit_i])?;

            // 3. 创建系统托盘
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // 拦截窗口关闭，改为隐藏
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::get_app_paths,
            commands::system::write_file_data,
            commands::system::read_file_data,
            commands::system::open_system_path,
            commands::system::control_window,
            commands::system::select_folder,
            commands::system::select_file,
            commands::system::create_directory_structure,
            commands::system::find_port_process,
            commands::system::kill_process_by_pid,
            commands::system::read_directory_tree,
            commands::system::upload_file,
            commands::system::list_uploaded_files,
            commands::system::delete_uploaded_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
