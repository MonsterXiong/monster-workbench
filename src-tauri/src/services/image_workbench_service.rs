use crate::infra::image_workbench_repo::ImageWorkbenchRepo;
use crate::infra::image_workbench_types::{
    ImageWorkbenchAsset, ImageWorkbenchAssetQuery, ImageWorkbenchAssetSort, ImageWorkbenchGroup,
    ImageWorkbenchJob, ImageWorkbenchSnapshot, ImageWorkbenchTaskStatusPatch,
    ImageWorkbenchTemplate, NewImageWorkbenchAsset, NewImageWorkbenchJob,
    NewImageWorkbenchMetadata, NewImageWorkbenchModelRun, NewImageWorkbenchTemplate,
    ReplanImageWorkbenchStoryboardGroupInput, TagImageWorkbenchAssetsGroupInput,
    TagImageWorkbenchAssetsGroupResult,
};
use crate::infra::path::PathProvider;
use crate::infra::sensitive::sanitize_sensitive_text;
use crate::infra::{AppError, AppResult};
use crate::services::ai_generation_task::list_recent_generation_tasks;
use crate::services::ai_provider_types::{AiBusinessGenerationRequest, AiGenerationResult};
use crate::services::ai_service::AiProviderService;
use crate::services::image_workbench_asset_policy::ImageWorkbenchAssetPathPolicy;
use crate::services::image_workbench_cleanup::{
    cleanup_deleted_job_assets, CleanupImageWorkbenchDeletedAssetsResult,
};
use crate::services::image_workbench_failure::{
    generation_failure_kind_to_workbench_failure_type, normalize_failure_details,
};
use crate::services::image_workbench_generation_options::normalize_image_generation_options_json;
use crate::services::image_workbench_import::{
    import_generated_assets, ImportImageWorkbenchGeneratedAssetsRequest,
    ImportImageWorkbenchGeneratedAssetsResult,
};
use crate::services::image_workbench_mask::{
    build_mask_png, normalize_mask_strokes, SaveImageWorkbenchMaskRequest,
    SaveImageWorkbenchMaskResult,
};
use crate::services::image_workbench_mode::{
    merge_negative_prompt, normalize_job_prompt, normalize_task_prompts, normalize_upscale_scale,
    validate_mode_context,
};
use serde_json::json;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

const IMAGE_WORKBENCH_TEXT_MAX_CHARS: usize = 8_192;
const IMAGE_WORKBENCH_SHORT_TEXT_MAX_CHARS: usize = 256;
const IMAGE_WORKBENCH_JSON_MAX_CHARS: usize = 16_384;
const IMAGE_WORKBENCH_PREVIEW_MAX_CHARS: usize = 4_096;
const IMAGE_WORKBENCH_TEMPLATE_NAME_MAX_CHARS: usize = 80;
const IMAGE_WORKBENCH_ASSET_QUERY_MAX_LIMIT: u32 = 200;
const IMAGE_WORKBENCH_ASSET_QUERY_MAX_OFFSET: u32 = 10_000;
const IMAGE_WORKBENCH_QUALITY_ISSUES: &[&str] = &["hands", "identity", "prop", "scene"];
pub(crate) const IMAGE_WORKBENCH_ASSET_INTEGRITY_OK: &str = "ok";
pub(crate) const IMAGE_WORKBENCH_ASSET_INTEGRITY_MISSING: &str = "missing";
pub(crate) const IMAGE_WORKBENCH_ASSET_INTEGRITY_CORRUPT: &str = "corrupt";
pub(crate) const IMAGE_WORKBENCH_TASK_LEASE_MS: i64 =
    crate::services::runtime_constants::LEASE_INITIAL_MS as i64;

pub(crate) use crate::services::image_workbench_generation_bridge::{
    cancelled_generation_model_run, generation_options_for_job, generation_result_model_run,
    image_artifacts, is_cancel_error, parse_artifact_dimensions,
};
pub(crate) use crate::services::image_workbench_mode::validate_workbench_mode;
pub use crate::services::image_workbench_service_types::{
    CreateImageWorkbenchJobRequest, DeleteImageWorkbenchAssetsRequest,
    DeleteImageWorkbenchAssetsResult, DeleteImageWorkbenchJobResult,
    ExportImageWorkbenchGroupRequest, ImageWorkbenchContractSummary,
    ImportImageWorkbenchReferenceRequest, ImportImageWorkbenchReferenceResult,
    QueryImageWorkbenchAssetsRequest, RecordImageWorkbenchAssetRequest,
    RecordImageWorkbenchMetadataInput, RecordImageWorkbenchModelRunInput,
    ReplanImageWorkbenchStoryboardGroupRequest, SaveImageWorkbenchTemplateRequest,
    SetImageWorkbenchAssetFavoriteRequest, SetImageWorkbenchAssetQualityIssuesRequest,
    SetImageWorkbenchAssetRatingRequest, TagImageWorkbenchAssetsGroupRequest,
    UpdateImageWorkbenchTaskStatusRequest,
};

pub struct ImageWorkbenchService {
    path_provider: PathProvider,
}

impl ImageWorkbenchService {
    pub fn new(path_provider: PathProvider) -> Self {
        Self { path_provider }
    }

    pub fn contract_summary(&self) -> ImageWorkbenchContractSummary {
        ImageWorkbenchContractSummary {
            tables: vec![
                "image_workbench_jobs".to_string(),
                "image_workbench_tasks".to_string(),
                "image_workbench_assets".to_string(),
                "image_workbench_metadata".to_string(),
                "image_workbench_templates".to_string(),
                "image_workbench_groups".to_string(),
                "image_workbench_model_runs".to_string(),
            ],
            job_statuses: vec![
                "draft".to_string(),
                "queued".to_string(),
                "running".to_string(),
                "validating".to_string(),
                "succeeded".to_string(),
                "failed".to_string(),
                "cancelled".to_string(),
                "partial_succeeded".to_string(),
            ],
            task_statuses: vec![
                "queued".to_string(),
                "running".to_string(),
                "validating".to_string(),
                "retrying".to_string(),
                "succeeded".to_string(),
                "failed".to_string(),
                "cancelled".to_string(),
            ],
            supported_modes: vec![
                "txt2img".to_string(),
                "img2img".to_string(),
                "inpaint".to_string(),
                "person_consistency".to_string(),
                "upscale_2x".to_string(),
                "upscale_4x".to_string(),
            ],
            deferred_modes: Vec::new(),
            max_quantity: None,
        }
    }

