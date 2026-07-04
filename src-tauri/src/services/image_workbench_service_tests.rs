use super::*;
use crate::services::image_workbench_mask::{
    ImageWorkbenchMaskPointInput, ImageWorkbenchMaskStrokeInput,
};
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

#[test]
fn image_workbench_service_cancel_task_only_stops_selected_task() {
    let (service, _app_dir) = test_service("cancel-single-task");
    let snapshot = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "txt2img".to_string(),
            prompt: "cancel one task".to_string(),
            negative_prompt: None,
            quantity: 2,
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
            generation_options_json: None,
        })
        .expect("job should create");
    let cancelled_task_id = snapshot.tasks[0].id.clone();
    let remaining_task_id = snapshot.tasks[1].id.clone();

    let cancelled = service
        .cancel_task(&cancelled_task_id)
        .expect("task should cancel");

    let cancelled_task = cancelled
        .tasks
        .iter()
        .find(|task| task.id == cancelled_task_id)
        .expect("cancelled task should exist");
    let remaining_task = cancelled
        .tasks
        .iter()
        .find(|task| task.id == remaining_task_id)
        .expect("remaining task should exist");

    assert_eq!(cancelled.job.status, "queued");
    assert_eq!(cancelled_task.status, "cancelled");
    assert_eq!(cancelled_task.failure_type.as_deref(), Some("cancelled"));
    assert_eq!(remaining_task.status, "queued");
    assert_eq!(cancelled.model_runs.len(), 1);
    assert_eq!(
        cancelled.model_runs[0].task_id.as_deref(),
        Some(cancelled_task_id.as_str())
    );
    assert_eq!(cancelled.model_runs[0].status, "cancelled");
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
            generation_options_json: None,
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
    assert!(!snapshot.assets[0].file_path.starts_with("\\\\?\\"));
    assert!(snapshot.assets[0]
        .file_path
        .replace('\\', "/")
        .contains("/ai/image-workbench/assets/"));
    assert!(PathBuf::from(&snapshot.assets[0].file_path).exists());
    assert_eq!(snapshot.assets[0].integrity_status, "ok");
}

#[test]
fn image_workbench_service_saves_inpaint_mask_as_png_with_asset_dimensions() {
    let (service, app_dir) = test_service("mask-png");
    let task_id = create_single_task(&service);
    let asset_dir = app_dir.join("ai").join("generated").join("mask-source");
    fs::create_dir_all(&asset_dir).expect("asset dir should create");
    let asset_path = asset_dir.join("image.png");
    fs::write(&asset_path, b"png").expect("asset should write");
    let mut request = base_asset_request(task_id, asset_path.to_string_lossy().to_string());
    request.width = Some(640);
    request.height = Some(480);
    let snapshot = service.record_asset(request).expect("asset should record");

    let result = service
        .save_mask(SaveImageWorkbenchMaskRequest {
            asset_id: snapshot.assets[0].id.clone(),
            width: 320,
            height: 240,
            strokes: vec![ImageWorkbenchMaskStrokeInput {
                tool: "paint".to_string(),
                brush_size: 24.0,
                points: vec![
                    ImageWorkbenchMaskPointInput { x: 10.0, y: 20.0 },
                    ImageWorkbenchMaskPointInput { x: 80.0, y: 60.0 },
                ],
            }],
        })
        .expect("mask should save");

    assert!(result.mask_path.ends_with(".png"));
    assert_eq!(result.width, 640);
    assert_eq!(result.height, 480);
    let png = fs::read(result.mask_path).expect("mask png should read");
    assert!(png.starts_with(b"\x89PNG\r\n\x1a\n"));
    assert_eq!(&png[16..20], &640u32.to_be_bytes());
    assert_eq!(&png[20..24], &480u32.to_be_bytes());
}

