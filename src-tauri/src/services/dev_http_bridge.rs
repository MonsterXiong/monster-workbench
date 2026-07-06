use crate::infra::path::PathProvider;
use crate::services::ai_provider_types::{
    AiBusinessGenerationRequest, AiGenerationRequest, AiProviderConfig,
};
use crate::services::ai_service::AiProviderService;
use crate::services::app_service::AppService;
use crate::services::auth_service::AuthService;
use crate::services::config_service::ConfigService;
use crate::services::database_service::DatabaseService;
use crate::services::file_service::FileService;
use crate::services::image_workbench_import::ImportImageWorkbenchGeneratedAssetsRequest;
use crate::services::image_workbench_mask::SaveImageWorkbenchMaskRequest;
use crate::services::image_workbench_service::{
    CreateImageWorkbenchJobRequest, DeleteImageWorkbenchAssetsRequest,
    ExportImageWorkbenchGroupRequest, ImageWorkbenchService, QueryImageWorkbenchAssetsRequest,
    RecordImageWorkbenchAssetRequest, ReplanImageWorkbenchStoryboardGroupRequest,
    SaveImageWorkbenchTemplateRequest, SetImageWorkbenchAssetFavoriteRequest,
    SetImageWorkbenchAssetQualityIssuesRequest, SetImageWorkbenchAssetRatingRequest,
    TagImageWorkbenchAssetsGroupRequest, UpdateImageWorkbenchTaskStatusRequest,
};
use crate::services::log_service::LogService;
use crate::services::navigation_service::{NavigationItem, NavigationService, SortOrderItem};
use serde::de::DeserializeOwned;
use serde::Deserialize;
use serde_json::{json, Value};
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use tauri::AppHandle;

const DEV_BRIDGE_ADDR: &str = "127.0.0.1:1421";
const DEV_IPC_PATH: &str = "/__monster_dev_ipc";
const DEV_ASSET_PATH: &str = "/__monster_dev_asset";
const MAX_IPC_BODY_BYTES: usize = 512 * 1024;