    pub fn create_job(
        &self,
        request: CreateImageWorkbenchJobRequest,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        validate_workbench_mode(&request.mode, false)?;
        let reference_asset_ids_json = normalize_reference_asset_ids_json(
            request.reference_asset_ids_json,
            request.reference_asset_ids,
        )?;
        let source_asset_id = normalize_limited_optional_string(
            "Image Workbench source asset id",
            request.source_asset_id,
            IMAGE_WORKBENCH_SHORT_TEXT_MAX_CHARS,
        )?;
        let source_image_path = normalize_limited_optional_string(
            "Image Workbench source image path",
            request.source_image_path,
            IMAGE_WORKBENCH_TEXT_MAX_CHARS,
        )?;
        let mask_path = normalize_limited_optional_string(
            "Image Workbench mask path",
            request.mask_path,
            IMAGE_WORKBENCH_TEXT_MAX_CHARS,
        )?;
        let person_context_json = normalize_optional_json_string(
            "Image Workbench person context",
            request.person_context_json,
            IMAGE_WORKBENCH_JSON_MAX_CHARS,
            false,
        )?;
        let generation_options_json = normalize_image_generation_options_json(
            request.generation_options_json,
            IMAGE_WORKBENCH_JSON_MAX_CHARS,
        )?;
        let upscale_scale = normalize_upscale_scale(&request.mode, request.upscale_scale)?;
        validate_mode_context(
            &request.mode,
            reference_asset_ids_json.as_deref(),
            source_asset_id.as_deref(),
            source_image_path.as_deref(),
            mask_path.as_deref(),
        )?;
        let prompt = normalize_job_prompt(
            &request.mode,
            request.prompt,
            reference_asset_ids_json.as_deref(),
            source_asset_id.as_deref(),
            source_image_path.as_deref(),
            upscale_scale,
        )?;
        if request.quantity == 0 {
            return Err(AppError::Config("图片工作台任务数量必须大于 0".to_string()));
        }
        let task_prompts = normalize_task_prompts(
            request.task_prompts,
            request.quantity,
            IMAGE_WORKBENCH_TEXT_MAX_CHARS,
        )?;
        let negative_prompt = merge_negative_prompt(&prompt, request.negative_prompt);

        self.repo()?.create_job(NewImageWorkbenchJob {
            mode: request.mode,
            prompt,
            negative_prompt,
            task_prompts,
            quantity: request.quantity,
            provider_config_id: normalize_optional_string(request.provider_config_id),
            model: normalize_optional_string(request.model),
            size: normalize_optional_string(request.size),
            reference_asset_ids_json,
            source_asset_id,
            source_image_path,
            mask_path,
            person_context_json,
            upscale_scale,
            fallback_policy: normalize_limited_optional_string(
                "Image Workbench fallback policy",
                request.fallback_policy,
                IMAGE_WORKBENCH_SHORT_TEXT_MAX_CHARS,
            )?,
            generation_options_json,
        })
    }

    pub(crate) fn resolve_reference_image_paths_for_job(
        &self,
        job: &ImageWorkbenchJob,
    ) -> AppResult<Vec<String>> {
        let mut paths = Vec::new();
        push_unique_path(&mut paths, job.source_image_path.as_deref());
        push_reference_paths_from_person_context(&mut paths, job.person_context_json.as_deref());
        let reference_asset_ids =
            parse_reference_asset_ids(job.reference_asset_ids_json.as_deref());
        if reference_asset_ids.is_empty() {
            return Ok(paths);
        }

        let repo = self.repo()?;
        for asset_id in reference_asset_ids {
            if let Ok(asset) = repo.get_asset_by_id(&asset_id) {
                push_unique_path(&mut paths, Some(asset.file_path.as_str()));
            }
        }
        Ok(paths)
    }

    pub fn list_jobs(&self, limit: Option<u32>) -> AppResult<Vec<ImageWorkbenchJob>> {
        self.repo()?.list_jobs(limit.unwrap_or(50))
    }

    pub fn list_assets(&self, limit: Option<u32>) -> AppResult<Vec<ImageWorkbenchAsset>> {
        let assets = self.repo()?.list_recent_assets(limit.unwrap_or(100))?;
        self.refresh_asset_integrity_for_assets(assets)
    }

    pub fn query_assets(
        &self,
        request: QueryImageWorkbenchAssetsRequest,
    ) -> AppResult<Vec<ImageWorkbenchAsset>> {
        if request.min_rating.unwrap_or(0) > 5 {
            return Err(AppError::Config(
                "图片工作台资产评分筛选必须在 0 到 5 之间".to_string(),
            ));
        }
        let assets = self.repo()?.query_assets(ImageWorkbenchAssetQuery {
            limit: request
                .limit
                .unwrap_or(100)
                .clamp(1, IMAGE_WORKBENCH_ASSET_QUERY_MAX_LIMIT),
            offset: request
                .offset
                .unwrap_or(0)
                .min(IMAGE_WORKBENCH_ASSET_QUERY_MAX_OFFSET),
            group_id: normalize_optional_string(request.group_id),
            min_rating: request.min_rating,
            sort: parse_asset_query_sort(request.sort)?,
        })?;
        self.refresh_asset_integrity_for_assets(assets)
    }

    pub fn list_groups(&self, job_id: String) -> AppResult<Vec<ImageWorkbenchGroup>> {
        let job_id = normalize_required_id("图片工作台作业 ID", &job_id)?;
        self.repo()?.list_groups(&job_id)
    }

    pub fn import_reference_image(
        &self,
        request: ImportImageWorkbenchReferenceRequest,
    ) -> AppResult<ImportImageWorkbenchReferenceResult> {
        let source_path = normalize_limited_required_string(
            "Image Workbench reference image path",
            request.source_path,
            IMAGE_WORKBENCH_TEXT_MAX_CHARS,
        )?;
        let imported = self
            .asset_path_policy()
            .import_reference_image("Image Workbench reference image", &source_path)?;
        Ok(ImportImageWorkbenchReferenceResult {
            file_path: imported.file_path,
            original_path: imported.original_path,
            mime_type: imported.mime_type,
            size_bytes: imported.size_bytes,
            created_at_ms: imported.created_at_ms,
        })
    }

    pub fn import_generated_assets(
        &self,
        request: ImportImageWorkbenchGeneratedAssetsRequest,
    ) -> AppResult<ImportImageWorkbenchGeneratedAssetsResult> {
        import_generated_assets(self.path_provider.clone(), request)
    }

    pub fn get_snapshot(&self, job_id: &str) -> AppResult<ImageWorkbenchSnapshot> {
        if job_id.trim().is_empty() {
            return Err(AppError::Config("图片工作台作业 ID 不能为空".to_string()));
        }
        let snapshot = self.repo()?.get_snapshot(job_id)?;
        self.refresh_snapshot_asset_integrity(snapshot)
    }

