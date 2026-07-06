use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateImageWorkbenchJobRequest {
    pub mode: String,
    pub prompt: String,
    pub negative_prompt: Option<String>,
    #[serde(default)]
    pub task_prompts: Vec<String>,
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
    pub generation_options_json: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateImageWorkbenchTaskStatusRequest {
    pub task_id: String,
    pub status: String,
    pub error: Option<String>,
    pub failure_type: Option<String>,
    pub failure_hint: Option<String>,
    pub model_run: Option<RecordImageWorkbenchModelRunInput>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplanImageWorkbenchStoryboardGroupRequest {
    pub group_id: String,
    pub variants_per_scene: Option<u32>,
    pub provider_config_id: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveImageWorkbenchStoryboardGroupRequest {
    pub group_id: String,
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
pub struct SetImageWorkbenchAssetRatingRequest {
    pub asset_id: String,
    pub rating: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetImageWorkbenchAssetQualityIssuesRequest {
    pub asset_id: String,
    #[serde(default)]
    pub quality_issues: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteImageWorkbenchAssetsRequest {
    #[serde(default)]
    pub asset_ids: Vec<String>,
    pub delete_files: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteImageWorkbenchAssetsResult {
    pub deleted_assets: u32,
    pub deleted_files: u32,
    pub skipped_files: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteImageWorkbenchJobResult {
    pub removed_job: bool,
    pub deleted_assets: u32,
    pub deleted_files: u32,
    pub skipped_files: u32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagImageWorkbenchAssetsGroupRequest {
    #[serde(default)]
    pub asset_ids: Vec<String>,
    pub group_id: Option<String>,
    pub group_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportImageWorkbenchGroupRequest {
    pub group_id: Option<String>,
    pub group_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryImageWorkbenchAssetsRequest {
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub group_id: Option<String>,
    pub min_rating: Option<u32>,
    pub sort: Option<String>,
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
    pub max_quantity: Option<u32>,
}