#[test]
fn image_workbench_worker_records_inpaint_result_with_workbench_mask_path() {
    let (service, app_dir) = test_service("inpaint-mask-metadata");
    let task_id = create_single_task(&service);
    let source_dir = app_dir.join("ai").join("generated").join("inpaint-source");
    fs::create_dir_all(&source_dir).expect("source dir should create");
    let source_path = source_dir.join("source.png");
    fs::write(&source_path, b"source").expect("source image should write");
    let mut source_request = base_asset_request(task_id, source_path.to_string_lossy().to_string());
    source_request.width = Some(640);
    source_request.height = Some(480);
    let source_snapshot = service
        .record_asset(source_request)
        .expect("source asset should record");
    let source_asset = source_snapshot.assets[0].clone();
    let mask = service
        .save_mask(SaveImageWorkbenchMaskRequest {
            asset_id: source_asset.id.clone(),
            width: 640,
            height: 480,
            strokes: vec![ImageWorkbenchMaskStrokeInput {
                tool: "paint".to_string(),
                brush_size: 24.0,
                points: vec![
                    ImageWorkbenchMaskPointInput { x: 10.0, y: 20.0 },
                    ImageWorkbenchMaskPointInput { x: 80.0, y: 60.0 },
                ],
            }],
        })
        .expect("mask should save");

    let job = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "inpaint".to_string(),
            prompt: "fix hand".to_string(),
            negative_prompt: None,
            quantity: 1,
            provider_config_id: Some("model-config-1".to_string()),
            model: Some("gpt-image-2".to_string()),
            size: Some("1152x2048".to_string()),
            reference_asset_ids: vec![source_asset.id.clone()],
            reference_asset_ids_json: None,
            source_asset_id: Some(source_asset.id.clone()),
            source_image_path: Some(source_asset.file_path.clone()),
            mask_path: Some(mask.mask_path.clone()),
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
            generation_options_json: None,
        })
        .expect("inpaint job should create");
    let output_dir = app_dir.join("ai").join("generated").join("inpaint-output");
    fs::create_dir_all(&output_dir).expect("output dir should create");
    let output_path = output_dir.join("fixed.png");
    fs::write(&output_path, b"fixed").expect("output image should write");

    let finished = service
        .run_image_tasks_with_generator(&job.job.id, None, None, |request| {
            assert_eq!(
                request.options.mask_path.as_deref(),
                Some(mask.mask_path.as_str())
            );
            assert_eq!(request.options.size.as_deref(), Some("640x480"));
            Ok(AiGenerationResult {
                request_id: request.request_id,
                ok: true,
                capability: "inpaint".to_string(),
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
                    path: Some(output_path.to_string_lossy().to_string()),
                    mime_type: Some("image/png".to_string()),
                    size_bytes: Some(5),
                    dimensions: Some("640x480".to_string()),
                    duration_seconds: None,
                }],
                failure_kind: None,
                raw_preview: None,
            })
        })
        .expect("worker should finish");

    assert_eq!(finished.job.status, "succeeded");
    assert_eq!(finished.tasks[0].status, "succeeded");
    assert_eq!(finished.assets.len(), 1);
    let generated_asset = finished
        .assets
        .iter()
        .find(|asset| asset.task_id == finished.tasks[0].id)
        .expect("generated asset should exist");
    let metadata = finished
        .metadata
        .iter()
        .find(|item| item.asset_id == generated_asset.id)
        .expect("generated metadata should exist");
    let mask_path = metadata
        .mask_path
        .as_deref()
        .expect("mask path should persist");
    assert!(mask_path
        .replace('\\', "/")
        .contains("/ai/image-workbench/masks/"));
    assert!(PathBuf::from(mask_path).is_file());
}

#[test]
fn image_workbench_service_marks_missing_asset_on_read() {
    let (service, app_dir) = test_service("missing-asset");
    let task_id = create_single_task(&service);
    let asset_dir = app_dir.join("ai").join("generated").join("missing");
    fs::create_dir_all(&asset_dir).expect("asset dir should create");
    let asset_path = asset_dir.join("image.png");
    fs::write(&asset_path, b"png").expect("asset should write");

    let snapshot = service
        .record_asset(base_asset_request(
            task_id,
            asset_path.to_string_lossy().to_string(),
        ))
        .expect("asset should record");
    let persisted_path = PathBuf::from(&snapshot.assets[0].file_path);
    fs::remove_file(&persisted_path).expect("persisted asset should delete");

    let refreshed = service
        .get_snapshot(&snapshot.job.id)
        .expect("snapshot should refresh integrity");
    assert_eq!(refreshed.assets[0].integrity_status, "missing");
    assert_eq!(
        refreshed.assets[0].integrity_error.as_deref(),
        Some("资产文件不存在")
    );
    assert!(refreshed.assets[0].integrity_checked_at_ms.is_some());
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
            generation_options_json: None,
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
fn image_workbench_service_adds_hand_negative_constraints() {
    let (service, _app_dir) = test_service("hand-negative-constraints");
    let snapshot = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "img2img".to_string(),
            prompt: "人物拿着道具".to_string(),
            negative_prompt: None,
            quantity: 1,
            provider_config_id: None,
            model: Some("gpt-image-2".to_string()),
            size: Some("1024x1024".to_string()),
            reference_asset_ids: vec!["asset-1".to_string()],
            reference_asset_ids_json: None,
            source_asset_id: None,
            source_image_path: None,
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
            generation_options_json: None,
        })
        .expect("img2img job should create");

    let negative_prompt = snapshot.job.negative_prompt.unwrap_or_default();
    assert!(negative_prompt.contains("融合手部"));
    assert!(negative_prompt.contains("错误握持"));
    assert!(snapshot.tasks[0]
        .prompt
        .as_deref()
        .unwrap_or_default()
        .contains("手部结构自然"));
}

