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
    pub created_at_ms: i64,
    pub updated_at_ms: i64,
    pub queued_at_ms: Option<i64>,
    pub started_at_ms: Option<i64>,
    pub finished_at_ms: Option<i64>,
    pub error: Option<String>,
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
}

#[derive(Debug, Clone)]
pub struct ImageWorkbenchTaskStatusPatch {
    pub task_id: String,
    pub status: String,
    pub error: Option<String>,
    pub model_run: Option<NewImageWorkbenchModelRun>,
}

#[derive(Debug, Clone)]
pub struct NewImageWorkbenchAsset {
    pub task_id: String,
    pub file_path: String,
    pub thumbnail_path: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub mime_type: Option<String>,
    pub size_bytes: Option<u64>,
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