    pub fn cancel_job(&self, job_id: &str) -> AppResult<ImageWorkbenchSnapshot> {
        let job_id = normalize_required_id("图片工作台作业 ID", job_id)?;
        let before = self.get_snapshot(&job_id)?;
        let active_task_ids = before
            .tasks
            .iter()
            .filter(|task| {
                matches!(
                    task.status.as_str(),
                    "queued" | "running" | "validating" | "retrying"
                )
            })
            .map(|task| task.id.clone())
            .collect::<Vec<_>>();
        let repo = self.repo()?;
        repo.cancel_job(&job_id)?;
        for task_id in active_task_ids {
            repo.record_model_run(
                &job_id,
                Some(&task_id),
                normalize_model_run_input(cancelled_generation_model_run(&before.job))?,
            )?;
        }
        self.get_snapshot(&job_id)
    }

    pub fn cancel_task(&self, task_id: &str) -> AppResult<ImageWorkbenchSnapshot> {
        crate::services::image_workbench_cancel::cancel_task(self, task_id)
    }

    pub fn retry_failed_tasks(&self, job_id: &str) -> AppResult<ImageWorkbenchSnapshot> {
        let job_id = normalize_required_id("图片工作台作业 ID", job_id)?;
        self.repo()?.retry_failed_tasks(&job_id)
    }

    pub fn replan_storyboard_group(
        &self,
        request: ReplanImageWorkbenchStoryboardGroupRequest,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let group_id = normalize_required_id("图片工作台分镜组 ID", &request.group_id)?;
        self.repo()?
            .replan_storyboard_group(ReplanImageWorkbenchStoryboardGroupInput {
                group_id,
                variants_per_scene: request.variants_per_scene.map(|value| value.clamp(1, 8)),
            })
    }

    pub fn start_job_runner(
        &self,
        app_handle: AppHandle,
        job_id: &str,
        worker_id: String,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let job_id = normalize_required_id("图片工作台作业 ID", job_id)?;
        let snapshot = self.get_snapshot(&job_id)?;
        let path_provider = self.path_provider.clone();
        let per_job_worker_limit =
            crate::services::runtime_constants::IMAGE_WORKBENCH_JOB_WORKER_LIMIT
                .min(crate::services::runtime_constants::GLOBAL_WORKER_LIMIT)
                .max(1);
        let worker_count = snapshot
            .tasks
            .iter()
            .filter(|task| {
                matches!(
                    task.status.as_str(),
                    "queued" | "running" | "validating" | "retrying"
                )
            })
            .count()
            .clamp(1, per_job_worker_limit);

        for worker_index in 0..worker_count {
            let worker_job_id = job_id.clone();
            let worker_path_provider = path_provider.clone();
            let worker_app_handle = app_handle.clone();
            let worker_identity = worker_id.clone();
            tauri::async_runtime::spawn_blocking(move || {
                let owner_label = format!("iw-job:{}:{}", worker_job_id, worker_index + 1);
                let permit = crate::services::runtime_dispatcher::acquire_global_worker_permit(
                    &owner_label,
                    std::time::Duration::from_secs(30),
                );
                if permit.is_none() {
                    eprintln!(
                        "[image_workbench] start_job_runner 跳过：等待 worker permit 超时 job={}",
                        worker_job_id
                    );
                    return;
                }
                let service = ImageWorkbenchService::new(worker_path_provider);
                let ai_service = AiProviderService::new(worker_app_handle);
                let _ = service.run_image_tasks_with_generator(
                    &worker_job_id,
                    None,
                    Some(worker_identity.as_str()),
                    |request| ai_service.run_business_generation_blocking(request),
                );
            });
        }
        Ok(snapshot)
    }

    pub fn recover_interrupted_jobs(&self) -> AppResult<u32> {
        if has_active_image_workbench_generation_task()? {
            return Ok(0);
        }
        self.repo()?
            .recover_interrupted_jobs("应用重启后，未完成的图片工作台任务已中止")
    }

    pub fn delete_job(
        &self,
        job_id: &str,
        delete_assets: bool,
    ) -> AppResult<DeleteImageWorkbenchJobResult> {
        let job_id = normalize_required_id("图片工作台作业 ID", job_id)?;
        let snapshot = self.get_snapshot(&job_id)?;
        let asset_ids = snapshot
            .assets
            .iter()
            .map(|asset| asset.id.clone())
            .collect::<Vec<_>>();
        let mut deleted_assets = 0;
        let mut deleted_files = 0;
        let mut skipped_files = 0;

        if delete_assets {
            let file_result = self.delete_asset_files(&snapshot.assets)?;
            deleted_files = file_result.deleted_files;
            skipped_files = file_result.skipped_files;
            deleted_assets = self.repo()?.delete_assets_by_ids(&asset_ids)?;
            self.repo()?.delete_job(&job_id)?;
        } else {
            self.repo()?.remove_job_from_queue(&job_id)?;
        }

        Ok(DeleteImageWorkbenchJobResult {
            removed_job: true,
            deleted_assets,
            deleted_files,
            skipped_files,
        })
    }

    pub fn cleanup_deleted_job_assets(
        &self,
    ) -> AppResult<CleanupImageWorkbenchDeletedAssetsResult> {
        cleanup_deleted_job_assets(&self.path_provider)
    }

    pub fn delete_assets(
        &self,
        request: DeleteImageWorkbenchAssetsRequest,
    ) -> AppResult<DeleteImageWorkbenchAssetsResult> {
        let asset_ids = normalize_asset_ids(request.asset_ids);
        if asset_ids.is_empty() {
            return Ok(DeleteImageWorkbenchAssetsResult {
                deleted_assets: 0,
                deleted_files: 0,
                skipped_files: 0,
            });
        }

        let repo = self.repo()?;
        let assets = asset_ids
            .iter()
            .filter_map(|asset_id| repo.get_asset_by_id(asset_id).ok())
            .collect::<Vec<_>>();
        let file_result = if request.delete_files.unwrap_or(true) {
            self.delete_asset_files(&assets)?
        } else {
            DeleteImageWorkbenchAssetsResult {
                deleted_assets: 0,
                deleted_files: 0,
                skipped_files: 0,
            }
        };
        let deleted_assets = self.repo()?.delete_assets_by_ids(&asset_ids)?;
        Ok(DeleteImageWorkbenchAssetsResult {
            deleted_assets,
            deleted_files: file_result.deleted_files,
            skipped_files: file_result.skipped_files,
        })
    }

