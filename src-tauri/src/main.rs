#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod infra;
mod services;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use infra::path::PathProvider;

use services::ai_service::AiProviderService;
use services::app_service::AppService;
use services::auth_service::AuthService;
use services::batch_job_service::BatchJobService;
use services::config_service::ConfigService;
use services::database_service::DatabaseService;
use services::file_service::FileService;
use services::goal_service::GoalService;
use services::log_service::LogService;
use services::navigation_service::NavigationService;
use services::sidecar_lifecycle_service::SidecarLifecycleService;
use services::system_service::SystemService;
use services::task_service::TaskService;
use services::worker_queue_service::WorkerQueueService;

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
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            create_main_window(&handle)?;

            // 1. 初始化系统业务服务与底座基础能力
            let path_provider = PathProvider::new(handle.clone());

            // 确保本地配置与日志沙箱目录存在
            if let Ok(home_dir) = path_provider.get_app_local_data_dir() {
                if !home_dir.exists() {
                    let _ = std::fs::create_dir_all(&home_dir);
                }
            }

            let app_service = AppService::new(handle.clone(), path_provider.clone());
            let config_service = ConfigService::new(path_provider.clone());
            let file_service = FileService::new(handle.clone(), path_provider.clone());
            let task_service = TaskService::new(handle.clone(), path_provider.clone());
            let auth_service = AuthService::new(path_provider.clone());
            let batch_job_service = BatchJobService::new(handle.clone(), path_provider.clone());
            let database_service = DatabaseService::new(handle.clone(), path_provider.clone());
            let goal_service = GoalService::new(path_provider.clone());
            let log_service = LogService::new(path_provider.clone());
            let system_service = SystemService::new(handle.clone(), path_provider.clone());
            let navigation_service = NavigationService::new(path_provider.clone());
            let ai_provider_service = AiProviderService::new(handle.clone());
            let sidecar_lifecycle_service = SidecarLifecycleService::new(handle.clone());
            let worker_queue_service = WorkerQueueService::new(path_provider.clone());

            // 初始化运行时数据库表，具体 DB/Repo 细节保持在 Service 层内。
            let _ = database_service.init_runtime_schema();

            // 2. 状态依赖管理注入
            app.manage(std::sync::Mutex::new(app_service));
            app.manage(std::sync::Mutex::new(config_service));
            app.manage(std::sync::Mutex::new(file_service));
            app.manage(std::sync::Mutex::new(task_service));
            app.manage(std::sync::Mutex::new(auth_service));
            app.manage(std::sync::Mutex::new(batch_job_service));
            app.manage(std::sync::Mutex::new(database_service));
            app.manage(std::sync::Mutex::new(goal_service));
            app.manage(std::sync::Mutex::new(log_service));
            app.manage(std::sync::Mutex::new(system_service));
            app.manage(std::sync::Mutex::new(navigation_service));
            app.manage(std::sync::Mutex::new(ai_provider_service));
            app.manage(std::sync::Mutex::new(sidecar_lifecycle_service));
            app.manage(std::sync::Mutex::new(worker_queue_service));

            // 3. 创建托盘菜单
            let quit_i = MenuItem::with_id(app.handle(), "quit", "退出应用", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app.handle(), "show", "显示窗口", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app.handle(), &[&show_i, &quit_i])?;

            // 4. 创建系统托盘
            let mut tray_builder = TrayIconBuilder::new();
            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }
            let _tray = tray_builder
                .menu(&tray_menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        let sidecar_state: tauri::State<
                            '_,
                            std::sync::Mutex<SidecarLifecycleService>,
                        > = app.state();
                        let mut sidecar_service =
                            sidecar_state.lock().unwrap_or_else(|e| e.into_inner());
                        sidecar_service.shutdown_reserved();
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
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
            commands::app::get_app_paths,
            commands::app::get_app_version,
            commands::file::select_folder,
            commands::file::select_file,
            commands::file::upload_file,
            commands::file::list_uploaded_files,
            commands::file::delete_uploaded_file,
            commands::file::write_file_data,
            commands::file::read_file_data,
            commands::file::create_directory_structure,
            commands::file::read_directory_tree,
            commands::config::get_preference_config,
            commands::config::save_preference_config,
            commands::database::export_database,
            commands::database::import_database,
            commands::database::reset_database,
            commands::database::check_db_status,
            commands::creative_goal::create_creative_goal,
            commands::creative_goal::list_creative_goals,
            commands::creative_batch::create_batch_image_job,
            commands::creative_batch::list_batch_jobs,
            commands::creative_batch::get_batch_job,
            commands::creative_batch::start_batch_job,
            commands::creative_batch::pause_batch_job,
            commands::creative_batch::resume_batch_job,
            commands::creative_batch::cancel_batch_job,
            commands::creative_batch::list_batch_job_tasks,
            commands::creative_goal::create_goal_multi_agent_stub,
            commands::creative_goal::get_goal_status,
            commands::creative_goal::stop_creative_goal,
            commands::creative_task::create_creative_task,
            commands::creative_task::get_creative_task,
            commands::creative_task::list_creative_tasks,
            commands::creative_task::update_creative_task_status,
            commands::creative_task::append_task_event,
            commands::creative_task::create_creative_asset,
            commands::creative_task::list_creative_assets,
            commands::creative_task::create_asset_link,
            commands::creative_task::list_asset_links,
            commands::creative_sidecar::get_sidecar_status,
            commands::creative_sidecar::start_sidecar_dev_health_server,
            commands::creative_sidecar::check_sidecar_health,
            commands::creative_sidecar::stop_sidecar_dev_health_server,
            commands::creative_task::run_generate_image_prompt_workflow,
            commands::creative_task::run_review_asset_quality_stub,
            commands::worker_queue::claim_next_creative_task,
            commands::worker_queue::request_creative_task_cancel,
            commands::worker_queue::check_task_cancel_checkpoint,
            commands::worker_queue::recover_interrupted_creative_tasks,
            commands::auth::verify_admin_password,
            commands::updater::trigger_update_download,
            commands::system::open_system_path,
            commands::system::control_window,
            commands::system::find_port_process,
            commands::system::find_process_by_name,
            commands::system::kill_process_by_pid,
            commands::system::kill_process_by_name,
            commands::system::is_process_running,
            commands::system::write_text_file,
            commands::system::read_text_file,
            commands::system::write_log_entry,
            commands::system::read_log_file,
            commands::system::clear_all_logs,
            commands::system::export_log_file,
            commands::system::export_system_diagnostics,
            commands::navigation::init_navigation_db,
            commands::navigation::get_navigation_list,
            commands::navigation::add_navigation,
            commands::navigation::update_navigation,
            commands::navigation::delete_navigation,
            commands::navigation::batch_delete_navigation,
            commands::navigation::increment_navigation_clicks,
            commands::navigation::get_navigation_categories,
            commands::navigation::migrate_navigation_category,
            commands::navigation::clear_navigation_file_references,
            commands::navigation::check_navigation_file_references,
            commands::navigation::save_navigation_sort_order,
            commands::navigation::get_all_navigation_list,
            commands::navigation::import_navigation_list,
            commands::ai::test_ai_provider,
            commands::ai::enqueue_ai_provider_test,
            commands::ai::get_ai_provider_test_task,
            commands::ai::list_ai_provider_test_tasks,
            commands::ai::get_ai_provider_queue_status,
            commands::ai::cancel_ai_provider_queued_tests,
            commands::ai::cancel_ai_provider_test_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
