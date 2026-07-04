use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageWorkbenchJob {
    pub id: String,
    pub mode: String,
    pub status: String,
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub quantity: u32,
    pub provider_config_id: Option<String>,
    pub model: Option<String>,
    pub size: Option<String>,
    pub reference_asset_ids_json: Option<String>,
    pub source_asset_id: Option<String>,
    pub source_image_path: Option<String>,
    pub mask_path: Option<String>,
    pub person_context_json: Option<String>,
    pub upscale_scale: Option<u32>,
    pub fallback_policy: Option<String>,
    pub generation_options_json: Option<String>,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
    pub queued_at_ms: Option<i64>,
    pub started_at_ms: Option<i64>,
    pub finished_at_ms: Option<i64>,
    pub error: Option<String>,
    pub archived_at_ms: Option<i64>,
    pub deleted_at_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageWorkbenchTask {
    pub id: String,
    pub job_id: String,
    pub queue_index: u32,
    pub status: String,
    pub retry_count: u32,
    pub max_retries: u32,
    pub claim_token: Option<String>,
    pub leased_until_ms: Option<i64>,
    pub prompt: Option<String>,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
    pub started_at_ms: Option<i64>,
    pub finished_at_ms: Option<i64>,
    pub error: Option<String>,
    pub group_id: Option<String>,
    pub variant_index: Option<u32>,
    pub failure_type: Option<String>,
    pub failure_hint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageWorkbenchAsset {
    pub id: String,
    pub job_id: String,
    pub task_id: String,
    pub file_path: String,
    pub thumbnail_path: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub mime_type: Option<String>,
    pub size_bytes: Option<u64>,
    pub favorite: bool,
    pub created_at_ms: i64,
    pub group_id: Option<String>,
    pub rating: Option<u32>,
    pub parent_asset_id: Option<String>,
    pub root_asset_id: Option<String>,
    pub version_index: Option<u32>,
    pub delivery_status: Option<String>,
    pub quality_issues: Vec<String>,
    pub integrity_status: String,
    pub integrity_error: Option<String>,
    pub integrity_checked_at_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageWorkbenchMetadata {
    pub id: String,
    pub asset_id: String,
    pub task_id: String,
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
    pub created_at_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageWorkbenchModelRun {
    pub id: String,
    pub job_id: String,
    pub task_id: Option<String>,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub capability: Option<String>,
    pub status: String,
    pub latency_ms: Option<u64>,
    pub request_json: Option<String>,
    pub response_preview: Option<String>,
    pub error: Option<String>,
    pub created_at_ms: i64,
    pub finished_at_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageWorkbenchTemplate {
    pub id: String,
    pub name: String,
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub mode: String,
    pub is_system: bool,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
}

/// 资产组：把同一作业（或同源复跑）下的 N 张变体归到一起，承载来源、
/// agent 预设和基底提示词。本轮先落存储与读写，grouped job 业务编排留后续轮次。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageWorkbenchGroup {
    pub id: String,
    pub job_id: String,
    pub source_id: Option<String>,
    pub name: Option<String>,
    pub r#type: Option<String>,
    pub agent_preset: Option<String>,
    pub agent_ids_json: Option<String>,
    pub base_prompt: Option<String>,
    pub count: u32,
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
}

#[derive(Debug, Clone, Default)]
pub struct NewImageWorkbenchGroup {
    pub job_id: String,
    pub source_id: Option<String>,
    pub name: Option<String>,
    pub r#type: Option<String>,
    pub agent_preset: Option<String>,
    pub agent_ids_json: Option<String>,
    pub base_prompt: Option<String>,
    pub count: u32,
}

/// 跨作业资产库查询条件。本轮先在 repo 落地分页 / 筛选 / 排序能力并由单测覆盖，
/// command 层仍只暴露 limit（薄包装委托给本结构），前端接入留后续轮次。
#[derive(Debug, Clone)]
pub struct ImageWorkbenchAssetQuery {
    pub limit: u32,
    pub offset: u32,
    pub group_id: Option<String>,
    pub min_rating: Option<u32>,
    pub sort: ImageWorkbenchAssetSort,
}

impl Default for ImageWorkbenchAssetQuery {
    fn default() -> Self {
        Self {
            limit: 50,
            offset: 0,
            group_id: None,
            min_rating: None,
            sort: ImageWorkbenchAssetSort::FavoriteThenRecent,
        }
    }
}

/// 资产库排序键。`FavoriteThenRecent` 与历史 `list_recent_assets` 行为一致，
/// 作为默认值保证既有 command 不变；其余键供后续筛选视图使用。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[allow(dead_code)]
pub enum ImageWorkbenchAssetSort {
    FavoriteThenRecent,
    RecentFirst,
    RatingDesc,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageWorkbenchSnapshot {
    pub job: ImageWorkbenchJob,
    pub tasks: Vec<ImageWorkbenchTask>,
    pub assets: Vec<ImageWorkbenchAsset>,
    pub metadata: Vec<ImageWorkbenchMetadata>,
    pub model_runs: Vec<ImageWorkbenchModelRun>,
}

#[derive(Debug, Clone)]
pub struct ImageWorkbenchTaskClaim {
    pub task_id: String,
    pub claim_token: String,
    pub snapshot: ImageWorkbenchSnapshot,
}

#[derive(Debug, Clone)]
pub struct NewImageWorkbenchJob {
    pub mode: String,
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub task_prompts: Vec<String>,
    pub quantity: u32,
    pub provider_config_id: Option<String>,
    pub model: Option<String>,
    pub size: Option<String>,
    pub reference_asset_ids_json: Option<String>,
    pub source_asset_id: Option<String>,
    pub source_image_path: Option<String>,
    pub mask_path: Option<String>,
    pub person_context_json: Option<String>,
    pub upscale_scale: Option<u32>,
    pub fallback_policy: Option<String>,
    pub generation_options_json: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ImageWorkbenchTaskStatusPatch {
    pub task_id: String,
    pub status: String,
    pub error: Option<String>,
    pub failure_type: Option<String>,
    pub failure_hint: Option<String>,
    pub model_run: Option<NewImageWorkbenchModelRun>,
}

#[derive(Debug, Clone, Default)]
pub struct NewImageWorkbenchAsset {
    pub task_id: String,
    pub file_path: String,
    pub thumbnail_path: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub mime_type: Option<String>,
    pub size_bytes: Option<u64>,
    pub group_id: Option<String>,
    pub rating: Option<u32>,
    pub parent_asset_id: Option<String>,
    pub root_asset_id: Option<String>,
    pub version_index: Option<u32>,
    pub import_fingerprint: Option<String>,
    pub import_source_path: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct NewImageWorkbenchMetadata {
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

#[derive(Debug, Clone, Default)]
pub struct NewImageWorkbenchModelRun {
    pub provider: Option<String>,
    pub model: Option<String>,
    pub capability: Option<String>,
    pub status: Option<String>,
    pub latency_ms: Option<u64>,
    pub request_json: Option<String>,
    pub response_preview: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub struct NewImageWorkbenchTemplate {
    pub id: Option<String>,
    pub name: String,
    pub prompt: String,
    pub negative_prompt: Option<String>,
    pub mode: String,
}