#[test]
fn image_workbench_service_allows_quantity_above_legacy_limit() {
    let (service, _app_dir) = test_service("quantity-above-legacy-limit");
    let contract = service.contract_summary();
    assert_eq!(contract.max_quantity, None);

    let snapshot = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "txt2img".to_string(),
            prompt: "批量生成测试".to_string(),
            negative_prompt: None,
            quantity: 17,
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
            generation_options_json: None,
        })
        .expect("quantity above old UI limit should create");

    assert_eq!(snapshot.job.quantity, 17);
    assert_eq!(snapshot.tasks.len(), 17);
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
fn image_workbench_service_cleans_deleted_job_asset_files() {
    let (service, app_dir) = test_service("cleanup-deleted-assets");
    let task_id = create_single_task(&service);
    let asset_dir = app_dir.join("ai").join("generated").join("cleanup");
    fs::create_dir_all(&asset_dir).expect("asset dir should create");
    let asset_path = asset_dir.join("cleanup-result.png");
    fs::write(&asset_path, b"png-data").expect("asset should write");

    let snapshot = service
        .record_asset(base_asset_request(
            task_id,
            asset_path.to_string_lossy().to_string(),
        ))
        .expect("asset should record");
    let persisted_path = PathBuf::from(&snapshot.assets[0].file_path);
    assert!(persisted_path.is_file());

    service
        .delete_job(&snapshot.job.id)
        .expect("job should soft delete");
    let result = service
        .cleanup_deleted_job_assets()
        .expect("deleted assets should clean");

    assert_eq!(result.scanned_assets, 1);
    assert_eq!(result.removed_files, 1);
    assert_eq!(result.missing_files, 0);
    assert_eq!(result.skipped_files, 0);
    assert!(result.removed_bytes > 0);
    assert!(!persisted_path.exists());

    let second = service
        .cleanup_deleted_job_assets()
        .expect("missing deleted assets should be counted");
    assert_eq!(second.scanned_assets, 1);
    assert_eq!(second.removed_files, 0);
    assert_eq!(second.missing_files, 1);
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
fn image_workbench_service_imports_uploaded_reference_image() {
    let (service, app_dir) = test_service("imports-reference");
    let upload_dir = app_dir
        .join("uploads")
        .join("images")
        .join("2026")
        .join("06");
    fs::create_dir_all(&upload_dir).expect("upload dir should create");
    let upload_path = upload_dir.join("reference.png");
    fs::write(&upload_path, b"png").expect("reference image should write");

    let result = service
        .import_reference_image(ImportImageWorkbenchReferenceRequest {
            source_path: "uploads/images/2026/06/reference.png".to_string(),
        })
        .expect("reference image should import");

    assert!(PathBuf::from(&result.file_path).exists());
    assert!(!result.file_path.starts_with("\\\\?\\"));
    assert!(!result.original_path.starts_with("\\\\?\\"));
    assert!(result
        .file_path
        .replace('\\', "/")
        .contains("/ai/image-workbench/references/"));
    assert!(result
        .original_path
        .replace('\\', "/")
        .ends_with("/uploads/images/2026/06/reference.png"));
    assert_eq!(result.mime_type.as_deref(), Some("image/png"));
    assert_eq!(result.size_bytes, 3);
}

#[test]
fn image_workbench_service_rejects_uncontrolled_reference_image() {
    let (service, app_dir) = test_service("rejects-reference");
    let upload_dir = app_dir
        .join("uploads")
        .join("files")
        .join("2026")
        .join("06");
    fs::create_dir_all(&upload_dir).expect("upload dir should create");
    fs::write(upload_dir.join("reference.txt"), b"not-image").expect("file should write");

    let wrong_dir = service
        .import_reference_image(ImportImageWorkbenchReferenceRequest {
            source_path: "uploads/files/2026/06/reference.txt".to_string(),
        })
        .expect_err("uploads/files should be rejected");
    let data_url = service
        .import_reference_image(ImportImageWorkbenchReferenceRequest {
            source_path: "data:image/png;base64,abc".to_string(),
        })
        .expect_err("data url should be rejected");

    assert!(matches!(wrong_dir, AppError::Permission(_)));
    assert!(matches!(data_url, AppError::Permission(_)));
}

#[test]
fn image_workbench_service_creates_img2img_job_with_imported_reference_path() {
    let (service, app_dir) = test_service("img2img-imported-reference");
    let upload_dir = app_dir
        .join("uploads")
        .join("images")
        .join("2026")
        .join("06");
    fs::create_dir_all(&upload_dir).expect("upload dir should create");
    fs::write(upload_dir.join("source.webp"), b"webp").expect("reference image should write");
    let imported = service
        .import_reference_image(ImportImageWorkbenchReferenceRequest {
            source_path: "uploads/images/2026/06/source.webp".to_string(),
        })
        .expect("reference image should import");

    let snapshot = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "img2img".to_string(),
            prompt: "".to_string(),
            negative_prompt: None,
            quantity: 1,
            provider_config_id: None,
            model: Some("gpt-image-2".to_string()),
            size: Some("1024x1024".to_string()),
            reference_asset_ids: Vec::new(),
            reference_asset_ids_json: None,
            source_asset_id: None,
            source_image_path: Some(imported.file_path.clone()),
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: Some("txt2img_prompt_fallback".to_string()),
            generation_options_json: None,
        })
        .expect("img2img job should create with imported path");

    assert_eq!(
        snapshot.job.source_image_path.as_deref(),
        Some(imported.file_path.as_str())
    );
    assert!(snapshot.job.reference_asset_ids_json.is_none());
}

