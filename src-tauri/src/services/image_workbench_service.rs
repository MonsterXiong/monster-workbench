use crate::infra::image_workbench_repo::ImageWorkbenchRepo;
use crate::infra::image_workbench_types::{
    ImageWorkbenchAsset, ImageWorkbenchJob, ImageWorkbenchSnapshot, ImageWorkbenchTaskStatusPatch,
    ImageWorkbenchTemplate, NewImageWorkbenchAsset, NewImageWorkbenchJob,
    NewImageWorkbenchMetadata, NewImageWorkbenchModelRun, NewImageWorkbenchTemplate,
};
use crate::infra::path::PathProvider;
use crate::infra::sensitive::sanitize_sensitive_text;
use crate::infra::{AppError, AppResult};
use crate::services::ai_generation_task::list_recent_generation_tasks;
use crate::services::ai_provider_types::{
    AiBusinessGenerationRequest, AiGenerationArtifact, AiGenerationOptions, AiGenerationResult,
};
use crate::services::ai_service::AiProviderService;
use crate::services::image_workbench_asset_policy::ImageWorkbenchAssetPathPolicy;
use crate::services::image_workbench_mask::{
    build_mask_svg, normalize_mask_strokes, SaveImageWorkbenchMaskRequest,
    SaveImageWorkbenchMaskResult,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

const MAX_IMAGE_WORKBENCH_QUANTITY: u32 = 16;
const IMAGE_WORKBENCH_TEXT_MAX_CHARS: usize = 8_192;
const IMAGE_WORKBENCH_SHORT_TEXT_MAX_CHARS: usize = 256;
const IMAGE_WORKBENCH_JSON_MAX_CHARS: usize = 16_384;
const IMAGE_WORKBENCH_PREVIEW_MAX_CHARS: usize = 4_096;
const IMAGE_WORKBENCH_TEMPLATE_NAME_MAX_CHARS: usize = 80;
const IMAGE_WORKBENCH_TASK_LEASE_MS: i64 = 2 * 60 * 60 * 1000;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateImageWorkbenchJobRequest {
    pub mode: String,
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub quantity: u32,
    pub provider_config_id: Option<String>,
    pub model: Option<String>,
    pub size: Option<String>,
    #[serde(default)]
    pub reference_asset_ids: Vec<String>,
    pub reference_asset_ids_json: Option<String>,
    pub source_asset_id: Option<String>,
    pub source_image_path: Option<String>,
    pub mask_path: Option<String>,
    pub person_context_json: Option<String>,
    pub upscale_scale: Option<u32>,
    pub fallback_policy: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateImageWorkbenchTaskStatusRequest {
    pub task_id: String,
    pub status: String,
    pub error: Option<String>,
    pub model_run: Option<RecordImageWorkbenchModelRunInput>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordImageWorkbenchAssetRequest {
    pub task_id: String,
    pub file_path: String,
    pub thumbnail_path: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub mime_type: Option<String>,
    pub size_bytes: Option<u64>,
    pub metadata: Option<RecordImageWorkbenchMetadataInput>,
    pub model_run: Option<RecordImageWorkbenchModelRunInput>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordImageWorkbenchMetadataInput {
    pub original_prompt: Option<String>,
    pub expanded_prompt: Option<String>,
    pub negative_prompt: Option<String>,
    pub seed: Option<String>,
    pub model: Option<String>,
    pub mode: Option<String>,
    pub provider: Option<String>,
    pub reference_asset_ids_json: Option<String>,
    pub mask_path: Option<String>,
    pub person_context_json: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordImageWorkbenchModelRunInput {
    pub provider: Option<String>,
    pub model: Option<String>,
    pub capability: Option<String>,
    pub status: Option<String>,
    pub latency_ms: Option<u64>,
    pub request_json: Option<String>,
    pub response_preview: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveImageWorkbenchTemplateRequest {
    pub id: Option<String>,
    pub name: String,
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub mode: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetImageWorkbenchAssetFavoriteRequest {
    pub asset_id: String,
    pub favorite: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportImageWorkbenchReferenceRequest {
    pub source_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportImageWorkbenchReferenceResult {
    pub file_path: String,
    pub original_path: String,
    pub mime_type: Option<String>,
    pub size_bytes: u64,
    pub created_at_ms: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageWorkbenchContractSummary {
    pub tables: Vec<String>,
    pub job_statuses: Vec<String>,
    pub task_statuses: Vec<String>,
    pub supported_modes: Vec<String>,
    pub deferred_modes: Vec<String>,
    pub max_quantity: u32,
}

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
            max_quantity: MAX_IMAGE_WORKBENCH_QUANTITY,
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
        if request.quantity == 0 || request.quantity > MAX_IMAGE_WORKBENCH_QUANTITY {
            return Err(AppError::Config(format!(
                "图片工作台任务数量必须在 1 到 {} 之间",
                MAX_IMAGE_WORKBENCH_QUANTITY
            )));
        }
        let negative_prompt = merge_negative_prompt(&prompt, request.negative_prompt);
        let task_prompts = build_expanded_task_prompts(&prompt, request.quantity);

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
        })
    }

    pub fn list_jobs(&self, limit: Option<u32>) -> AppResult<Vec<ImageWorkbenchJob>> {
        self.repo()?.list_jobs(limit.unwrap_or(50))
    }

    pub fn list_assets(&self, limit: Option<u32>) -> AppResult<Vec<ImageWorkbenchAsset>> {
        self.repo()?.list_recent_assets(limit.unwrap_or(100))
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

    pub fn get_snapshot(&self, job_id: &str) -> AppResult<ImageWorkbenchSnapshot> {
        if job_id.trim().is_empty() {
            return Err(AppError::Config("图片工作台作业 ID 不能为空".to_string()));
        }
        self.repo()?.get_snapshot(job_id)
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

    pub fn retry_failed_tasks(&self, job_id: &str) -> AppResult<ImageWorkbenchSnapshot> {
        let job_id = normalize_required_id("图片工作台作业 ID", job_id)?;
        self.repo()?.retry_failed_tasks(&job_id)
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
        tauri::async_runtime::spawn_blocking(move || {
            let service = ImageWorkbenchService::new(path_provider);
            let ai_service = AiProviderService::new(app_handle);
            let _ = service.run_image_tasks_with_generator(
                &job_id,
                None,
                Some(worker_id.as_str()),
                |request| ai_service.run_business_generation_blocking(request),
            );
        });
        Ok(snapshot)
    }

    pub fn recover_interrupted_jobs(&self) -> AppResult<u32> {
        if has_active_image_workbench_generation_task()? {
            return Ok(0);
        }
        self.repo()?
            .recover_interrupted_jobs("应用重启后，未完成的图片工作台任务已中止")
    }

    pub fn delete_job(&self, job_id: &str) -> AppResult<()> {
        let job_id = normalize_required_id("图片工作台作业 ID", job_id)?;
        self.repo()?.delete_job(&job_id)
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

    pub fn save_mask(
        &self,
        request: SaveImageWorkbenchMaskRequest,
    ) -> AppResult<SaveImageWorkbenchMaskResult> {
        let asset_id = normalize_required_id("图片工作台资产 ID", &request.asset_id)?;
        let _asset = self.repo()?.get_asset_by_id(&asset_id)?;
        let mask = normalize_mask_strokes(request.width, request.height, request.strokes)?;
        let created_at_ms = now_ms_for_export();
        let mask_dir = self
            .path_provider
            .get_app_local_data_dir()?
            .join("ai")
            .join("image-workbench")
            .join("masks");
        fs::create_dir_all(&mask_dir)?;

        let file_name = format!("{}-{}.svg", sanitize_file_stem(&asset_id), created_at_ms);
        let mask_path = mask_dir.join(file_name);
        fs::write(&mask_path, build_mask_svg(&mask))?;

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
        let model_run = match request.model_run {
            Some(model_run) => Some(normalize_model_run_input(model_run)?),
            None => None,
        };
        self.repo()?
            .update_task_status(ImageWorkbenchTaskStatusPatch {
                task_id: request.task_id,
                status: request.status,
                error: normalize_optional_string(request.error),
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
                mask_path: asset_path_policy.normalize_optional_asset_path(
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

    fn run_txt2img_tasks_with_generator<F>(
        &self,
        job_id: &str,
        task_ids: Option<&[String]>,
        worker_id: Option<&str>,
        mut generate: F,
    ) -> AppResult<ImageWorkbenchSnapshot>
    where
        F: FnMut(AiBusinessGenerationRequest) -> Result<AiGenerationResult, String>,
    {
        self.run_image_tasks_with_generator(job_id, task_ids, worker_id, |request| {
            generate(request)
        })
    }

    fn run_image_tasks_with_generator<F>(
        &self,
        job_id: &str,
        task_ids: Option<&[String]>,
        worker_id: Option<&str>,
        mut generate: F,
    ) -> AppResult<ImageWorkbenchSnapshot>
    where
        F: FnMut(AiBusinessGenerationRequest) -> Result<AiGenerationResult, String>,
    {
        let mut latest = self.get_snapshot(job_id)?;
        validate_workbench_mode(&latest.job.mode, false)?;

        loop {
            let Some(claim) = self.repo()?.claim_next_runnable_task_for_worker(
                job_id,
                task_ids,
                IMAGE_WORKBENCH_TASK_LEASE_MS,
                worker_id,
            )?
            else {
                break;
            };
            latest = claim.snapshot;
            let task_id = claim.task_id;

            if latest.assets.iter().any(|asset| asset.task_id == task_id) {
                latest = self.update_task_status(UpdateImageWorkbenchTaskStatusRequest {
                    task_id: task_id.clone(),
                    status: "succeeded".to_string(),
                    error: None,
                    model_run: None,
                })?;
                continue;
            }

            let job = latest.job.clone();
            let Some(task) = latest.tasks.iter().find(|task| task.id == task_id) else {
                continue;
            };
            let prompt = task
                .prompt
                .clone()
                .filter(|value| !value.trim().is_empty())
                .unwrap_or_else(|| job.prompt.clone());
            let target_size = job.size.clone();
            let request = AiBusinessGenerationRequest {
                capability: job.mode.clone(),
                provider_config_id: job.provider_config_id.clone(),
                prompt: prompt.clone(),
                model: job.model.clone(),
                request_id: Some(task_id.clone()),
                options: generation_options_for_job(&job, target_size.clone()),
            };

            let generation_result = generate(request);
            let current = self.get_snapshot(job_id)?;
            let Some(current_task) = current.tasks.iter().find(|task| task.id == task_id) else {
                latest = current;
                continue;
            };
            if matches!(
                current_task.status.as_str(),
                "succeeded" | "failed" | "cancelled"
            ) {
                latest = current;
                continue;
            }

            match generation_result {
                Ok(result) => {
                    if !result.ok {
                        latest = self.fail_generation_task(
                            job_id,
                            &task_id,
                            &job,
                            "failed",
                            result.message.clone(),
                            Some(&result),
                        )?;
                        continue;
                    }

                    let Some(artifact) = pick_image_artifact(&result.artifacts) else {
                        latest = self.fail_generation_task(
                            job_id,
                            &task_id,
                            &job,
                            "failed",
                            "AI 生成结果缺少本地图片路径".to_string(),
                            Some(&result),
                        )?;
                        continue;
                    };
                    let Some(artifact_path) = artifact.path.clone() else {
                        latest = self.fail_generation_task(
                            job_id,
                            &task_id,
                            &job,
                            "failed",
                            "AI 生成结果缺少本地图片路径".to_string(),
                            Some(&result),
                        )?;
                        continue;
                    };

                    self.record_asset(RecordImageWorkbenchAssetRequest {
                        task_id: task_id.clone(),
                        file_path: artifact_path,
                        thumbnail_path: None,
                        width: parse_artifact_dimensions(artifact.dimensions.as_deref()).0,
                        height: parse_artifact_dimensions(artifact.dimensions.as_deref()).1,
                        mime_type: artifact
                            .mime_type
                            .clone()
                            .or_else(|| Some("image/png".to_string())),
                        size_bytes: artifact.size_bytes,
                        metadata: Some(RecordImageWorkbenchMetadataInput {
                            original_prompt: Some(job.prompt.clone()),
                            expanded_prompt: Some(prompt.clone()),
                            negative_prompt: job.negative_prompt.clone(),
                            seed: None,
                            model: Some(result.model.clone()),
                            mode: Some(job.mode.clone()),
                            provider: Some(result.provider.clone()),
                            reference_asset_ids_json: job.reference_asset_ids_json.clone(),
                            mask_path: job.mask_path.clone(),
                            person_context_json: job.person_context_json.clone(),
                        }),
                        model_run: Some(generation_result_model_run(
                            &job,
                            "succeeded",
                            Some(&result),
                            None,
                        )),
                    })?;
                    latest = self.update_task_status(UpdateImageWorkbenchTaskStatusRequest {
                        task_id: task_id.clone(),
                        status: "succeeded".to_string(),
                        error: None,
                        model_run: None,
                    })?;
                }
                Err(error) => {
                    let status = if is_cancel_error(&error) {
                        "cancelled"
                    } else {
                        "failed"
                    };
                    latest =
                        self.fail_generation_task(job_id, &task_id, &job, status, error, None)?;
                }
            }
        }

        Ok(latest)
    }

    fn fail_generation_task(
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
            model_run: Some(generation_result_model_run(
                job,
                status,
                result,
                Some(error),
            )),
        })
    }

    fn repo(&self) -> AppResult<ImageWorkbenchRepo> {
        Ok(ImageWorkbenchRepo::new(
            self.path_provider.get_db_file_path()?,
        ))
    }

    fn asset_path_policy(&self) -> ImageWorkbenchAssetPathPolicy {
        ImageWorkbenchAssetPathPolicy::new(self.path_provider.clone())
    }
}

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
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

fn normalize_upscale_scale(mode: &str, value: Option<u32>) -> AppResult<Option<u32>> {
    if mode == "upscale_2x" {
        return Ok(Some(value.unwrap_or(2).clamp(2, 2)));
    }
    if mode == "upscale_4x" {
        return Ok(Some(value.unwrap_or(4).clamp(4, 4)));
    }
    if let Some(scale) = value {
        if !matches!(scale, 2 | 4) {
            return Err(AppError::Config(
                "Image Workbench upscale scale must be 2 or 4".to_string(),
            ));
        }
        return Ok(Some(scale));
    }
    Ok(None)
}

fn has_reference_context(
    reference_asset_ids_json: Option<&str>,
    source_asset_id: Option<&str>,
    source_image_path: Option<&str>,
) -> bool {
    reference_asset_ids_json.is_some_and(|value| !value.trim().is_empty())
        || source_asset_id.is_some_and(|value| !value.trim().is_empty())
        || source_image_path.is_some_and(|value| !value.trim().is_empty())
}

fn validate_mode_context(
    mode: &str,
    reference_asset_ids_json: Option<&str>,
    source_asset_id: Option<&str>,
    source_image_path: Option<&str>,
    mask_path: Option<&str>,
) -> AppResult<()> {
    match mode {
        "txt2img" => Ok(()),
        "img2img" | "person_consistency" => {
            if has_reference_context(reference_asset_ids_json, source_asset_id, source_image_path) {
                Ok(())
            } else {
                Err(AppError::Config(
                    "Image Workbench reference image is required".to_string(),
                ))
            }
        }
        "inpaint" => {
            if !has_reference_context(reference_asset_ids_json, source_asset_id, source_image_path)
            {
                return Err(AppError::Config(
                    "Image Workbench source image is required".to_string(),
                ));
            }
            if mask_path
                .map(|value| value.trim().is_empty())
                .unwrap_or(true)
            {
                return Err(AppError::Config(
                    "Image Workbench mask path is required".to_string(),
                ));
            }
            Ok(())
        }
        "upscale_2x" | "upscale_4x" => {
            if has_reference_context(reference_asset_ids_json, source_asset_id, source_image_path) {
                Ok(())
            } else {
                Err(AppError::Config(
                    "Image Workbench source image is required".to_string(),
                ))
            }
        }
        _ => validate_workbench_mode(mode, false),
    }
}

fn normalize_job_prompt(
    mode: &str,
    prompt: String,
    reference_asset_ids_json: Option<&str>,
    source_asset_id: Option<&str>,
    source_image_path: Option<&str>,
    upscale_scale: Option<u32>,
) -> AppResult<String> {
    let prompt = prompt.trim();
    if !prompt.is_empty() {
        return Ok(prompt.to_string());
    }
    if mode == "txt2img" {
        return Err(AppError::Config("图片工作台任务提示词不能为空".to_string()));
    }
    if mode == "img2img" {
        return Ok("Generate visual variations from the reference image.".to_string());
    }
    if mode == "person_consistency" {
        return Ok("Generate a new scene while keeping the same person identity as much as the model allows.".to_string());
    }
    if mode == "inpaint" {
        return Err(AppError::Config(
            "Image Workbench inpaint prompt is required".to_string(),
        ));
    }
    if mode == "upscale_2x" || mode == "upscale_4x" {
        let scale = upscale_scale.unwrap_or(if mode == "upscale_4x" { 4 } else { 2 });
        let source = source_asset_id
            .or(source_image_path)
            .or(reference_asset_ids_json)
            .unwrap_or("source image");
        return Ok(format!(
            "Upscale {source} to {scale}x without changing the content."
        ));
    }
    Err(AppError::Config(format!(
        "图片工作台暂不支持的任务模式: {}",
        mode
    )))
}

fn normalize_required_id(label: &str, value: &str) -> AppResult<String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(AppError::Config(format!("{}不能为空", label)));
    }
    Ok(value.to_string())
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

fn validate_workbench_mode(mode: &str, allow_deferred: bool) -> AppResult<()> {
    let supported = matches!(
        mode,
        "img2img" | "inpaint" | "person_consistency" | "upscale_2x" | "upscale_4x"
    ) || mode == "txt2img";
    let deferred = false;
    if supported || (allow_deferred && deferred) {
        return Ok(());
    }
    Err(AppError::Config(format!(
        "图片工作台暂不支持的任务模式: {}",
        mode
    )))
}

fn build_expanded_task_prompts(prompt: &str, quantity: u32) -> Vec<String> {
    let clean_prompt = prompt.trim();
    let analysis = analyze_prompt(clean_prompt);
    let count = quantity.max(1) as usize;
    (0..count)
        .map(|index| {
            let variation = PROMPT_VARIATION_DIMENSIONS[index % PROMPT_VARIATION_DIMENSIONS.len()];
            format!(
                "{clean_prompt}。保持核心语义和高权重关键词不变：{}。差异化方向：{}。画面要求：主体明确、细节丰富、构图完整、无文字水印。",
                analysis.core_constraints.join("、"),
                variation
            )
        })
        .collect()
}

fn merge_negative_prompt(prompt: &str, user_negative_prompt: Option<String>) -> Option<String> {
    let mut values = Vec::new();
    if let Some(value) = normalize_optional_string(user_negative_prompt) {
        values.push(value);
    }
    values.extend(
        default_negative_constraints(prompt)
            .into_iter()
            .map(str::to_string),
    );
    Some(dedupe_join(values))
}

#[derive(Debug)]
struct PromptAnalysis {
    core_constraints: Vec<String>,
}

fn analyze_prompt(prompt: &str) -> PromptAnalysis {
    let mut core_constraints = split_prompt_terms(prompt);
    if core_constraints.is_empty() {
        core_constraints.push(prompt.trim().to_string());
    }
    PromptAnalysis { core_constraints }
}

fn split_prompt_terms(prompt: &str) -> Vec<String> {
    let separators = [
        '，', ',', '。', '.', '、', ';', '；', '|', '/', '\\', '\n', '\r', '\t', ' ',
    ];
    let mut terms = prompt
        .split(|ch| separators.contains(&ch))
        .map(str::trim)
        .filter(|term| !term.is_empty())
        .map(|term| term.chars().take(32).collect::<String>())
        .collect::<Vec<_>>();
    if terms.is_empty() && !prompt.trim().is_empty() {
        terms.push(prompt.trim().chars().take(32).collect());
    }
    terms.truncate(8);
    terms
}

fn default_negative_constraints(prompt: &str) -> Vec<&'static str> {
    let mut values = vec!["低质量", "文字", "水印", "主体错误", "构图混乱"];
    let lower = prompt.to_ascii_lowercase();
    if prompt.contains("人")
        || prompt.contains("脸")
        || prompt.contains("美女")
        || lower.contains("portrait")
        || lower.contains("person")
    {
        values.extend(["未成年感", "过度暴露", "脸部畸形", "多余手指"]);
    }
    values
}

fn dedupe_join(values: Vec<String>) -> String {
    let mut seen = Vec::<String>::new();
    for value in values {
        for part in value
            .split(|ch| matches!(ch, ',' | '，' | '、' | ';' | '；' | '\n' | '\r'))
            .map(str::trim)
            .filter(|part| !part.is_empty())
        {
            if !seen.iter().any(|item| item == part) {
                seen.push(part.to_string());
            }
        }
    }
    seen.join("，")
}

const PROMPT_VARIATION_DIMENSIONS: [&str; 8] = [
    "近景构图，强调主体质感和细节",
    "远景构图，强调环境层次和空间关系",
    "低角度视角，增强力量感和戏剧性",
    "高角度视角，强调整体布局和氛围",
    "柔和自然光，画面干净细腻",
    "电影感侧光，增强明暗对比",
    "浅景深，突出主体并弱化背景",
    "广角视角，增强场景规模和纵深",
];

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

fn pick_image_artifact(artifacts: &[AiGenerationArtifact]) -> Option<&AiGenerationArtifact> {
    artifacts
        .iter()
        .find(|artifact| artifact.kind == "image" && artifact.path.is_some())
}

fn parse_artifact_dimensions(value: Option<&str>) -> (Option<u32>, Option<u32>) {
    let Some(value) = value else {
        return (None, None);
    };
    let Some((width, height)) = value.split_once('x') else {
        return (None, None);
    };
    let width = width.trim().parse::<u32>().ok();
    let height = height.trim().parse::<u32>().ok();
    (width, height)
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

fn generation_options_for_job(
    job: &crate::infra::image_workbench_types::ImageWorkbenchJob,
    target_size: Option<String>,
) -> AiGenerationOptions {
    AiGenerationOptions {
        size: target_size,
        count: 1,
        reference_asset_ids: parse_reference_asset_ids(job.reference_asset_ids_json.as_deref()),
        reference_image_path: job.source_image_path.clone(),
        source_asset_id: job.source_asset_id.clone(),
        source_image_path: job.source_image_path.clone(),
        mask_path: job.mask_path.clone(),
        person_context_json: job.person_context_json.clone(),
        scale: job.upscale_scale,
        fallback_mode: job.fallback_policy.clone(),
        ..Default::default()
    }
}

fn generation_result_model_run(
    job: &crate::infra::image_workbench_types::ImageWorkbenchJob,
    status: &str,
    result: Option<&AiGenerationResult>,
    error: Option<String>,
) -> RecordImageWorkbenchModelRunInput {
    RecordImageWorkbenchModelRunInput {
        provider: result
            .map(|result| result.provider.clone())
            .or_else(|| Some("unknown".to_string())),
        model: result
            .map(|result| result.model.clone())
            .or_else(|| job.model.clone()),
        capability: Some(job.mode.clone()),
        status: Some(status.to_string()),
        latency_ms: result.map(|result| result.latency_ms),
        request_json: Some(
            serde_json::to_string(&json!({
                "mode": &job.mode,
                "size": &job.size,
                "count": 1,
                "referenceAssetIdsJson": &job.reference_asset_ids_json,
                "sourceAssetId": &job.source_asset_id,
                "sourceImagePath": &job.source_image_path,
                "maskPath": &job.mask_path,
                "personContextJson": &job.person_context_json,
                "upscaleScale": job.upscale_scale,
                "fallbackPolicy": &job.fallback_policy,
            }))
            .unwrap_or_else(|_| "{}".to_string()),
        ),
        response_preview: result.and_then(|result| result.raw_preview.clone()),
        error,
    }
}

fn cancelled_generation_model_run(
    job: &crate::infra::image_workbench_types::ImageWorkbenchJob,
) -> RecordImageWorkbenchModelRunInput {
    RecordImageWorkbenchModelRunInput {
        provider: Some("unknown".to_string()),
        model: job.model.clone(),
        capability: Some(job.mode.clone()),
        status: Some("cancelled".to_string()),
        latency_ms: None,
        request_json: Some(
            serde_json::to_string(&json!({
                "mode": job.mode,
                "size": job.size,
                "count": 1,
            }))
            .unwrap_or_else(|_| "{}".to_string()),
        ),
        response_preview: None,
        error: Some("用户取消".to_string()),
    }
}

fn is_cancel_error(error: &str) -> bool {
    error.contains("取消")
        || error.contains("中止")
        || error.to_ascii_lowercase().contains("cancel")
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