    pub fn tag_assets_group(
        &self,
        request: TagImageWorkbenchAssetsGroupRequest,
    ) -> AppResult<TagImageWorkbenchAssetsGroupResult> {
        self.repo()?
            .tag_assets_group(TagImageWorkbenchAssetsGroupInput {
                asset_ids: normalize_asset_ids(request.asset_ids),
                group_id: normalize_limited_optional_string(
                    "Image Workbench group id",
                    request.group_id,
                    IMAGE_WORKBENCH_SHORT_TEXT_MAX_CHARS,
                )?,
                group_name: normalize_limited_optional_string(
                    "Image Workbench group name",
                    request.group_name,
                    IMAGE_WORKBENCH_TEMPLATE_NAME_MAX_CHARS,
                )?,
            })
    }

    #[allow(dead_code)]
    pub fn set_job_archived(&self, job_id: &str, archived: bool) -> AppResult<()> {
        let job_id = normalize_required_id("图片工作台作业 ID", job_id)?;
        self.repo()?.set_job_archived(&job_id, archived)
    }

    pub fn export_job(&self, job_id: &str) -> AppResult<String> {
        let job_id = normalize_required_id("图片工作台作业 ID", job_id)?;
        let snapshot = self.get_snapshot(&job_id)?;
        if snapshot.assets.is_empty() {
            return Err(AppError::Config("当前作业暂无可导出的图片资产".to_string()));
        }

        let export_dir = self
            .path_provider
            .get_app_local_data_dir()?
            .join("ai")
            .join("image-workbench")
            .join("exports")
            .join(format!(
                "{}-{}",
                sanitize_file_stem(&job_id),
                now_ms_for_export()
            ));
        let images_dir = export_dir.join("images");
        let metadata_dir = export_dir.join("metadata");
        fs::create_dir_all(&images_dir)?;
        fs::create_dir_all(&metadata_dir)?;

        let mut exported_images = Vec::new();
        for (index, asset) in snapshot.assets.iter().enumerate() {
            let source = PathBuf::from(&asset.file_path);
            if !source.is_file() {
                continue;
            }
            let file_name = export_asset_file_name(index, asset, &source);
            let target = images_dir.join(&file_name);
            fs::copy(&source, &target)?;
            exported_images.push(json!({
                "assetId": asset.id,
                "taskId": asset.task_id,
                "fileName": file_name,
                "width": asset.width,
                "height": asset.height,
                "mimeType": asset.mime_type,
                "sizeBytes": asset.size_bytes,
                "favorite": asset.favorite,
                "rating": asset.rating,
                "groupId": asset.group_id,
                "parentAssetId": asset.parent_asset_id,
                "rootAssetId": asset.root_asset_id,
                "versionIndex": asset.version_index,
                "deliveryStatus": asset.delivery_status,
                "qualityIssues": asset.quality_issues,
                "integrityStatus": asset.integrity_status,
                "integrityError": asset.integrity_error,
                "integrityCheckedAtMs": asset.integrity_checked_at_ms,
                "createdAtMs": asset.created_at_ms
            }));
        }

        let prompts = snapshot
            .metadata
            .iter()
            .map(|metadata| {
                json!({
                    "assetId": metadata.asset_id,
                    "taskId": metadata.task_id,
                    "originalPrompt": metadata.original_prompt,
                    "expandedPrompt": metadata.expanded_prompt,
                    "negativePrompt": metadata.negative_prompt,
                    "mode": metadata.mode,
                    "model": metadata.model,
                    "provider": metadata.provider,
                    "seed": metadata.seed,
                    "referenceAssetIdsJson": metadata.reference_asset_ids_json,
                    "maskPath": metadata.mask_path,
                    "personContextJson": metadata.person_context_json,
                    "createdAtMs": metadata.created_at_ms
                })
            })
            .collect::<Vec<_>>();

        let job_info = json!({
            "job": snapshot.job,
            "tasks": snapshot.tasks,
            "images": exported_images,
            "modelRuns": snapshot.model_runs,
            "exportedAtMs": now_ms_for_export(),
            "exportFormat": "folder",
            "layout": {
                "images": "images/",
                "prompts": "metadata/prompts.json",
                "jobInfo": "metadata/job_info.json"
            }
        });

        write_pretty_json(metadata_dir.join("prompts.json"), &json!(prompts))?;
        write_pretty_json(metadata_dir.join("job_info.json"), &job_info)?;

        Ok(export_dir.to_string_lossy().to_string())
    }

    pub fn export_asset(&self, asset_id: &str) -> AppResult<String> {
        let asset_id = normalize_required_id("图片工作台资产 ID", asset_id)?;
        let asset = self.repo()?.get_asset_by_id(&asset_id)?;
        let snapshot = self.get_snapshot(&asset.job_id)?;
        let source = PathBuf::from(&asset.file_path);
        if !source.is_file() {
            return Err(AppError::Config(format!(
                "图片工作台资产文件不存在: {}",
                asset.file_path
            )));
        }

        let export_dir = self
            .path_provider
            .get_app_local_data_dir()?
            .join("ai")
            .join("image-workbench")
            .join("exports")
            .join(format!(
                "{}-{}",
                sanitize_file_stem(&asset.id),
                now_ms_for_export()
            ));
        let images_dir = export_dir.join("images");
        let metadata_dir = export_dir.join("metadata");
        fs::create_dir_all(&images_dir)?;
        fs::create_dir_all(&metadata_dir)?;

        let file_name = export_asset_file_name(0, &asset, &source);
        fs::copy(&source, images_dir.join(&file_name))?;
        let metadata = snapshot
            .metadata
            .iter()
            .find(|item| item.asset_id == asset.id);
        let task = snapshot.tasks.iter().find(|item| item.id == asset.task_id);
        let model_runs = snapshot
            .model_runs
            .iter()
            .filter(|item| item.task_id.as_deref() == Some(asset.task_id.as_str()))
            .cloned()
            .collect::<Vec<_>>();

        write_pretty_json(
            metadata_dir.join("prompts.json"),
            &json!([{
                "assetId": &asset.id,
                "taskId": &asset.task_id,
                "originalPrompt": metadata.and_then(|item| item.original_prompt.clone()),
                "expandedPrompt": metadata.and_then(|item| item.expanded_prompt.clone()),
                "negativePrompt": metadata.and_then(|item| item.negative_prompt.clone()),
                "mode": metadata.and_then(|item| item.mode.clone()),
                "model": metadata.and_then(|item| item.model.clone()),
                "provider": metadata.and_then(|item| item.provider.clone()),
                "seed": metadata.and_then(|item| item.seed.clone()),
                "referenceAssetIdsJson": metadata.and_then(|item| item.reference_asset_ids_json.clone()),
                "maskPath": metadata.and_then(|item| item.mask_path.clone()),
                "personContextJson": metadata.and_then(|item| item.person_context_json.clone()),
                "createdAtMs": metadata.map(|item| item.created_at_ms)
            }]),
        )?;
        write_pretty_json(
            metadata_dir.join("asset_info.json"),
            &json!({
                "job": snapshot.job,
                "task": task,
                "asset": asset,
                "fileName": file_name,
                "metadata": metadata,
                "modelRuns": model_runs,
                "exportedAtMs": now_ms_for_export(),
                "exportFormat": "folder",
                "layout": {
                    "images": "images/",
                    "prompts": "metadata/prompts.json",
                    "assetInfo": "metadata/asset_info.json"
                }
            }),
        )?;

        Ok(export_dir.to_string_lossy().to_string())
    }