#[test]
fn image_workbench_service_worker_resolves_multiple_reference_asset_paths() {
    let (service, app_dir) = test_service("worker-multiple-reference-assets");
    let task_id = create_single_task(&service);
    let generated_dir = app_dir.join("ai").join("generated").join("references");
    fs::create_dir_all(&generated_dir).expect("generated dir should create");
    let first_path = generated_dir.join("first.png");
    let second_path = generated_dir.join("second.png");
    fs::write(&first_path, b"first").expect("first reference should write");
    fs::write(&second_path, b"second").expect("second reference should write");

    service
        .record_asset(base_asset_request(
            task_id.clone(),
            first_path.to_string_lossy().to_string(),
        ))
        .expect("first asset should record");
    let snapshot = service
        .record_asset(base_asset_request(
            task_id,
            second_path.to_string_lossy().to_string(),
        ))
        .expect("second asset should record");
    let first_asset = snapshot.assets[0].clone();
    let second_asset = snapshot.assets[1].clone();

    let edit_job = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "img2img".to_string(),
            prompt: "融合两张参考图".to_string(),
            negative_prompt: None,
            quantity: 1,
            provider_config_id: Some("model-config-1".to_string()),
            model: Some("gpt-image-2".to_string()),
            size: Some("1024x1024".to_string()),
            reference_asset_ids: vec![first_asset.id.clone(), second_asset.id.clone()],
            reference_asset_ids_json: None,
            source_asset_id: Some(first_asset.id.clone()),
            source_image_path: Some(first_asset.file_path.clone()),
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
            generation_options_json: None,
        })
        .expect("edit job should create");
    let output_dir = app_dir
        .join("ai")
        .join("generated")
        .join("multi-reference-output");
    fs::create_dir_all(&output_dir).expect("output dir should create");
    let output_path = output_dir.join("result.png");
    fs::write(&output_path, b"png").expect("output should write");

    service
        .run_image_tasks_with_generator(&edit_job.job.id, None, None, |request| {
            assert_eq!(
                request.options.reference_asset_ids,
                vec![first_asset.id.clone(), second_asset.id.clone()]
            );
            assert_eq!(
                request.options.reference_image_paths,
                vec![
                    first_asset.file_path.clone(),
                    second_asset.file_path.clone()
                ]
            );
            Ok(AiGenerationResult {
                request_id: request.request_id,
                ok: true,
                capability: "img2img".to_string(),
                provider: "custom".to_string(),
                model: "gpt-image-2".to_string(),
                base_url: "https://mock.local/v1".to_string(),
                latency_ms: 10,
                queue_wait_ms: Some(0),
                total_latency_ms: Some(10),
                message: "ok".to_string(),
                status_code: Some(200),
                text: None,
                artifacts: vec![AiGenerationArtifact {
                    kind: "image".to_string(),
                    url: None,
                    path: Some(output_path.to_string_lossy().to_string()),
                    mime_type: Some("image/png".to_string()),
                    size_bytes: Some(3),
                    dimensions: Some("1024x1024".to_string()),
                    duration_seconds: None,
                }],
                failure_kind: None,
                raw_preview: None,
            })
        })
        .expect("worker should finish");
}