#[derive(Clone)]
struct DevBridgeContext {
    app_handle: AppHandle,
    path_provider: PathProvider,
    worker_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DevIpcRequest {
    command: String,
    #[serde(default)]
    args: Value,
}

struct HttpRequest {
    method: String,
    target: String,
    origin: Option<String>,
    body: Vec<u8>,
}

pub fn spawn_dev_http_bridge(
    app_handle: AppHandle,
    path_provider: PathProvider,
    worker_id: String,
) {
    let context = DevBridgeContext {
        app_handle,
        path_provider,
        worker_id,
    };

    std::thread::spawn(move || {
        let listener = match TcpListener::bind(DEV_BRIDGE_ADDR) {
            Ok(listener) => listener,
            Err(error) => {
                eprintln!("[dev_http_bridge] listen skipped on {DEV_BRIDGE_ADDR}: {error}");
                return;
            }
        };
        eprintln!("[dev_http_bridge] listening on http://{DEV_BRIDGE_ADDR}");
        for stream in listener.incoming() {
            match stream {
                Ok(stream) => {
                    let request_context = context.clone();
                    std::thread::spawn(move || {
                        handle_connection(stream, request_context);
                    });
                }
                Err(error) => eprintln!("[dev_http_bridge] accept failed: {error}"),
            }
        }
    });
}

fn handle_connection(mut stream: TcpStream, context: DevBridgeContext) {
    let response = match read_http_request(&mut stream) {
        Ok(request) => route_request(request, &context),
        Err(error) => json_response(
            400,
            None,
            json!({ "ok": false, "error": format!("[ERR_DEV_BRIDGE_REQUEST] {error}") }),
        ),
    };
    let _ = stream.write_all(&response);
}

fn route_request(request: HttpRequest, context: &DevBridgeContext) -> Vec<u8> {
    if !is_allowed_origin(request.origin.as_deref()) {
        return json_response(
            403,
            request.origin.as_deref(),
            json!({ "ok": false, "error": "[ERR_DEV_BRIDGE_ORIGIN] origin is not allowed" }),
        );
    }

    if request.method == "OPTIONS" {
        return empty_response(204, request.origin.as_deref());
    }

    let path = request.target.split('?').next().unwrap_or("");
    match (request.method.as_str(), path) {
        ("POST", DEV_IPC_PATH) => handle_ipc_request(request, context),
        ("GET", DEV_ASSET_PATH) => handle_asset_request(request, context),
        _ => json_response(
            404,
            request.origin.as_deref(),
            json!({ "ok": false, "error": "[ERR_DEV_BRIDGE_ROUTE] route is not supported" }),
        ),
    }
}

fn handle_ipc_request(request: HttpRequest, context: &DevBridgeContext) -> Vec<u8> {
    let parsed = serde_json::from_slice::<DevIpcRequest>(&request.body);
    let response = parsed
        .map_err(|error| format!("[ERR_DEV_BRIDGE_JSON] {error}"))
        .and_then(|payload| dispatch_command(&payload.command, &payload.args, context));

    match response {
        Ok(value) => json_response(
            200,
            request.origin.as_deref(),
            json!({ "ok": true, "value": value }),
        ),
        Err(error) => json_response(
            200,
            request.origin.as_deref(),
            json!({ "ok": false, "error": error }),
        ),
    }
}

fn handle_asset_request(request: HttpRequest, context: &DevBridgeContext) -> Vec<u8> {
    let Some(raw_path) = query_param(&request.target, "path") else {
        return json_response(
            400,
            request.origin.as_deref(),
            json!({ "ok": false, "error": "[ERR_DEV_BRIDGE_ASSET] missing path" }),
        );
    };
    let decoded_path = percent_decode(&raw_path);
    let file_path = PathBuf::from(decoded_path);
    let app_dir = match context.path_provider.get_app_local_data_dir() {
        Ok(path) => path,
        Err(error) => {
            return json_response(
                500,
                request.origin.as_deref(),
                json!({ "ok": false, "error": format!("[ERR_DEV_BRIDGE_ASSET_ROOT] {error}") }),
            );
        }
    };
    let allowed_roots: Vec<PathBuf> = ["ai", "uploads/images"]
        .iter()
        .filter_map(|relative| app_dir.join(relative).canonicalize().ok())
        .collect();
    let canonical_path = match file_path.canonicalize() {
        Ok(path) => path,
        Err(_) => return empty_response(404, request.origin.as_deref()),
    };
    if !allowed_roots
        .iter()
        .any(|allowed_root| canonical_path.starts_with(allowed_root))
        || !is_supported_image_asset(&canonical_path)
    {
        return empty_response(403, request.origin.as_deref());
    }
    let bytes = match fs::read(&canonical_path) {
        Ok(bytes) => bytes,
        Err(_) => return empty_response(404, request.origin.as_deref()),
    };
    bytes_response(
        200,
        request.origin.as_deref(),
        content_type_for_image(&canonical_path),
        bytes,
    )
}

fn dispatch_command(
    command: &str,
    args: &Value,
    context: &DevBridgeContext,
) -> Result<Value, String> {
    match command {
        "get_app_paths" => to_value(
            AppService::new(context.app_handle.clone(), context.path_provider.clone())
                .get_local_data_dir(),
        ),
        "get_app_version" => serialized_value(
            AppService::new(context.app_handle.clone(), context.path_provider.clone())
                .get_version(),
        ),
        "check_db_status" => to_value(
            DatabaseService::new(context.app_handle.clone(), context.path_provider.clone())
                .check_status(),
        ),
        "get_preference_config" => {
            to_value(ConfigService::new(context.path_provider.clone()).get_config())
        }
        "save_preference_config" => {
            let content = string_arg(args, "content")?;
            to_value(ConfigService::new(context.path_provider.clone()).save_config(&content))
        }
        "verify_admin_password" => {
            let password = string_arg(args, "password")?;
            to_value(
                AuthService::new(context.path_provider.clone()).verify_admin_password(&password),
            )
        }

        "init_navigation_db" => {
            let db_path = string_arg(args, "dbPath")?;
            to_value(
                NavigationService::new(context.path_provider.clone()).init_navigation_db(&db_path),
            )
        }
        "get_navigation_list" => {
            let db_path = string_arg(args, "dbPath")?;
            let keyword = optional_string_arg(args, "keyword")?;
            let category = optional_string_arg(args, "category")?;
            let is_featured = optional_i32_arg(args, "isFeatured")?;
            let is_hot = optional_i32_arg(args, "isHot")?;
            let view = optional_string_arg(args, "view")?;
            let tag = optional_string_arg(args, "tag")?;
            let page = u32_arg(args, "page")?;
            let page_size = u32_arg(args, "pageSize")?;
            to_value(
                NavigationService::new(context.path_provider.clone()).get_navigation_list(
                    &db_path,
                    keyword,
                    category,
                    is_featured,
                    is_hot,
                    view,
                    tag,
                    page,
                    page_size,
                ),
            )
        }
        "add_navigation" => {
            let db_path = string_arg(args, "dbPath")?;
            let item = arg::<NavigationItem>(args, "item")?;
            to_value(
                NavigationService::new(context.path_provider.clone())
                    .add_navigation(&db_path, item),
            )
        }
        "update_navigation" => {
            let db_path = string_arg(args, "dbPath")?;
            let item = arg::<NavigationItem>(args, "item")?;
            to_value(
                NavigationService::new(context.path_provider.clone())
                    .update_navigation(&db_path, item),
            )
        }
        "batch_update_navigation" => {
            let db_path = string_arg(args, "dbPath")?;
            let items = arg::<Vec<NavigationItem>>(args, "items")?;
            to_value(
                NavigationService::new(context.path_provider.clone())
                    .batch_update_navigation(&db_path, items),
            )
        }
        "delete_navigation" => {
            let db_path = string_arg(args, "dbPath")?;
            let id = i32_arg(args, "id")?;
            to_value(
                NavigationService::new(context.path_provider.clone())
                    .delete_navigation(&db_path, id),
            )
        }
        "batch_delete_navigation" => {
            let db_path = string_arg(args, "dbPath")?;
            let ids = arg::<Vec<i32>>(args, "ids")?;
            to_value(
                NavigationService::new(context.path_provider.clone())
                    .batch_delete_navigation(&db_path, ids),
            )
        }
        "increment_navigation_clicks" => {
            let db_path = string_arg(args, "dbPath")?;
            let id = i32_arg(args, "id")?;
            to_value(
                NavigationService::new(context.path_provider.clone())
                    .increment_clicks(&db_path, id),
            )
        }
        "get_navigation_categories" => {
            let db_path = string_arg(args, "dbPath")?;
            to_value(NavigationService::new(context.path_provider.clone()).get_categories(&db_path))
        }
        "migrate_navigation_category" => {
            let db_path = string_arg(args, "dbPath")?;
            let from_cat = string_arg(args, "fromCat")?;
            let to_cat = string_arg(args, "toCat")?;
            to_value(
                NavigationService::new(context.path_provider.clone())
                    .migrate_category(&db_path, &from_cat, &to_cat),
            )
        }
        "clear_navigation_file_references" => {
            let db_path = string_arg(args, "dbPath")?;
            let rel_path = string_arg(args, "relPath")?;
            to_value(
                NavigationService::new(context.path_provider.clone())
                    .clear_file_references(&db_path, &rel_path),
            )
        }
        "check_navigation_file_references" => {
            let db_path = string_arg(args, "dbPath")?;
            let rel_path = string_arg(args, "relPath")?;
            to_value(
                NavigationService::new(context.path_provider.clone())
                    .check_file_references(&db_path, &rel_path),
            )
        }
        "save_navigation_sort_order" => {
            let db_path = string_arg(args, "dbPath")?;
            let orders = arg::<Vec<SortOrderItem>>(args, "orders")?;
            to_value(
                NavigationService::new(context.path_provider.clone())
                    .save_sort_order(&db_path, orders),
            )
        }
        "get_all_navigation_list" => {
            let db_path = string_arg(args, "dbPath")?;
            to_value(
                NavigationService::new(context.path_provider.clone())
                    .get_all_navigation_list(&db_path),
            )
        }
        "import_navigation_list" => {
            let db_path = string_arg(args, "dbPath")?;
            let items = arg::<Vec<NavigationItem>>(args, "items")?;
            to_value(
                NavigationService::new(context.path_provider.clone())
                    .import_navigation_list(&db_path, items),
            )
        }

        "list_uploaded_files" => {
            let file_type = optional_string_arg(args, "fileType")?;
            to_value(
                FileService::new(context.app_handle.clone(), context.path_provider.clone())
                    .list_uploaded_files(file_type.as_deref()),
            )
        }
        "delete_uploaded_file" => {
            let rel_path = string_arg(args, "relPath")?;
            to_value(
                FileService::new(context.app_handle.clone(), context.path_provider.clone())
                    .delete_uploaded_file(&rel_path),
            )
        }
        "write_file_data" => {
            let content = string_arg(args, "content")?;
            to_value(
                FileService::new(context.app_handle.clone(), context.path_provider.clone())
                    .write_test_file(&content),
            )
        }
        "read_file_data" => to_value(
            FileService::new(context.app_handle.clone(), context.path_provider.clone())
                .read_test_file(),
        ),
        "write_log_entry" => {
            let file_name = string_arg(args, "fileName")?;
            let line = string_arg(args, "line")?;
            to_value(LogService::new(context.path_provider.clone()).write_log(&file_name, &line))
        }
        "read_log_file" => {
            let file_name = string_arg(args, "fileName")?;
            to_value(LogService::new(context.path_provider.clone()).read_log(&file_name))
        }
        "clear_all_logs" => to_value(LogService::new(context.path_provider.clone()).clear_logs()),

        "test_ai_provider" => {
            let config = arg::<AiProviderConfig>(args, "config")?;
            let action = string_arg(args, "action")?;
            let service = AiProviderService::new(context.app_handle.clone());
            let handle = service.spawn_direct_provider_test(config, action);
            let result = tauri::async_runtime::block_on(handle)
                .map_err(|error| format!("AI provider task failed: {error}"))?;
            to_value(result)
        }
        "generate_ai_content" => {
            let request = arg::<AiGenerationRequest>(args, "request")?;
            let service = AiProviderService::new(context.app_handle.clone());
            let handle = service.spawn_direct_generation(request);
            let result = tauri::async_runtime::block_on(handle)
                .map_err(|error| format!("AI generation task failed: {error}"))?;
            to_value(result)
        }
        "generate_ai_business_content" => {
            let request = arg::<AiBusinessGenerationRequest>(args, "request")?;
            let service = AiProviderService::new(context.app_handle.clone());
            let handle = service.spawn_business_generation(request);
            let result = tauri::async_runtime::block_on(handle)
                .map_err(|error| format!("AI business generation task failed: {error}"))?;
            to_value(result)
        }
        "enqueue_ai_business_generation" => {
            let request = arg::<AiBusinessGenerationRequest>(args, "request")?;
            to_value(
                AiProviderService::new(context.app_handle.clone())
                    .enqueue_business_generation(request),
            )
        }
        "get_ai_generation_task" => {
            let request_id = string_arg(args, "requestId")?;
            to_value(
                AiProviderService::new(context.app_handle.clone()).get_generation_task(&request_id),
            )
        }
        "list_ai_generation_tasks" => {
            to_value(AiProviderService::new(context.app_handle.clone()).list_generation_tasks())
        }
        "cancel_ai_generation_task" => {
            let request_id = string_arg(args, "requestId")?;
            to_value(
                AiProviderService::new(context.app_handle.clone())
                    .cancel_generation_task(&request_id),
            )
        }
        "enqueue_ai_provider_test" => {
            let config = arg::<AiProviderConfig>(args, "config")?;
            let action = string_arg(args, "action")?;
            to_value(
                AiProviderService::new(context.app_handle.clone())
                    .enqueue_provider_test(config, action),
            )
        }
        "get_ai_provider_test_task" => {
            let request_id = string_arg(args, "requestId")?;
            to_value(
                AiProviderService::new(context.app_handle.clone())
                    .get_provider_test_task(&request_id),
            )
        }
        "list_ai_provider_test_tasks" => {
            to_value(AiProviderService::new(context.app_handle.clone()).list_provider_test_tasks())
        }
        "get_ai_provider_queue_status" => {
            to_value(AiProviderService::new(context.app_handle.clone()).get_provider_queue_status())
        }
        "cancel_ai_provider_queued_tests" => to_value(
            AiProviderService::new(context.app_handle.clone()).cancel_provider_queued_tests(),
        ),
        "cancel_ai_provider_test_task" => {
            let request_id = string_arg(args, "requestId")?;
            to_value(
                AiProviderService::new(context.app_handle.clone())
                    .cancel_provider_test_task(&request_id),
            )
        }

        "get_image_workbench_contract" => serialized_value(
            ImageWorkbenchService::new(context.path_provider.clone()).contract_summary(),
        ),
        "create_image_workbench_job" => {
            let request = arg::<CreateImageWorkbenchJobRequest>(args, "request")?;
            to_value(ImageWorkbenchService::new(context.path_provider.clone()).create_job(request))
        }
        "list_image_workbench_jobs" => {
            let limit = optional_u32_arg(args, "limit")?;
            to_value(ImageWorkbenchService::new(context.path_provider.clone()).list_jobs(limit))
        }
        "list_image_workbench_assets" => {
            let limit = optional_u32_arg(args, "limit")?;
            to_value(ImageWorkbenchService::new(context.path_provider.clone()).list_assets(limit))
        }
        "query_image_workbench_assets" => {
            let request = arg::<QueryImageWorkbenchAssetsRequest>(args, "request")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone()).query_assets(request),
            )
        }
        "list_image_workbench_groups" => {
            let job_id = string_arg(args, "jobId")?;
            to_value(ImageWorkbenchService::new(context.path_provider.clone()).list_groups(job_id))
        }
        "import_image_workbench_reference" => {
            let request = arg(args, "request")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone())
                    .import_reference_image(request),
            )
        }
        "import_image_workbench_generated_assets" => {
            let request = arg::<ImportImageWorkbenchGeneratedAssetsRequest>(args, "request")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone())
                    .import_generated_assets(request),
            )
        }
        "recover_image_workbench_interrupted_jobs" => to_value(
            ImageWorkbenchService::new(context.path_provider.clone()).recover_interrupted_jobs(),
        ),
        "get_image_workbench_job_snapshot" => {
            let job_id = string_arg(args, "jobId")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone()).get_snapshot(&job_id),
            )
        }
        "update_image_workbench_task_status" => {
            let request = arg::<UpdateImageWorkbenchTaskStatusRequest>(args, "request")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone())
                    .update_task_status(request),
            )
        }
        "start_image_workbench_job_runner" => {
            let job_id = string_arg(args, "jobId")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone()).start_job_runner(
                    context.app_handle.clone(),
                    &job_id,
                    context.worker_id.clone(),
                ),
            )
        }
        "record_image_workbench_task_asset" => {
            let request = arg::<RecordImageWorkbenchAssetRequest>(args, "request")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone()).record_asset(request),
            )
        }
        "cancel_image_workbench_job" => {
            let job_id = string_arg(args, "jobId")?;
            let service = ImageWorkbenchService::new(context.path_provider.clone());
            let snapshot = service
                .cancel_job(&job_id)
                .map_err(|error| error.to_json_string())?;
            let ai_service = AiProviderService::new(context.app_handle.clone());
            for task in &snapshot.tasks {
                let _ = ai_service.cancel_generation_task(&task.id);
            }
            serialized_value(snapshot)
        }
        "cancel_image_workbench_task" => {
            let task_id = string_arg(args, "taskId")?;
            let snapshot = ImageWorkbenchService::new(context.path_provider.clone())
                .cancel_task(&task_id)
                .map_err(|error| error.to_json_string())?;
            let _ =
                AiProviderService::new(context.app_handle.clone()).cancel_generation_task(&task_id);
            serialized_value(snapshot)
        }
        "retry_image_workbench_failed_tasks" => {
            let job_id = string_arg(args, "jobId")?;
            let service = ImageWorkbenchService::new(context.path_provider.clone());
            let snapshot = service
                .retry_failed_tasks(&job_id)
                .map_err(|error| error.to_json_string())?;
            service
                .start_job_runner(
                    context.app_handle.clone(),
                    &job_id,
                    context.worker_id.clone(),
                )
                .map_err(|error| error.to_json_string())?;
            serialized_value(snapshot)
        }
        "replan_image_workbench_storyboard_group" => {
            let request = arg::<ReplanImageWorkbenchStoryboardGroupRequest>(args, "request")?;
            let service = ImageWorkbenchService::new(context.path_provider.clone());
            let snapshot = service
                .replan_storyboard_group(request)
                .map_err(|error| error.to_json_string())?;
            service
                .start_job_runner(
                    context.app_handle.clone(),
                    &snapshot.job.id,
                    context.worker_id.clone(),
                )
                .map_err(|error| error.to_json_string())?;
            serialized_value(snapshot)
        }
        "delete_image_workbench_job" => {
            let job_id = string_arg(args, "jobId")?;
            let delete_assets = optional_bool_arg(args, "deleteAssets")?.unwrap_or(false);
            let service = ImageWorkbenchService::new(context.path_provider.clone());
            let snapshot = service
                .get_snapshot(&job_id)
                .map_err(|error| error.to_json_string())?;
            let result = service
                .delete_job(&job_id, delete_assets)
                .map_err(|error| error.to_json_string())?;
            let ai_service = AiProviderService::new(context.app_handle.clone());
            for task in snapshot.tasks.iter().filter(|task| {
                matches!(
                    task.status.as_str(),
                    "queued" | "running" | "validating" | "retrying"
                )
            }) {
                let _ = ai_service.cancel_generation_task(&task.id);
            }
            serialized_value(result)
        }
        "export_image_workbench_job" => {
            let job_id = string_arg(args, "jobId")?;
            to_value(ImageWorkbenchService::new(context.path_provider.clone()).export_job(&job_id))
        }
        "export_image_workbench_asset" => {
            let asset_id = string_arg(args, "assetId")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone()).export_asset(&asset_id),
            )
        }
        "export_image_workbench_group" => {
            let request = arg::<ExportImageWorkbenchGroupRequest>(args, "request")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone()).export_group(request),
            )
        }
        "delete_image_workbench_assets" => {
            let request = arg::<DeleteImageWorkbenchAssetsRequest>(args, "request")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone()).delete_assets(request),
            )
        }
        "tag_image_workbench_assets_group" => {
            let request = arg::<TagImageWorkbenchAssetsGroupRequest>(args, "request")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone()).tag_assets_group(request),
            )
        }
        "cleanup_image_workbench_deleted_assets" => to_value(
            ImageWorkbenchService::new(context.path_provider.clone()).cleanup_deleted_job_assets(),
        ),
        "cleanup_image_workbench_invalid_assets" => to_value(
            ImageWorkbenchService::new(context.path_provider.clone()).cleanup_invalid_assets(),
        ),
        "save_image_workbench_mask" => {
            let request = arg::<SaveImageWorkbenchMaskRequest>(args, "request")?;
            to_value(ImageWorkbenchService::new(context.path_provider.clone()).save_mask(request))
        }
        "set_image_workbench_asset_favorite" => {
            let request = arg::<SetImageWorkbenchAssetFavoriteRequest>(args, "request")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone())
                    .set_asset_favorite(request),
            )
        }
        "set_image_workbench_asset_rating" => {
            let request = arg::<SetImageWorkbenchAssetRatingRequest>(args, "request")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone()).set_asset_rating(request),
            )
        }
        "set_image_workbench_asset_quality_issues" => {
            let request = arg::<SetImageWorkbenchAssetQualityIssuesRequest>(args, "request")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone())
                    .set_asset_quality_issues(request),
            )
        }
        "list_image_workbench_templates" => {
            to_value(ImageWorkbenchService::new(context.path_provider.clone()).list_templates())
        }
        "save_image_workbench_template" => {
            let request = arg::<SaveImageWorkbenchTemplateRequest>(args, "request")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone()).save_template(request),
            )
        }
        "delete_image_workbench_template" => {
            let template_id = string_arg(args, "templateId")?;
            to_value(
                ImageWorkbenchService::new(context.path_provider.clone())
                    .delete_template(&template_id),
            )
        }
        _ => Err(format!(
            "[ERR_DEV_BRIDGE_COMMAND] command is not allowed: {command}"
        )),
    }
}