    pub fn export_group(&self, request: ExportImageWorkbenchGroupRequest) -> AppResult<String> {
        let group_id = normalize_limited_optional_string(
            "Image Workbench group id",
            request.group_id,
            IMAGE_WORKBENCH_SHORT_TEXT_MAX_CHARS,
        )?;
        let group_name = normalize_limited_optional_string(
            "Image Workbench group name",
            request.group_name,
            IMAGE_WORKBENCH_TEMPLATE_NAME_MAX_CHARS,
        )?;
        if group_id.is_none() && group_name.is_none() {
            return Err(AppError::Config(
                "Image Workbench group marker cannot be empty".to_string(),
            ));
        }

        let repo = self.repo()?;
        let assets =
            repo.list_assets_by_group_marker(group_id.as_deref(), group_name.as_deref())?;
        if assets.is_empty() {
            return Err(AppError::Config(
                "Image Workbench group has no exportable assets".to_string(),
            ));
        }
        let groups = repo.list_groups_by_marker(group_id.as_deref(), group_name.as_deref())?;
        let marker = group_name
            .clone()
            .or_else(|| groups.first().and_then(|group| group.name.clone()))
            .or(group_id.clone())
            .unwrap_or_else(|| "group".to_string());
        let export_dir = self
            .path_provider
            .get_app_local_data_dir()?
            .join("ai")
            .join("image-workbench")
            .join("exports")
            .join(format!(
                "group-{}-{}",
                sanitize_file_stem(&marker),
                now_ms_for_export()
            ));
        let images_dir = export_dir.join("images");
        let metadata_dir = export_dir.join("metadata");
        fs::create_dir_all(&images_dir)?;
        fs::create_dir_all(&metadata_dir)?;

        let mut exported_images = Vec::new();
        for (index, asset) in assets.iter().enumerate() {
            let source = PathBuf::from(&asset.file_path);
            if !source.is_file() {
                continue;
            }
            let file_name = export_asset_file_name(index, asset, &source);
            fs::copy(&source, images_dir.join(&file_name))?;
            exported_images.push(json!({
                "assetId": asset.id,
                "jobId": asset.job_id,
                "taskId": asset.task_id,
                "groupId": asset.group_id,
                "fileName": file_name,
                "width": asset.width,
                "height": asset.height,
                "favorite": asset.favorite,
                "rating": asset.rating,
                "createdAtMs": asset.created_at_ms
            }));
        }
        if exported_images.is_empty() {
            return Err(AppError::Config(
                "Image Workbench group image files are missing".to_string(),
            ));
        }

        write_pretty_json(
            metadata_dir.join("group_info.json"),
            &json!({
                "groupId": group_id,
                "groupName": group_name,
                "groups": groups,
                "images": exported_images,
                "exportedAtMs": now_ms_for_export(),
                "exportFormat": "folder",
                "layout": {
                    "images": "images/",
                    "groupInfo": "metadata/group_info.json"
                }
            }),
        )?;

        Ok(export_dir.to_string_lossy().to_string())
    }

    pub fn save_mask(
        &self,
        request: SaveImageWorkbenchMaskRequest,
    ) -> AppResult<SaveImageWorkbenchMaskResult> {
        let asset_id = normalize_required_id("图片工作台资产 ID", &request.asset_id)?;
        let asset = self.repo()?.get_asset_by_id(&asset_id)?;
        let mask = normalize_mask_strokes(request.width, request.height, request.strokes)?;
        let mask = match (asset.width, asset.height) {
            (Some(width), Some(height)) if width > 0 && height > 0 => mask.scaled_to(width, height),
            _ => mask,
        };
        let created_at_ms = now_ms_for_export();
        let mask_dir = self
            .path_provider
            .get_app_local_data_dir()?
            .join("ai")
            .join("image-workbench")
            .join("masks");
        fs::create_dir_all(&mask_dir)?;

        let file_name = format!("{}-{}.png", sanitize_file_stem(&asset_id), created_at_ms);
        let mask_path = mask_dir.join(file_name);
        fs::write(&mask_path, build_mask_png(&mask))?;

        Ok(SaveImageWorkbenchMaskResult {
            asset_id,
            mask_path: mask_path.to_string_lossy().to_string(),
            width: mask.width(),
            height: mask.height(),
            stroke_count: mask.stroke_count(),
            point_count: mask.point_count(),
            created_at_ms,
        })
    }

    pub fn update_task_status(
        &self,
        request: UpdateImageWorkbenchTaskStatusRequest,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        if request.task_id.trim().is_empty() {
            return Err(AppError::Config("图片工作台任务 ID 不能为空".to_string()));
        }
        if !matches!(
            request.status.as_str(),
            "queued" | "running" | "validating" | "retrying" | "succeeded" | "failed" | "cancelled"
        ) {
            return Err(AppError::Config(format!(
                "图片工作台暂不支持的任务状态: {}",
                request.status
            )));
        }
        let status = request.status;
        let error = normalize_optional_string(request.error);
        let (failure_type, failure_hint) = normalize_failure_details(
            &status,
            request.failure_type,
            request.failure_hint,
            error.as_deref(),
        )?;
        let model_run = match request.model_run {
            Some(model_run) => Some(normalize_model_run_input(model_run)?),
            None => None,
        };
        self.repo()?
            .update_task_status(ImageWorkbenchTaskStatusPatch {
                task_id: request.task_id,
                status,
                error,
                failure_type,
                failure_hint,
                model_run,
            })
    }