#[test]
fn image_workbench_service_worker_resolves_reference_paths_from_person_context() {
    let (service, app_dir) = test_service("worker-reference-paths-from-context");
    let generated_dir = app_dir.join("ai").join("generated").join("uploaded-refs");
    fs::create_dir_all(&generated_dir).expect("reference dir should create");
    let first_path = generated_dir.join("uploaded-a.png");
    let second_path = generated_dir.join("uploaded-b.png");
    fs::write(&first_path, b"first").expect("first reference should write");
    fs::write(&second_path, b"second").expect("second reference should write");
    let first_reference = first_path.to_string_lossy().to_string();
    let second_reference = second_path.to_string_lossy().to_string();

    let edit_job = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "img2img".to_string(),
            prompt: "参考两张上传图生成".to_string(),
            negative_prompt: None,
            quantity: 1,
            provider_config_id: Some("model-config-1".to_string()),
            model: Some("gpt-image-2".to_string()),
            size: Some("1024x1024".to_string()),
            reference_asset_ids: Vec::new(),
            reference_asset_ids_json: None,
            source_asset_id: None,
            source_image_path: Some(first_reference.clone()),
            mask_path: None,
            person_context_json: Some(
                serde_json::json!({
                    "sourceImagePath": first_reference.clone(),
                    "referenceImagePaths": [first_reference.clone(), second_reference.clone()],
                })
                .to_string(),
            ),
            upscale_scale: None,
            fallback_policy: None,
            generation_options_json: None,
        })
        .expect("edit job should create");
    let output_dir = app_dir
        .join("ai")
        .join("generated")
        .join("uploaded-reference-output");
    fs::create_dir_all(&output_dir).expect("output dir should create");
    let output_path = output_dir.join("result.png");
    fs::write(&output_path, b"png").expect("output should write");

    service
        .run_image_tasks_with_generator(&edit_job.job.id, None, None, |request| {
            assert_eq!(
                request.options.reference_image_paths,
                vec![first_reference.clone(), second_reference.clone()]
            );
            Ok(AiGenerationResult {
                request_id: request.request_id,
                ok: true,
                capability: "img2img".to_string(),
                provider: "custom".to_string(),
                model: "gpt-image-2".to_string(),
                base_url: "https://mock.local/v1".to_string(),
                latency_ms: 10,
                queue_wait_ms: Some(0),
                total_latency_ms: Some(10),
                message: "ok".to_string(),
                status_code: Some(200),
                text: None,
                artifacts: vec![AiGenerationArtifact {
                    kind: "image".to_string(),
                    url: None,
                    path: Some(output_path.to_string_lossy().to_string()),
                    mime_type: Some("image/png".to_string()),
                    size_bytes: Some(3),
                    dimensions: Some("1024x1024".to_string()),
                    duration_seconds: None,
                }],
                failure_kind: None,
                raw_preview: None,
            })
        })
        .expect("worker should finish");
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
            failure_type: None,
            failure_hint: None,
            model_run: None,
        })
        .expect("task should mark running");

    let snapshot = service
        .update_task_status(UpdateImageWorkbenchTaskStatusRequest {
            task_id,
            status: "failed".to_string(),
            error: Some("provider failed".to_string()),
            failure_type: None,
            failure_hint: None,
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
fn image_workbench_service_infers_failure_type_and_clears_on_retry() {
    let (service, _app_dir) = test_service("failure-type-inference");
    let task_id = create_single_task(&service);

    service
        .update_task_status(UpdateImageWorkbenchTaskStatusRequest {
            task_id: task_id.clone(),
            status: "running".to_string(),
            error: None,
            failure_type: None,
            failure_hint: None,
            model_run: None,
        })
        .expect("task should mark running");

    let failed = service
        .update_task_status(UpdateImageWorkbenchTaskStatusRequest {
            task_id: task_id.clone(),
            status: "failed".to_string(),
            error: Some("429 rate limit exceeded".to_string()),
            failure_type: None,
            failure_hint: None,
            model_run: None,
        })
        .expect("task should mark failed");
    assert_eq!(failed.tasks[0].failure_type.as_deref(), Some("rate_limit"));
    assert_eq!(
        failed.tasks[0].failure_hint.as_deref(),
        Some("429 rate limit exceeded")
    );

    let retrying = service
        .update_task_status(UpdateImageWorkbenchTaskStatusRequest {
            task_id,
            status: "retrying".to_string(),
            error: None,
            failure_type: None,
            failure_hint: None,
            model_run: None,
        })
        .expect("task should mark retrying");
    assert_eq!(retrying.tasks[0].failure_type, None);
    assert_eq!(retrying.tasks[0].failure_hint, None);
}

#[test]
fn image_workbench_service_summarizes_provider_unavailable_failure() {
    let (service, _app_dir) = test_service("provider-unavailable-failure");
    let task_id = create_single_task(&service);

    let failed = service
        .update_task_status(UpdateImageWorkbenchTaskStatusRequest {
            task_id,
            status: "failed".to_string(),
            error: Some(
                r#"生成图片失败: 模型提供商返回 HTTP 503: {"error":{"message":"No available compatible accounts","type":"api_error"}}"#
                    .to_string(),
            ),
            failure_type: None,
            failure_hint: None,
            model_run: None,
        })
        .expect("task should mark provider unavailable");

    assert_eq!(
        failed.tasks[0].failure_type.as_deref(),
        Some("provider_unavailable")
    );
    assert_eq!(
        failed.tasks[0].failure_hint.as_deref(),
        Some("当前模型没有可用账号或账号池已耗尽，请换一个模型/Provider，或稍后重试。")
    );
}

#[test]
fn image_workbench_service_summarizes_upstream_server_failure() {
    let (service, _app_dir) = test_service("upstream-server-failure");
    let task_id = create_single_task(&service);

    let failed = service
        .update_task_status(UpdateImageWorkbenchTaskStatusRequest {
            task_id,
            status: "failed".to_string(),
            error: Some(
                r#"生成图片失败: 模型提供商返回 HTTP 400: {"error":{"code":"upstream_error","message":"{\"error\":{\"type\":\"server_error\",\"code\":\"server_error\",\"message\":\"An error occurred while processing your request.\"}}"}}"#
                    .to_string(),
            ),
            failure_type: None,
            failure_hint: None,
            model_run: None,
        })
        .expect("task should mark upstream failure");

    assert_eq!(failed.tasks[0].failure_type.as_deref(), Some("upstream"));
    assert_eq!(
        failed.tasks[0].failure_hint.as_deref(),
        Some("上游模型服务处理失败，请重试；如果连续出现，请换一个模型/Provider，或稍后再试。")
    );
}

#[test]
fn image_workbench_worker_maps_generation_provider_unavailable_failure_kind() {
    let (service, _app_dir) = test_service("worker-provider-unavailable");
    let snapshot = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "txt2img".to_string(),
            prompt: "Provider 不可用测试".to_string(),
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
            generation_options_json: None,
        })
        .expect("job should create");

    let finished = service
        .run_image_tasks_with_generator(&snapshot.job.id, None, None, |request| {
            Ok(AiGenerationResult {
                request_id: request.request_id,
                ok: false,
                capability: "txt2img".to_string(),
                provider: "custom".to_string(),
                model: "gpt-image-2".to_string(),
                base_url: "https://mock.local/v1".to_string(),
                latency_ms: 128,
                queue_wait_ms: Some(0),
                total_latency_ms: Some(128),
                message: "生成图片失败: 模型提供商返回 HTTP 503: 当前模型没有可用账号或账号池已耗尽，请换一个模型/Provider，或稍后重试".to_string(),
                status_code: Some(503),
                text: None,
                artifacts: Vec::new(),
                failure_kind: Some("provider_unavailable".to_string()),
                raw_preview: Some(
                    r#"{"error":{"message":"No available compatible accounts"}}"#.to_string(),
                ),
            })
        })
        .expect("worker should finish");

    assert_eq!(finished.tasks[0].status, "failed");
    assert_eq!(
        finished.tasks[0].failure_type.as_deref(),
        Some("provider_unavailable")
    );
    assert_eq!(
        finished.tasks[0].failure_hint.as_deref(),
        Some("当前模型没有可用账号或账号池已耗尽，请换一个模型/Provider，或稍后重试。")
    );
}

