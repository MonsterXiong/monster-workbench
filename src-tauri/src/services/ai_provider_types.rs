use serde::{Deserialize, Serialize};

fn default_queue_mode() -> String {
    "serial".to_string()
}

fn default_max_concurrency() -> usize {
    3
}

fn default_image_count() -> usize {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderConfig {
    pub provider: String,
    #[serde(default)]
    pub adapter_id: String,
    pub display_name: String,
    pub base_url: String,
    pub api_key: String,
    pub remember_api_key: bool,
    pub model: String,
    pub test_prompt: String,
    pub image_model: String,
    pub image_prompt: String,
    pub image_size: String,
    #[serde(default = "default_image_count")]
    pub image_count: usize,
    pub timeout_ms: u64,
    #[serde(default = "default_queue_mode")]
    pub queue_mode: String,
    #[serde(default = "default_max_concurrency")]
    pub max_concurrency: usize,
    #[serde(default)]
    pub queue_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderTestResult {
    pub request_id: Option<String>,
    pub ok: bool,
    pub action: String,
    pub provider: String,
    pub model: String,
    pub base_url: String,
    pub latency_ms: u64,
    pub queue_wait_ms: Option<u64>,
    pub total_latency_ms: Option<u64>,
    pub message: String,
    pub status_code: Option<u16>,
    pub models: Option<Vec<String>>,
    pub text: Option<String>,
    pub image_urls: Option<Vec<String>>,
    pub image_paths: Option<Vec<String>>,
    pub saved_files: Option<Vec<AiProviderSavedFile>>,
    pub api_image_size: Option<String>,
    pub requested_image_size: Option<String>,
    pub actual_image_size: Option<String>,
    pub fallback_image_size: Option<String>,
    pub image_attempts: Option<u32>,
    pub failure_kind: Option<String>,
    pub raw_preview: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiProviderSavedFile {
    pub path: String,
    pub size_bytes: u64,
    pub mime_type: String,
    pub dimensions: Option<String>,
}