    pub fn record_asset(
        &self,
        request: RecordImageWorkbenchAssetRequest,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        if request.task_id.trim().is_empty() {
            return Err(AppError::Config("图片工作台任务 ID 不能为空".to_string()));
        }
        let task_id = request.task_id.trim().to_string();
        if request.file_path.trim().is_empty() {
            return Err(AppError::Config("图片工作台资产路径不能为空".to_string()));
        }
        let asset_path_policy = self.asset_path_policy();
        let file_path = asset_path_policy.persist_workbench_asset_path(
            "图片工作台资产路径",
            &request.file_path,
            &task_id,
        )?;
        let thumbnail_path = match normalize_optional_string(request.thumbnail_path) {
            Some(path) => Some(asset_path_policy.persist_workbench_asset_path(
                "图片工作台缩略图路径",
                &path,
                &task_id,
            )?),
            None => None,
        };
        let metadata = match request.metadata {
            Some(metadata) => Some(NewImageWorkbenchMetadata {
                original_prompt: normalize_limited_optional_string(
                    "图片工作台原始提示词",
                    metadata.original_prompt,
                    IMAGE_WORKBENCH_TEXT_MAX_CHARS,
                )?,
                expanded_prompt: normalize_limited_optional_string(
                    "图片工作台扩展提示词",
                    metadata.expanded_prompt,
                    IMAGE_WORKBENCH_TEXT_MAX_CHARS,
                )?,
                negative_prompt: normalize_limited_optional_string(
                    "图片工作台负向提示词",
                    metadata.negative_prompt,
                    IMAGE_WORKBENCH_TEXT_MAX_CHARS,
                )?,
                seed: normalize_limited_optional_string(
                    "图片工作台 seed",
                    metadata.seed,
                    IMAGE_WORKBENCH_SHORT_TEXT_MAX_CHARS,
                )?,
                model: normalize_limited_optional_string(
                    "图片工作台模型",
                    metadata.model,
                    IMAGE_WORKBENCH_SHORT_TEXT_MAX_CHARS,
                )?,
                mode: normalize_limited_optional_string(
                    "图片工作台模式",
                    metadata.mode,
                    IMAGE_WORKBENCH_SHORT_TEXT_MAX_CHARS,
                )?,
                provider: normalize_limited_optional_string(
                    "图片工作台 Provider",
                    metadata.provider,
                    IMAGE_WORKBENCH_SHORT_TEXT_MAX_CHARS,
                )?,
                reference_asset_ids_json: normalize_optional_json_string(
                    "图片工作台参考资产",
                    metadata.reference_asset_ids_json,
                    IMAGE_WORKBENCH_JSON_MAX_CHARS,
                    false,
                )?,
                mask_path: asset_path_policy.normalize_optional_mask_path(
                    "图片工作台蒙版路径",
                    metadata.mask_path,
                    &task_id,
                )?,
                person_context_json: normalize_optional_json_string(
                    "图片工作台人物上下文",
                    metadata.person_context_json,
                    IMAGE_WORKBENCH_JSON_MAX_CHARS,
                    true,
                )?,
            }),
            None => None,
        };
        let model_run = match request.model_run {
            Some(model_run) => Some(normalize_model_run_input(model_run)?),
            None => None,
        };

        self.repo()?.record_asset(
            NewImageWorkbenchAsset {
                task_id,
                file_path,
                thumbnail_path,
                width: request.width,
                height: request.height,
                mime_type: normalize_optional_string(request.mime_type),
                size_bytes: request.size_bytes,
                ..Default::default()
            },
            metadata,
            model_run,
        )
    }

    pub fn set_asset_favorite(
        &self,
        request: SetImageWorkbenchAssetFavoriteRequest,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let asset_id = normalize_required_id("图片工作台资产 ID", &request.asset_id)?;
        self.repo()?.set_asset_favorite(&asset_id, request.favorite)
    }

    pub fn set_asset_rating(
        &self,
        request: SetImageWorkbenchAssetRatingRequest,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let asset_id = normalize_required_id("图片工作台资产 ID", &request.asset_id)?;
        if request.rating.unwrap_or(0) > 5 {
            return Err(AppError::Config(
                "图片工作台资产评分必须在 0 到 5 之间".to_string(),
            ));
        }
        self.repo()?.set_asset_rating(&asset_id, request.rating)
    }

    pub fn set_asset_quality_issues(
        &self,
        request: SetImageWorkbenchAssetQualityIssuesRequest,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let asset_id = normalize_required_id("图片工作台资产 ID", &request.asset_id)?;
        let quality_issues = normalize_quality_issues(request.quality_issues)?;
        self.repo()?
            .set_asset_quality_issues(&asset_id, &quality_issues)
    }

    pub fn list_templates(&self) -> AppResult<Vec<ImageWorkbenchTemplate>> {
        self.repo()?.list_templates()
    }

    pub fn save_template(
        &self,
        request: SaveImageWorkbenchTemplateRequest,
    ) -> AppResult<ImageWorkbenchTemplate> {
        validate_workbench_mode(&request.mode, true)?;
        let name = normalize_limited_required_string(
            "图片工作台模板名称",
            request.name,
            IMAGE_WORKBENCH_TEMPLATE_NAME_MAX_CHARS,
        )?;
        let prompt = normalize_limited_required_string(
            "图片工作台模板提示词",
            request.prompt,
            IMAGE_WORKBENCH_TEXT_MAX_CHARS,
        )?;
        let id = match request.id {
            Some(id) => Some(normalize_required_id("图片工作台模板 ID", &id)?),
            None => None,
        };
        self.repo()?.save_template(NewImageWorkbenchTemplate {
            id,
            name,
            prompt,
            negative_prompt: normalize_limited_optional_string(
                "图片工作台模板负向词",
                request.negative_prompt,
                IMAGE_WORKBENCH_TEXT_MAX_CHARS,
            )?,
            mode: request.mode,
        })
    }

    pub fn delete_template(&self, template_id: &str) -> AppResult<()> {
        let template_id = normalize_required_id("图片工作台模板 ID", template_id)?;
        self.repo()?.delete_template(&template_id)
    }

    fn run_image_tasks_with_generator<F>(
        &self,
        job_id: &str,
        task_ids: Option<&[String]>,
        worker_id: Option<&str>,
        generate: F,
    ) -> AppResult<ImageWorkbenchSnapshot>
    where
        F: FnMut(AiBusinessGenerationRequest) -> Result<AiGenerationResult, String>,
    {
        crate::services::image_workbench_runner::run_image_tasks_with_generator(
            self, job_id, task_ids, worker_id, generate,
        )
    }

    pub(crate) fn fail_generation_task(
        &self,
        job_id: &str,
        task_id: &str,
        job: &crate::infra::image_workbench_types::ImageWorkbenchJob,
        status: &str,
        error: String,
        result: Option<&AiGenerationResult>,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        let current = self.get_snapshot(job_id)?;
        let Some(task) = current.tasks.iter().find(|task| task.id == task_id) else {
            return Ok(current);
        };
        if matches!(task.status.as_str(), "succeeded" | "failed" | "cancelled") {
            return Ok(current);
        }

        self.update_task_status(UpdateImageWorkbenchTaskStatusRequest {
            task_id: task_id.to_string(),
            status: status.to_string(),
            error: Some(error.clone()),
            failure_type: result.and_then(|item| {
                generation_failure_kind_to_workbench_failure_type(item.failure_kind.as_deref())
            }),
            failure_hint: None,
            model_run: Some(generation_result_model_run(
                job,
                status,
                result,
                Some(error),
            )),
        })
    }