fn to_value<T, E>(result: Result<T, E>) -> Result<Value, String>
where
    T: serde::Serialize,
    E: ToString,
{
    result
        .map_err(|error| error.to_string())
        .and_then(|value| serde_json::to_value(value).map_err(|error| error.to_string()))
}

fn serialized_value<T: serde::Serialize>(value: T) -> Result<Value, String> {
    serde_json::to_value(value).map_err(|error| error.to_string())
}

fn arg<T: DeserializeOwned>(args: &Value, key: &str) -> Result<T, String> {
    let value = args
        .get(key)
        .cloned()
        .ok_or_else(|| format!("[ERR_DEV_BRIDGE_ARGS] missing argument: {key}"))?;
    serde_json::from_value(value)
        .map_err(|error| format!("[ERR_DEV_BRIDGE_ARGS] invalid argument {key}: {error}"))
}

fn string_arg(args: &Value, key: &str) -> Result<String, String> {
    args.get(key)
        .and_then(Value::as_str)
        .map(ToString::to_string)
        .ok_or_else(|| format!("[ERR_DEV_BRIDGE_ARGS] missing string argument: {key}"))
}

fn optional_string_arg(args: &Value, key: &str) -> Result<Option<String>, String> {
    match args.get(key) {
        None | Some(Value::Null) => Ok(None),
        Some(value) => value
            .as_str()
            .map(|text| Some(text.to_string()))
            .ok_or_else(|| format!("[ERR_DEV_BRIDGE_ARGS] invalid string argument: {key}")),
    }
}