#[test]
fn image_workbench_worker_forwards_generation_output_options() {
    let (service, app_dir) = test_service("worker-output-options");
    let generated_dir = app_dir.join("ai").join("generated").join("output-options");
    fs::create_dir_all(&generated_dir).expect("generated dir should create");
    let output_path = generated_dir.join("result.jpg");
    fs::write(&output_path, b"jpg").expect("generated image should write");
    let output_path = output_path.to_string_lossy().to_string();

    let snapshot = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "txt2img".to_string(),
            prompt: "输出参数测试".to_string(),
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
            generation_options_json: Some(
                r#"{"quality":"high","outputFormat":"jpeg","outputCompression":82,"background":"opaque","moderation":"low"}"#.to_string(),
            ),
        })
        .expect("job should create");

    let stored_options = snapshot
        .job
        .generation_options_json
        .as_deref()
        .and_then(|value| serde_json::from_str::<serde_json::Value>(value).ok())
        .expect("generation options should store as JSON");
    assert_eq!(stored_options["quality"], "high");
    assert_eq!(stored_options["outputFormat"], "jpeg");

    service
        .run_image_tasks_with_generator(&snapshot.job.id, None, None, move |request| {
            assert_eq!(request.options.quality.as_deref(), Some("high"));
            assert_eq!(request.options.output_format.as_deref(), Some("jpeg"));
            assert_eq!(request.options.output_compression, Some(82));
            assert_eq!(request.options.background.as_deref(), Some("opaque"));
            assert_eq!(request.options.moderation.as_deref(), Some("low"));
            Ok(AiGenerationResult {
                request_id: request.request_id,
                ok: true,
                capability: "txt2img".to_string(),
                provider: "custom".to_string(),
                model: "gpt-image-2".to_string(),
                base_url: "https://mock.local/v1".to_string(),
                latency_ms: 10,
                queue_wait_ms: Some(0),
                total_latency_ms: Some(10),
                message: "ok".to_string(),
                status_code: Some(200),
                text: None,
                artifacts: vec![AiGenerationArtifact {
                    kind: "image".to_string(),
                    url: None,
                    path: Some(output_path.clone()),
                    mime_type: Some("image/jpeg".to_string()),
                    size_bytes: Some(3),
                    dimensions: Some("1024x1024".to_string()),
                    duration_seconds: None,
                }],
                failure_kind: None,
                raw_preview: None,
            })
        })
        .expect("worker should finish");
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
            generation_options_json: None,
        })
        .expect("job should create");
    let generated_dir = app_dir.join("ai").join("generated").join("worker");
    fs::create_dir_all(&generated_dir).expect("generated dir should create");
    let generated_path = generated_dir.join("worker-result.png");
    fs::write(&generated_path, b"png").expect("generated image should write");

    let finished = service
        .run_image_tasks_with_generator(&snapshot.job.id, None, None, |request| {
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
fn image_workbench_worker_marks_task_failed_when_result_asset_cannot_be_recorded() {
    let (service, app_dir) = test_service("worker-record-asset-failure");
    let snapshot = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "txt2img".to_string(),
            prompt: "asset failure".to_string(),
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
            generation_options_json: None,
        })
        .expect("job should create");
    let outside_path = app_dir.join("outside-generated.png");
    fs::write(&outside_path, b"png").expect("outside file should write");

    let finished = service
        .run_image_tasks_with_generator(&snapshot.job.id, None, None, |request| {
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
                    path: Some(outside_path.to_string_lossy().to_string()),
                    mime_type: Some("image/png".to_string()),
                    size_bytes: Some(3),
                    dimensions: Some("1024x1024".to_string()),
                    duration_seconds: None,
                }],
                failure_kind: None,
                raw_preview: None,
            })
        })
        .expect("worker should write a terminal task status");

    assert_eq!(finished.job.status, "failed");
    assert_eq!(finished.tasks[0].status, "failed");
    assert!(finished.tasks[0].error.is_some());
    assert!(finished.tasks[0].failure_hint.is_some());
    assert!(finished.assets.is_empty());
    assert_eq!(finished.model_runs.len(), 1);
    assert_eq!(finished.model_runs[0].status, "failed");
}

