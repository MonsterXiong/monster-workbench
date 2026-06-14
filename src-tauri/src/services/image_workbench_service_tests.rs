use super::*;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn make_temp_root(name: &str) -> PathBuf {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be available")
        .as_nanos();
    let root = std::env::temp_dir().join(format!("monster-iw-service-{name}-{stamp}"));
    fs::create_dir_all(&root).expect("temp root should create");
    root
}

fn test_service(name: &str) -> (ImageWorkbenchService, PathBuf) {
    let app_dir = make_temp_root(name);
    let db_path = app_dir.join("monster_workbench.db");
    let service = ImageWorkbenchService::new(PathProvider::new_for_test(app_dir.clone(), db_path));
    (service, app_dir)
}

fn create_single_task(service: &ImageWorkbenchService) -> String {
    let snapshot = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "txt2img".to_string(),
            prompt: "测试图片".to_string(),
            negative_prompt: None,
            quantity: 1,
            provider_config_id: None,
            model: Some("gpt-image-2".to_string()),
            size: Some("1024x1024".to_string()),
            reference_asset_ids: Vec::new(),
            reference_asset_ids_json: None,
            source_asset_id: None,
            source_image_path: None,
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
        })
        .expect("job should create");
    snapshot.tasks[0].id.clone()
}

fn base_asset_request(task_id: String, file_path: String) -> RecordImageWorkbenchAssetRequest {
    RecordImageWorkbenchAssetRequest {
        task_id,
        file_path,
        thumbnail_path: None,
        width: Some(1024),
        height: Some(1024),
        mime_type: Some("image/png".to_string()),
        size_bytes: Some(2048),
        metadata: None,
        model_run: None,
    }
}

#[test]
fn image_workbench_service_records_generated_asset_path() {
    let (service, app_dir) = test_service("accepts-generated");
    let task_id = create_single_task(&service);
    let asset_dir = app_dir.join("ai").join("generated").join("batch");
    fs::create_dir_all(&asset_dir).expect("asset dir should create");
    let asset_path = asset_dir.join("image.png");
    fs::write(&asset_path, b"png").expect("asset should write");

    let snapshot = service
        .record_asset(base_asset_request(
            task_id,
            asset_path.to_string_lossy().to_string(),
        ))
        .expect("asset should record");

    assert_eq!(snapshot.assets.len(), 1);
    assert!(snapshot.assets[0].file_path.ends_with("image.png"));
    assert!(snapshot.assets[0]
        .file_path
        .replace('\\', "/")
        .contains("/ai/image-workbench/assets/"));
    assert!(PathBuf::from(&snapshot.assets[0].file_path).exists());
}

#[test]
fn image_workbench_service_expands_prompts_and_negative_constraints() {
    let (service, _app_dir) = test_service("prompt-expansion");
    let snapshot = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "txt2img".to_string(),
            prompt: "雨夜森林小屋".to_string(),
            negative_prompt: None,
            quantity: 2,
            provider_config_id: None,
            model: Some("gpt-image-2".to_string()),
            size: Some("1024x1024".to_string()),
            reference_asset_ids: Vec::new(),
            reference_asset_ids_json: None,
            source_asset_id: None,
            source_image_path: None,
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
        })
        .expect("job should create");

    assert!(snapshot
        .job
        .negative_prompt
        .as_deref()
        .unwrap_or_default()
        .contains("低质量"));
    assert_eq!(snapshot.tasks.len(), 2);
    assert!(snapshot.tasks[0]
        .prompt
        .as_deref()
        .unwrap_or_default()
        .contains("雨夜森林小屋"));
    assert_ne!(snapshot.tasks[0].prompt, snapshot.tasks[1].prompt);
}

#[test]
fn image_workbench_service_exports_job_folder_with_metadata() {
    let (service, app_dir) = test_service("export-job");
    let task_id = create_single_task(&service);
    let asset_dir = app_dir.join("ai").join("generated").join("export");
    fs::create_dir_all(&asset_dir).expect("asset dir should create");
    let asset_path = asset_dir.join("export-result.png");
    fs::write(&asset_path, b"png").expect("asset should write");

    let snapshot = service
        .record_asset(base_asset_request(
            task_id,
            asset_path.to_string_lossy().to_string(),
        ))
        .expect("asset should record");
    let export_path = service
        .export_job(&snapshot.job.id)
        .expect("job should export");
    let export_dir = PathBuf::from(export_path);

    assert!(export_dir.join("images").is_dir());
    assert!(export_dir.join("metadata").join("prompts.json").is_file());
    assert!(export_dir.join("metadata").join("job_info.json").is_file());
    let exported_images = fs::read_dir(export_dir.join("images"))
        .expect("images dir should read")
        .count();
    assert_eq!(exported_images, 1);
}