    pub(crate) fn repo(&self) -> AppResult<ImageWorkbenchRepo> {
        Ok(ImageWorkbenchRepo::new(
            self.path_provider.get_db_file_path()?,
        ))
    }

    fn delete_asset_files(
        &self,
        assets: &[ImageWorkbenchAsset],
    ) -> AppResult<DeleteImageWorkbenchAssetsResult> {
        let asset_root = self
            .path_provider
            .get_app_local_data_dir()?
            .join("ai")
            .join("image-workbench")
            .join("assets");
        fs::create_dir_all(&asset_root)?;
        let asset_root = asset_root.canonicalize().map_err(|error| {
            AppError::Io(format!(
                "Resolve Image Workbench asset root failed ({}): {}",
                asset_root.display(),
                error
            ))
        })?;
        let mut seen = HashSet::<PathBuf>::new();
        let mut deleted_files = 0;
        let mut skipped_files = 0;

        for asset in assets {
            for raw_path in [
                &asset.file_path,
                asset.thumbnail_path.as_deref().unwrap_or(""),
            ]
            .into_iter()
            .filter(|path| !path.trim().is_empty())
            {
                let path = PathBuf::from(raw_path);
                if !path.is_absolute() {
                    skipped_files += 1;
                    continue;
                }
                let Ok(canonical_path) = path.canonicalize() else {
                    skipped_files += 1;
                    continue;
                };
                if !canonical_path.starts_with(&asset_root) || !canonical_path.is_file() {
                    skipped_files += 1;
                    continue;
                }
                if !seen.insert(canonical_path.clone()) {
                    continue;
                }
                fs::remove_file(&canonical_path).map_err(|error| {
                    AppError::Io(format!(
                        "Delete Image Workbench asset file failed ({}): {}",
                        canonical_path.display(),
                        error
                    ))
                })?;
                deleted_files += 1;
            }
        }

        Ok(DeleteImageWorkbenchAssetsResult {
            deleted_assets: 0,
            deleted_files,
            skipped_files,
        })
    }

    fn refresh_snapshot_asset_integrity(
        &self,
        mut snapshot: ImageWorkbenchSnapshot,
    ) -> AppResult<ImageWorkbenchSnapshot> {
        snapshot.assets = self.refresh_asset_integrity_for_assets(snapshot.assets)?;
        Ok(snapshot)
    }

    pub(crate) fn refresh_asset_integrity_for_assets(
        &self,
        mut assets: Vec<ImageWorkbenchAsset>,
    ) -> AppResult<Vec<ImageWorkbenchAsset>> {
        if assets.is_empty() {
            return Ok(assets);
        }
        let checked_at_ms = now_ms_for_export();
        let mut patches = Vec::new();
        for asset in assets.iter_mut() {
            let (status, error) = inspect_asset_integrity(&asset.file_path);
            let should_update = asset.integrity_status != status
                || asset.integrity_error.as_deref() != error.as_deref()
                || asset.integrity_checked_at_ms.is_none();
            if should_update {
                asset.integrity_status = status.to_string();
                asset.integrity_error = error.clone();
                asset.integrity_checked_at_ms = Some(checked_at_ms);
                patches.push((
                    asset.id.clone(),
                    asset.integrity_status.clone(),
                    asset.integrity_error.clone(),
                    checked_at_ms,
                ));
            }
        }
        self.repo()?.update_asset_integrity_many(&patches)?;
        Ok(assets)
    }

    fn asset_path_policy(&self) -> ImageWorkbenchAssetPathPolicy {
        ImageWorkbenchAssetPathPolicy::new(self.path_provider.clone())
    }
}

fn inspect_asset_integrity(file_path: &str) -> (&'static str, Option<String>) {
    let path = PathBuf::from(file_path);
    match fs::metadata(&path) {
        Ok(metadata) if !metadata.is_file() => (
            IMAGE_WORKBENCH_ASSET_INTEGRITY_CORRUPT,
            Some("资产路径不是文件".to_string()),
        ),
        Ok(metadata) if metadata.len() == 0 => (
            IMAGE_WORKBENCH_ASSET_INTEGRITY_CORRUPT,
            Some("资产文件为空".to_string()),
        ),
        Ok(_) => (IMAGE_WORKBENCH_ASSET_INTEGRITY_OK, None),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => (
            IMAGE_WORKBENCH_ASSET_INTEGRITY_MISSING,
            Some("资产文件不存在".to_string()),
        ),
        Err(error) => (
            IMAGE_WORKBENCH_ASSET_INTEGRITY_CORRUPT,
            Some(format!("无法读取资产文件: {}", error)),
        ),
    }
}

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}

fn normalize_asset_ids(values: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::<String>::new();
    values
        .into_iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .filter(|value| seen.insert(value.clone()))
        .take(500)
        .collect()
}

fn parse_asset_query_sort(value: Option<String>) -> AppResult<ImageWorkbenchAssetSort> {
    match value
        .as_deref()
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .unwrap_or("favorite_then_recent")
    {
        "favorite_then_recent" | "favoriteThenRecent" => {
            Ok(ImageWorkbenchAssetSort::FavoriteThenRecent)
        }
        "recent_first" | "recentFirst" => Ok(ImageWorkbenchAssetSort::RecentFirst),
        "rating_desc" | "ratingDesc" => Ok(ImageWorkbenchAssetSort::RatingDesc),
        other => Err(AppError::Config(format!(
            "图片工作台暂不支持的资产排序: {}",
            other
        ))),
    }
}

fn normalize_reference_asset_ids_json(
    raw_json: Option<String>,
    raw_ids: Vec<String>,
) -> AppResult<Option<String>> {
    if let Some(value) = normalize_optional_json_string(
        "Image Workbench reference asset ids",
        raw_json,
        IMAGE_WORKBENCH_JSON_MAX_CHARS,
        false,
    )? {
        return Ok(Some(value));
    }

    let ids = raw_ids
        .into_iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .take(16)
        .collect::<Vec<_>>();
    if ids.is_empty() {
        return Ok(None);
    }

    serde_json::to_string(&ids).map(Some).map_err(|error| {
        AppError::Config(format!(
            "Image Workbench reference ids JSON failed: {}",
            error
        ))
    })
}

pub(crate) fn normalize_required_id(label: &str, value: &str) -> AppResult<String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(AppError::Config(format!("{}不能为空", label)));
    }
    Ok(value.to_string())
}

fn normalize_quality_issues(issues: Vec<String>) -> AppResult<Vec<String>> {
    let mut clean = Vec::new();
    for issue in issues {
        let issue = issue.trim();
        if issue.is_empty() {
            continue;
        }
        if !IMAGE_WORKBENCH_QUALITY_ISSUES.contains(&issue) {
            return Err(AppError::Config(format!("图片质检标签不支持: {}", issue)));
        }
        if !clean.iter().any(|item| item == issue) {
            clean.push(issue.to_string());
        }
    }
    Ok(clean)
}