fn u32_arg(args: &Value, key: &str) -> Result<u32, String> {
    args.get(key)
        .and_then(Value::as_u64)
        .and_then(|number| u32::try_from(number).ok())
        .ok_or_else(|| format!("[ERR_DEV_BRIDGE_ARGS] missing u32 argument: {key}"))
}

fn i32_arg(args: &Value, key: &str) -> Result<i32, String> {
    args.get(key)
        .and_then(Value::as_i64)
        .and_then(|number| i32::try_from(number).ok())
        .ok_or_else(|| format!("[ERR_DEV_BRIDGE_ARGS] missing i32 argument: {key}"))
}

fn optional_i32_arg(args: &Value, key: &str) -> Result<Option<i32>, String> {
    match args.get(key) {
        None | Some(Value::Null) => Ok(None),
        Some(value) => value
            .as_i64()
            .and_then(|number| i32::try_from(number).ok())
            .map(Some)
            .ok_or_else(|| format!("[ERR_DEV_BRIDGE_ARGS] invalid i32 argument: {key}")),
    }
}

fn optional_u32_arg(args: &Value, key: &str) -> Result<Option<u32>, String> {
    match args.get(key) {
        None | Some(Value::Null) => Ok(None),
        Some(value) => value
            .as_u64()
            .and_then(|number| u32::try_from(number).ok())
            .map(Some)
            .ok_or_else(|| format!("[ERR_DEV_BRIDGE_ARGS] invalid u32 argument: {key}")),
    }
}