#[test]
fn image_workbench_service_worker_records_all_returned_image_artifacts() {
    let (service, app_dir) = test_service("worker-records-multiple-artifacts");
    let snapshot = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "txt2img".to_string(),
            prompt: "同一次调用返回两张候选图".to_string(),
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
            generation_options_json: None,
        })
        .expect("job should create");
    let generated_dir = app_dir.join("ai").join("generated").join("multi");
    fs::create_dir_all(&generated_dir).expect("generated dir should create");
    let happy_path = generated_dir.join("happy.png");
    let calm_path = generated_dir.join("calm.png");
    fs::write(&happy_path, b"png-a").expect("first image should write");
    fs::write(&calm_path, b"png-b").expect("second image should write");
    let happy_path = happy_path.to_string_lossy().to_string();
    let calm_path = calm_path.to_string_lossy().to_string();

    let finished = service
        .run_image_tasks_with_generator(&snapshot.job.id, None, None, |request| {
            Ok(AiGenerationResult {
                request_id: request.request_id,
                ok: true,
                capability: "txt2img".to_string(),
                provider: "custom".to_string(),
                model: "gpt-image-2".to_string(),
                base_url: "https://mock.local/v1".to_string(),
                latency_ms: 256,
                queue_wait_ms: Some(0),
                total_latency_ms: Some(256),
                message: "ok".to_string(),
                status_code: Some(200),
                text: None,
                artifacts: vec![
                    AiGenerationArtifact {
                        kind: "image".to_string(),
                        url: None,
                        path: Some(happy_path.clone()),
                        mime_type: Some("image/png".to_string()),
                        size_bytes: Some(5),
                        dimensions: Some("1122x1402".to_string()),
                        duration_seconds: None,
                    },
                    AiGenerationArtifact {
                        kind: "image".to_string(),
                        url: None,
                        path: Some(calm_path.clone()),
                        mime_type: Some("image/png".to_string()),
                        size_bytes: Some(5),
                        dimensions: Some("1121x1403".to_string()),
                        duration_seconds: None,
                    },
                ],
                failure_kind: None,
                raw_preview: Some(
                    r#"{"data":[{"url":"mock://a"},{"url":"mock://b"}]}"#.to_string(),
                ),
            })
        })
        .expect("worker should finish");

    assert_eq!(finished.job.status, "succeeded");
    assert_eq!(finished.tasks[0].status, "succeeded");
    assert_eq!(finished.assets.len(), 2);
    assert!(finished
        .assets
        .iter()
        .all(|asset| asset.task_id == snapshot.tasks[0].id));
    assert_eq!(finished.metadata.len(), 2);
    assert_eq!(finished.model_runs.len(), 1);
    let mut dimensions = finished
        .assets
        .iter()
        .map(|asset| (asset.width, asset.height))
        .collect::<Vec<_>>();
    dimensions.sort();
    assert_eq!(
        dimensions,
        vec![(Some(1121), Some(1403)), (Some(1122), Some(1402))]
    );
}