fn normalize_limited_required_string(
    label: &str,
    value: String,
    max_chars: usize,
) -> AppResult<String> {
    let Some(value) = normalize_limited_optional_string(label, Some(value), max_chars)? else {
        return Err(AppError::Config(format!("{}不能为空", label)));
    };
    Ok(value)
}

fn normalize_limited_optional_string(
    label: &str,
    value: Option<String>,
    max_chars: usize,
) -> AppResult<Option<String>> {
    let Some(value) = normalize_optional_string(value) else {
        return Ok(None);
    };
    if value.chars().count() > max_chars {
        return Err(AppError::Config(format!(
            "{}长度不能超过 {} 个字符",
            label, max_chars
        )));
    }
    Ok(Some(value))
}

fn normalize_sanitized_optional_string(
    label: &str,
    value: Option<String>,
    max_chars: usize,
) -> AppResult<Option<String>> {
    Ok(normalize_limited_optional_string(label, value, max_chars)?
        .map(|value| sanitize_sensitive_text(&value)))
}

fn normalize_optional_json_string(
    label: &str,
    value: Option<String>,
    max_chars: usize,
    sanitize: bool,
) -> AppResult<Option<String>> {
    let Some(value) = normalize_limited_optional_string(label, value, max_chars)? else {
        return Ok(None);
    };
    let parsed: serde_json::Value = serde_json::from_str(&value)
        .map_err(|error| AppError::Config(format!("{}必须是合法 JSON: {}", label, error)))?;
    let rendered = serde_json::to_string(&parsed)
        .map_err(|error| AppError::Config(format!("{}序列化失败: {}", label, error)))?;
    Ok(Some(if sanitize {
        sanitize_sensitive_text(&rendered)
    } else {
        rendered
    }))
}

fn normalize_model_run_input(
    model_run: RecordImageWorkbenchModelRunInput,
) -> AppResult<NewImageWorkbenchModelRun> {
    Ok(NewImageWorkbenchModelRun {
        provider: normalize_limited_optional_string(
            "图片工作台模型调用 Provider",
            model_run.provider,
            IMAGE_WORKBENCH_SHORT_TEXT_MAX_CHARS,
        )?,
        model: normalize_limited_optional_string(
            "图片工作台模型调用模型",
            model_run.model,
            IMAGE_WORKBENCH_SHORT_TEXT_MAX_CHARS,
        )?,
        capability: normalize_limited_optional_string(
            "图片工作台模型调用能力",
            model_run.capability,
            IMAGE_WORKBENCH_SHORT_TEXT_MAX_CHARS,
        )?,
        status: normalize_model_run_status(model_run.status)?,
        latency_ms: model_run.latency_ms,
        request_json: normalize_optional_json_string(
            "图片工作台模型调用请求",
            model_run.request_json,
            IMAGE_WORKBENCH_JSON_MAX_CHARS,
            true,
        )?,
        response_preview: normalize_sanitized_optional_string(
            "图片工作台模型响应预览",
            model_run.response_preview,
            IMAGE_WORKBENCH_PREVIEW_MAX_CHARS,
        )?,
        error: normalize_sanitized_optional_string(
            "图片工作台模型调用错误",
            model_run.error,
            IMAGE_WORKBENCH_PREVIEW_MAX_CHARS,
        )?,
    })
}

fn normalize_model_run_status(value: Option<String>) -> AppResult<Option<String>> {
    let Some(status) = normalize_limited_optional_string(
        "图片工作台模型调用状态",
        value,
        IMAGE_WORKBENCH_SHORT_TEXT_MAX_CHARS,
    )?
    else {
        return Ok(None);
    };
    if !matches!(
        status.as_str(),
        "queued" | "running" | "succeeded" | "failed" | "cancelled"
    ) {
        return Err(AppError::Config(format!(
            "图片工作台暂不支持的模型调用状态: {}",
            status
        )));
    }
    Ok(Some(status))
}

fn export_asset_file_name(
    index: usize,
    asset: &crate::infra::image_workbench_types::ImageWorkbenchAsset,
    source: &Path,
) -> String {
    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("png");
    format!(
        "{:03}_{}_{}.{}",
        index + 1,
        sanitize_file_stem(&asset.task_id),
        sanitize_file_stem(&asset.id),
        extension
    )
}

fn sanitize_file_stem(value: &str) -> String {
    let mut result = String::new();
    for ch in value.chars() {
        if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_') {
            result.push(ch);
        } else {
            result.push('_');
        }
    }
    if result.is_empty() {
        "image-workbench".to_string()
    } else {
        result.chars().take(80).collect()
    }
}

fn write_pretty_json(path: PathBuf, value: &serde_json::Value) -> AppResult<()> {
    let bytes = serde_json::to_vec_pretty(value)
        .map_err(|error| AppError::Config(format!("图片工作台导出 JSON 失败: {}", error)))?;
    fs::write(path, bytes)?;
    Ok(())
}

fn now_ms_for_export() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

fn parse_reference_asset_ids(value: Option<&str>) -> Vec<String> {
    let Some(value) = value else {
        return Vec::new();
    };
    serde_json::from_str::<Vec<String>>(value)
        .unwrap_or_default()
        .into_iter()
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
        .collect()
}

fn push_unique_path(paths: &mut Vec<String>, value: Option<&str>) {
    let Some(path) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return;
    };
    if paths.iter().any(|item| item == path) {
        return;
    }
    paths.push(path.to_string());
}

fn push_reference_paths_from_person_context(paths: &mut Vec<String>, value: Option<&str>) {
    let Some(value) = value.map(str::trim).filter(|value| !value.is_empty()) else {
        return;
    };
    let Ok(parsed) = serde_json::from_str::<serde_json::Value>(value) else {
        return;
    };
    push_unique_path(
        paths,
        parsed.get("sourceImagePath").and_then(|item| item.as_str()),
    );
    if let Some(items) = parsed
        .get("referenceImagePaths")
        .and_then(|item| item.as_array())
    {
        for item in items {
            push_unique_path(paths, item.as_str());
        }
    }
}

fn has_active_image_workbench_generation_task() -> AppResult<bool> {
    let tasks = list_recent_generation_tasks().map_err(AppError::Config)?;
    Ok(tasks.iter().any(|task| {
        task.request_id.starts_with("iw-task-")
            && !matches!(task.status.as_str(), "success" | "failed" | "canceled")
    }))
}

#[cfg(test)]
#[path = "image_workbench_service_tests.rs"]
mod tests;