fn optional_bool_arg(args: &Value, key: &str) -> Result<Option<bool>, String> {
    match args.get(key) {
        None | Some(Value::Null) => Ok(None),
        Some(value) => value
            .as_bool()
            .map(Some)
            .ok_or_else(|| format!("[ERR_DEV_BRIDGE_ARGS] invalid bool argument: {key}")),
    }
}

fn read_http_request(stream: &mut TcpStream) -> Result<HttpRequest, String> {
    let mut buffer = Vec::new();
    let mut chunk = [0_u8; 4096];
    let header_end;
    loop {
        let read = stream.read(&mut chunk).map_err(|error| error.to_string())?;
        if read == 0 {
            return Err("connection closed before headers".to_string());
        }
        buffer.extend_from_slice(&chunk[..read]);
        if buffer.len() > MAX_IPC_BODY_BYTES {
            return Err("request is too large".to_string());
        }
        if let Some(index) = find_header_end(&buffer) {
            header_end = index;
            break;
        }
    }

    let headers_text = String::from_utf8_lossy(&buffer[..header_end]).to_string();
    let mut lines = headers_text.split("\r\n");
    let request_line = lines
        .next()
        .ok_or_else(|| "missing request line".to_string())?;
    let mut request_parts = request_line.split_whitespace();
    let method = request_parts
        .next()
        .ok_or_else(|| "missing method".to_string())?
        .to_string();
    let target = request_parts
        .next()
        .ok_or_else(|| "missing target".to_string())?
        .to_string();

    let mut content_length = 0_usize;
    let mut origin = None;
    for line in lines {
        let Some((name, value)) = line.split_once(':') else {
            continue;
        };
        let name = name.trim().to_ascii_lowercase();
        let value = value.trim();
        if name == "content-length" {
            content_length = value
                .parse::<usize>()
                .map_err(|_| "invalid content-length".to_string())?;
            if content_length > MAX_IPC_BODY_BYTES {
                return Err("request body is too large".to_string());
            }
        } else if name == "origin" {
            origin = Some(value.to_string());
        }
    }

    let body_start = header_end + 4;
    while buffer.len() < body_start + content_length {
        let read = stream.read(&mut chunk).map_err(|error| error.to_string())?;
        if read == 0 {
            return Err("connection closed before body".to_string());
        }
        buffer.extend_from_slice(&chunk[..read]);
        if buffer.len() > body_start + MAX_IPC_BODY_BYTES {
            return Err("request body is too large".to_string());
        }
    }

    Ok(HttpRequest {
        method,
        target,
        origin,
        body: buffer[body_start..body_start + content_length].to_vec(),
    })
}