#[test]
fn image_workbench_service_exports_single_asset_folder_with_metadata() {
    let (service, app_dir) = test_service("export-asset");
    let task_id = create_single_task(&service);
    let asset_dir = app_dir.join("ai").join("generated").join("export-asset");
    fs::create_dir_all(&asset_dir).expect("asset dir should create");
    let asset_path = asset_dir.join("single-result.png");
    fs::write(&asset_path, b"png").expect("asset should write");

    let snapshot = service
        .record_asset(base_asset_request(
            task_id,
            asset_path.to_string_lossy().to_string(),
        ))
        .expect("asset should record");
    let export_path = service
        .export_asset(&snapshot.assets[0].id)
        .expect("asset should export");
    let export_dir = PathBuf::from(export_path);

    assert!(export_dir.join("images").is_dir());
    assert!(export_dir.join("metadata").join("prompts.json").is_file());
    assert!(export_dir
        .join("metadata")
        .join("asset_info.json")
        .is_file());
    let exported_images = fs::read_dir(export_dir.join("images"))
        .expect("images dir should read")
        .count();
    assert_eq!(exported_images, 1);
}

#[test]
fn image_workbench_service_rejects_data_url_asset_path() {
    let (service, _app_dir) = test_service("rejects-data-url");
    let task_id = create_single_task(&service);

    let error = service
        .record_asset(base_asset_request(
            task_id,
            "data:image/png;base64,abc".to_string(),
        ))
        .expect_err("data url should be rejected");

    assert!(matches!(error, AppError::Permission(_)));
}

#[test]
fn image_workbench_service_rejects_asset_path_outside_generated_root() {
    let (service, app_dir) = test_service("rejects-outside");
    let task_id = create_single_task(&service);
    let outside_path = app_dir.join("uploads").join("image.png");
    fs::create_dir_all(outside_path.parent().expect("outside parent"))
        .expect("outside parent should create");
    fs::write(&outside_path, b"png").expect("outside file should write");

    let error = service
        .record_asset(base_asset_request(
            task_id,
            outside_path.to_string_lossy().to_string(),
        ))
        .expect_err("outside path should be rejected");

    assert!(matches!(error, AppError::Permission(_)));
}