/// 端到端验证：create_job → worker 生成 → 落库资产带 group_id / variant_index；
/// 带 source_asset_id 的复跑 job 产出的资产带正确版本链（parent/root/version）。
#[test]
fn image_workbench_service_worker_writes_group_and_version_chain() {
    let (service, app_dir) = test_service("worker-group-version");
    let generated_dir = app_dir.join("ai").join("generated").join("chain");
    fs::create_dir_all(&generated_dir).expect("generated dir should create");

    // 用 fake generator 跑完一个 job 的全部 task，返回落库后的 snapshot。
    let run_job = |service: &ImageWorkbenchService, job_id: &str, tag: &str| {
        let path = generated_dir.join(format!("{tag}.png"));
        fs::write(&path, b"png").expect("generated image should write");
        let path_str = path.to_string_lossy().to_string();
        service
            .run_image_tasks_with_generator(job_id, None, None, move |request| {
                Ok(AiGenerationResult {
                    request_id: request.request_id,
                    ok: true,
                    capability: "txt2img".to_string(),
                    provider: "custom".to_string(),
                    model: "gpt-image-2".to_string(),
                    base_url: "https://mock.local/v1".to_string(),
                    latency_ms: 10,
                    queue_wait_ms: Some(0),
                    total_latency_ms: Some(10),
                    message: "ok".to_string(),
                    status_code: Some(200),
                    text: None,
                    artifacts: vec![AiGenerationArtifact {
                        kind: "image".to_string(),
                        url: None,
                        path: Some(path_str.clone()),
                        mime_type: Some("image/png".to_string()),
                        size_bytes: Some(3),
                        dimensions: Some("1024x1024".to_string()),
                        duration_seconds: None,
                    }],
                    failure_kind: None,
                    raw_preview: None,
                })
            })
            .expect("worker should finish")
    };

    // 全新 job：资产带 group_id / variant_index，但无版本链。
    let fresh = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "txt2img".to_string(),
            prompt: "初版".to_string(),
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
            generation_options_json: None,
        })
        .expect("fresh job should create");
    let fresh = run_job(&service, &fresh.job.id, "alpha");
    let alpha = &fresh.assets[0];
    assert!(alpha.group_id.is_some(), "asset should carry group_id");
    assert_eq!(fresh.tasks[0].variant_index, Some(0));
    assert_eq!(alpha.parent_asset_id, None);
    assert_eq!(alpha.version_index, None);
    let alpha_id = alpha.id.clone();

    // 复跑 job：source_asset_id 指向 α → 资产带版本链 parent=α, root=α, version=1。
    let rerun = service
        .create_job(CreateImageWorkbenchJobRequest {
            mode: "img2img".to_string(),
            prompt: "复跑".to_string(),
            negative_prompt: None,
            quantity: 1,
            provider_config_id: Some("model-config-1".to_string()),
            model: Some("gpt-image-2".to_string()),
            size: Some("1024x1024".to_string()),
            reference_asset_ids: vec![alpha_id.clone()],
            reference_asset_ids_json: None,
            source_asset_id: Some(alpha_id.clone()),
            source_image_path: None,
            mask_path: None,
            person_context_json: None,
            upscale_scale: None,
            fallback_policy: None,
            generation_options_json: None,
        })
        .expect("rerun job should create");
    let rerun = run_job(&service, &rerun.job.id, "beta");
    let beta = &rerun.assets[0];
    assert_eq!(beta.parent_asset_id.as_deref(), Some(alpha_id.as_str()));
    assert_eq!(beta.root_asset_id.as_deref(), Some(alpha_id.as_str()));
    assert_eq!(beta.version_index, Some(1));
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
            generation_options_json: None,
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