fn find_header_end(buffer: &[u8]) -> Option<usize> {
    buffer.windows(4).position(|window| window == b"\r\n\r\n")
}

fn is_allowed_origin(origin: Option<&str>) -> bool {
    match origin {
        None => true,
        Some("http://localhost:1420") | Some("http://127.0.0.1:1420") => true,
        _ => false,
    }
}

fn cors_headers(origin: Option<&str>) -> String {
    let allow_origin = if is_allowed_origin(origin) {
        origin.unwrap_or("http://localhost:1420")
    } else {
        "http://localhost:1420"
    };
    format!(
        "Access-Control-Allow-Origin: {allow_origin}\r\n\
         Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n\
         Access-Control-Allow-Headers: content-type, x-monster-dev-bridge\r\n\
         Access-Control-Max-Age: 600\r\n\
         Vary: Origin\r\n"
    )
}

fn empty_response(status: u16, origin: Option<&str>) -> Vec<u8> {
    let status_text = status_text(status);
    format!(
        "HTTP/1.1 {status} {status_text}\r\n{}Content-Length: 0\r\nConnection: close\r\n\r\n",
        cors_headers(origin)
    )
    .into_bytes()
}

fn json_response(status: u16, origin: Option<&str>, value: Value) -> Vec<u8> {
    let body = serde_json::to_vec(&value).unwrap_or_else(|_| b"{\"ok\":false}".to_vec());
    bytes_response(status, origin, "application/json; charset=utf-8", body)
}

