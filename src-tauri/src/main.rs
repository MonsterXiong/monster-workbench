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
use services::config_service::ConfigService;
use services::database_service::DatabaseService;
use services::file_service::FileService;
use services::image_workbench_service::ImageWorkbenchService;
use services::log_service::LogService;
use services::navigation_service::NavigationService;
use services::runtime_janitor::{spawn_runtime_janitor, WorkerIdentity};
use services::system_service::SystemService;
use services::task_service::TaskService;

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
            let task_service = TaskService::new(handle.clone());
            let auth_service = AuthService::new(path_provider.clone());
            let database_service = DatabaseService::new(handle.clone(), path_provider.clone());
            let log_service = LogService::new(path_provider.clone());
            let system_service = SystemService::new(handle.clone(), path_provider.clone());
            let navigation_service = NavigationService::new(path_provider.clone());
            let ai_provider_service = AiProviderService::new(handle.clone());
            let image_workbench_service = ImageWorkbenchService::new(path_provider.clone());

            // 初始化运行时数据库表，具体 DB/Repo 细节保持在 Service 层内。
            database_service.init_runtime_schema()?;

            // worker_id 在进程启动时生成，全程不变；重启即换。janitor 据此区分跨进程残留。
            let worker_identity = WorkerIdentity::new();

            // 启动 runtime janitor：立即跑一次替代旧的 startup 硬重置（worker_id 是新的，
            // 上次进程的 running 全部会被识别为"跨进程残留"回收），随后每 30s 巡检一次。
            spawn_runtime_janitor(handle.clone(), worker_identity.worker_id.clone());

            // 通用 AI 业务生成任务使用持久 job 恢复，避免 Chat/Image 刷新或重启后 requestId 丢失。
            let _ = ai_provider_service.resume_persisted_business_generations();

            // 应用级恢复图片工作台未完成任务，后续由 DB 领取/租约防止重复 runner 抢同一任务。
            if image_workbench_service
                .recover_interrupted_jobs()
                .map(|count| count > 0)
                .unwrap_or(false)
            {
                if let Ok(jobs) = image_workbench_service.list_jobs(Some(100)) {
                    for job in jobs.iter().filter(|job| {
                        matches!(job.status.as_str(), "queued" | "running" | "validating")
                    }) {
                        let _ = image_workbench_service.start_job_runner(
                            handle.clone(),
                            &job.id,
                            worker_identity.worker_id.clone(),
                        );
                    }
                }
            }

            // 2. 状态依赖管理注入
            app.manage(std::sync::Mutex::new(app_service));
            app.manage(std::sync::Mutex::new(config_service));
            app.manage(std::sync::Mutex::new(file_service));
            app.manage(std::sync::Mutex::new(task_service));
            app.manage(std::sync::Mutex::new(auth_service));
            app.manage(std::sync::Mutex::new(database_service));
            app.manage(std::sync::Mutex::new(log_service));
            app.manage(std::sync::Mutex::new(system_service));
            app.manage(std::sync::Mutex::new(navigation_service));
            app.manage(std::sync::Mutex::new(ai_provider_service));
            app.manage(std::sync::Mutex::new(image_workbench_service));
            app.manage(worker_identity);

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
            commands::navigation::batch_update_navigation,
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
            commands::ai::generate_ai_content,
            commands::ai::generate_ai_business_content,
            commands::ai::enqueue_ai_business_generation,
            commands::ai::get_ai_generation_task,
            commands::ai::list_ai_generation_tasks,
            commands::ai::cancel_ai_generation_task,
            commands::ai::enqueue_ai_provider_test,
            commands::ai::get_ai_provider_test_task,
            commands::ai::list_ai_provider_test_tasks,
            commands::ai::get_ai_provider_queue_status,
            commands::ai::cancel_ai_provider_queued_tests,
            commands::ai::cancel_ai_provider_test_task,
            commands::image_workbench::get_image_workbench_contract,
            commands::image_workbench::create_image_workbench_job,
            commands::image_workbench::list_image_workbench_jobs,
            commands::image_workbench::list_image_workbench_assets,
            commands::image_workbench::query_image_workbench_assets,
            commands::image_workbench::list_image_workbench_groups,
            commands::image_workbench::import_image_workbench_reference,
            commands::image_workbench::import_image_workbench_generated_assets,
            commands::image_workbench::get_image_workbench_job_snapshot,
            commands::image_workbench::update_image_workbench_task_status,
            commands::image_workbench::start_image_workbench_job_runner,
            commands::image_workbench::cancel_image_workbench_job,
            commands::image_workbench::cancel_image_workbench_task,
            commands::image_workbench::retry_image_workbench_failed_tasks,
            commands::image_workbench::replan_image_workbench_storyboard_group,
            commands::image_workbench::recover_image_workbench_interrupted_jobs,
            commands::image_workbench::delete_image_workbench_job,
            commands::image_workbench::export_image_workbench_job,
            commands::image_workbench::export_image_workbench_asset,
            commands::image_workbench::export_image_workbench_group,
            commands::image_workbench::delete_image_workbench_assets,
            commands::image_workbench::tag_image_workbench_assets_group,
            commands::image_workbench::cleanup_image_workbench_deleted_assets,
            commands::image_workbench::cleanup_image_workbench_invalid_assets,
            commands::image_workbench::save_image_workbench_mask,
            commands::image_workbench::record_image_workbench_task_asset,
            commands::image_workbench::set_image_workbench_asset_favorite,
            commands::image_workbench::set_image_workbench_asset_rating,
            commands::image_workbench::set_image_workbench_asset_quality_issues,
            commands::image_workbench::list_image_workbench_templates,
            commands::image_workbench::save_image_workbench_template,
            commands::image_workbench::delete_image_workbench_template,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