#[test]
fn image_workbench_service_sanitizes_model_run_request_json() {
    let (service, app_dir) = test_service("sanitizes-request-json");
    let task_id = create_single_task(&service);
    let asset_dir = app_dir.join("ai").join("generated");
    fs::create_dir_all(&asset_dir).expect("asset dir should create");
    let asset_path = asset_dir.join("image.png");
    fs::write(&asset_path, b"png").expect("asset should write");

    let mut request = base_asset_request(task_id, asset_path.to_string_lossy().to_string());
    request.model_run = Some(RecordImageWorkbenchModelRunInput {
        provider: Some("custom".to_string()),
        model: Some("gpt-image-2".to_string()),
        capability: Some("txt2img".to_string()),
        status: Some("succeeded".to_string()),
        latency_ms: Some(42),
        request_json: Some(r#"{"apiKey":"sk-secret","prompt":"ok"}"#.to_string()),
        response_preview: Some("Authorization: Bearer sk-preview".to_string()),
        error: None,
    });

    let snapshot = service.record_asset(request).expect("asset should record");
    let model_run = snapshot
        .model_runs
        .first()
        .expect("model run should record");
    let request_json = model_run
        .request_json
        .as_ref()
        .expect("request json should exist");
    assert!(!request_json.contains("sk-secret"));
    assert!(!model_run
        .response_preview
        .as_deref()
        .unwrap_or_default()
        .contains("sk-preview"));
}

#[test]
fn image_workbench_service_sanitizes_failed_model_run_on_status_update() {
    let (service, _app_dir) = test_service("sanitizes-failed-run");
    let task_id = create_single_task(&service);

    service
        .update_task_status(UpdateImageWorkbenchTaskStatusRequest {
            task_id: task_id.clone(),
            status: "running".to_string(),
            error: None,
            model_run: None,
        })
        .expect("task should mark running");

    let snapshot = service
        .update_task_status(UpdateImageWorkbenchTaskStatusRequest {
            task_id,
            status: "failed".to_string(),
            error: Some("provider failed".to_string()),
            model_run: Some(RecordImageWorkbenchModelRunInput {
                provider: Some("custom".to_string()),
                model: Some("gpt-image-2".to_string()),
                capability: Some("txt2img".to_string()),
                status: Some("failed".to_string()),
                latency_ms: Some(88),
                request_json: Some(r#"{"apiKey":"sk-secret","prompt":"ok"}"#.to_string()),
                response_preview: Some("Authorization: Bearer sk-preview".to_string()),
                error: Some("token=sk-error".to_string()),
            }),
        })
        .expect("failed model run should record");

    let model_run = snapshot
        .model_runs
        .first()
        .expect("model run should record");
    assert_eq!(model_run.status, "failed");
    assert!(!model_run
        .request_json
        .as_deref()
        .unwrap_or_default()
        .contains("sk-secret"));
    assert!(!model_run
        .response_preview
        .as_deref()
        .unwrap_or_default()
        .contains("sk-preview"));
    assert!(!model_run
        .error
        .as_deref()
        .unwrap_or_default()
        .contains("sk-error"));
}

#[test]
fn image_workbench_service_worker_records_txt2img_result() {
    let (service, app_dir) = test_service("worker-records-result");
    let snapshot = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "txt2img".to_string(),
            prompt: "后端 worker 测试".to_string(),
            negative_prompt: Some("低质量".to_string()),
            quantity: 1,
            provider_config_id: Some("model-config-1".to_string()),
            model: Some("gpt-image-2".to_string()),
            size: Some("1024x1024".to_string()),
            reference_asset_ids: Vec::new(),
            reference_asset_ids_json: None,
            source_asset_id: None,
            source_image_path: None,
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
        })
        .expect("job should create");
    let generated_dir = app_dir.join("ai").join("generated").join("worker");
    fs::create_dir_all(&generated_dir).expect("generated dir should create");
    let generated_path = generated_dir.join("worker-result.png");
    fs::write(&generated_path, b"png").expect("generated image should write");

    let finished = service
        .run_txt2img_tasks_with_generator(&snapshot.job.id, None, |request| {
            assert_eq!(
                request.provider_config_id.as_deref(),
                Some("model-config-1")
            );
            assert_eq!(
                request.request_id.as_deref(),
                Some(snapshot.tasks[0].id.as_str())
            );
            assert_eq!(request.capability, "txt2img");
            Ok(AiGenerationResult {
                request_id: request.request_id,
                ok: true,
                capability: "txt2img".to_string(),
                provider: "custom".to_string(),
                model: "gpt-image-2".to_string(),
                base_url: "https://mock.local/v1".to_string(),
                latency_ms: 128,
                queue_wait_ms: Some(0),
                total_latency_ms: Some(128),
                message: "ok".to_string(),
                status_code: Some(200),
                text: None,
                artifacts: vec![AiGenerationArtifact {
                    kind: "image".to_string(),
                    url: None,
                    path: Some(generated_path.to_string_lossy().to_string()),
                    mime_type: Some("image/png".to_string()),
                    size_bytes: Some(3),
                    dimensions: Some("1024x1024".to_string()),
                    duration_seconds: None,
                }],
                failure_kind: None,
                raw_preview: Some(r#"{"data":[{"url":"mock://image"}]}"#.to_string()),
            })
        })
        .expect("worker should finish");

    assert_eq!(finished.job.status, "succeeded");
    assert_eq!(finished.tasks[0].status, "succeeded");
    assert_eq!(finished.assets.len(), 1);
    assert_eq!(finished.metadata.len(), 1);
    assert_eq!(finished.model_runs.len(), 1);
    assert!(finished.assets[0]
        .file_path
        .replace('\\', "/")
        .contains("/ai/image-workbench/assets/"));
}

#[test]
fn image_workbench_service_cancel_records_model_run_audit() {
    let (service, _app_dir) = test_service("cancel-records-model-run");
    let snapshot = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "txt2img".to_string(),
            prompt: "取消审计测试".to_string(),
            negative_prompt: None,
            quantity: 1,
            provider_config_id: Some("model-config-1".to_string()),
            model: Some("gpt-image-2".to_string()),
            size: Some("1024x1024".to_string()),
            reference_asset_ids: Vec::new(),
            reference_asset_ids_json: None,
            source_asset_id: None,
            source_image_path: None,
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
        })
        .expect("job should create");

    let cancelled = service
        .cancel_job(&snapshot.job.id)
        .expect("job should cancel");

    assert_eq!(cancelled.job.status, "cancelled");
    assert_eq!(cancelled.tasks[0].status, "cancelled");
    assert_eq!(cancelled.model_runs.len(), 1);
    let model_run = &cancelled.model_runs[0];
    assert_eq!(
        model_run.task_id.as_deref(),
        Some(snapshot.tasks[0].id.as_str())
    );
    assert_eq!(model_run.status, "cancelled");
    assert_eq!(model_run.capability.as_deref(), Some("txt2img"));
    assert_eq!(model_run.model.as_deref(), Some("gpt-image-2"));
    assert!(model_run
        .error
        .as_deref()
        .unwrap_or_default()
        .contains("用户取消"));
}