fn bytes_response(status: u16, origin: Option<&str>, content_type: &str, body: Vec<u8>) -> Vec<u8> {
    let status_text = status_text(status);
    let mut response = format!(
        "HTTP/1.1 {status} {status_text}\r\n{}Content-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
        cors_headers(origin),
        body.len()
    )
    .into_bytes();
    response.extend_from_slice(&body);
    response
}

fn status_text(status: u16) -> &'static str {
    match status {
        200 => "OK",
        204 => "No Content",
        400 => "Bad Request",
        403 => "Forbidden",
        404 => "Not Found",
        500 => "Internal Server Error",
        _ => "OK",
    }
}

fn query_param(target: &str, key: &str) -> Option<String> {
    let query = target.split_once('?')?.1;
    for pair in query.split('&') {
        let (name, value) = pair.split_once('=').unwrap_or((pair, ""));
        if percent_decode(name) == key {
            return Some(value.to_string());
        }
    }
    None
}

fn percent_decode(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut result = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        match bytes[index] {
            b'%' if index + 2 < bytes.len() => {
                let hex = &value[index + 1..index + 3];
                if let Ok(byte) = u8::from_str_radix(hex, 16) {
                    result.push(byte);
                    index += 3;
                    continue;
                }
                result.push(bytes[index]);
                index += 1;
            }
            b'+' => {
                result.push(b' ');
                index += 1;
            }
            byte => {
                result.push(byte);
                index += 1;
            }
        }
    }
    String::from_utf8_lossy(&result).to_string()
}

fn is_supported_image_asset(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| extension.to_ascii_lowercase())
            .as_deref(),
        Some("png" | "jpg" | "jpeg" | "webp" | "gif" | "bmp" | "svg")
    )
}

fn content_type_for_image(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase())
        .as_deref()
    {
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("gif") => "image/gif",
        Some("bmp") => "image/bmp",
        Some("svg") => "image/svg+xml",
        _ => "image/png",
    }
}
