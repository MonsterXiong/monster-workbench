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

fn default_generation_count() -> usize {
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
    pub capabilities: Vec<String>,
    #[serde(default)]
    pub queue_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiGenerationOptions {
    #[serde(default)]
    pub max_tokens: Option<u32>,
    #[serde(default)]
    pub temperature: Option<f32>,
    #[serde(default)]
    pub size: Option<String>,
    #[serde(default = "default_generation_count")]
    pub count: usize,
    #[serde(default)]
    pub quality: Option<String>,
    #[serde(default)]
    pub output_format: Option<String>,
    #[serde(default)]
    pub output_compression: Option<u8>,
    #[serde(default)]
    pub background: Option<String>,
    #[serde(default)]
    pub moderation: Option<String>,
    #[serde(default)]
    pub format: Option<String>,
    #[serde(default)]
    pub voice: Option<String>,
    #[serde(default)]
    pub duration_seconds: Option<u32>,
    #[serde(default)]
    pub reference_asset_ids: Vec<String>,
    #[serde(default)]
    pub reference_image_paths: Vec<String>,
    #[serde(default)]
    pub reference_image_path: Option<String>,
    #[serde(default)]
    pub source_asset_id: Option<String>,
    #[serde(default)]
    pub source_image_path: Option<String>,
    #[serde(default)]
    pub mask_path: Option<String>,
    #[serde(default)]
    pub person_context_json: Option<String>,
    #[serde(default)]
    pub scale: Option<u32>,
    #[serde(default)]
    pub fallback_mode: Option<String>,
}

impl Default for AiGenerationOptions {
    fn default() -> Self {
        Self {
            max_tokens: None,
            temperature: None,
            size: None,
            count: default_generation_count(),
            quality: None,
            output_format: None,
            output_compression: None,
            background: None,
            moderation: None,
            format: None,
            voice: None,
            duration_seconds: None,
            reference_asset_ids: Vec::new(),
            reference_image_paths: Vec::new(),
            reference_image_path: None,
            source_asset_id: None,
            source_image_path: None,
            mask_path: None,
            person_context_json: None,
            scale: None,
            fallback_mode: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiGenerationRequest {
    pub capability: String,
    pub config: AiProviderConfig,
    pub prompt: String,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub request_id: Option<String>,
    #[serde(default)]
    pub options: AiGenerationOptions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiBusinessGenerationRequest {
    pub capability: String,
    #[serde(default)]
    pub provider_config_id: Option<String>,
    pub prompt: String,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub request_id: Option<String>,
    #[serde(default)]
    pub options: AiGenerationOptions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiGenerationArtifact {
    pub kind: String,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub path: Option<String>,
    #[serde(default)]
    pub mime_type: Option<String>,
    #[serde(default)]
    pub size_bytes: Option<u64>,
    #[serde(default)]
    pub dimensions: Option<String>,
    #[serde(default)]
    pub duration_seconds: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiGenerationResult {
    pub request_id: Option<String>,
    pub ok: bool,
    pub capability: String,
    pub provider: String,
    pub model: String,
    pub base_url: String,
    pub latency_ms: u64,
    pub queue_wait_ms: Option<u64>,
    pub total_latency_ms: Option<u64>,
    pub message: String,
    pub status_code: Option<u16>,
    pub text: Option<String>,
    pub artifacts: Vec<AiGenerationArtifact>,
    pub failure_kind: Option<String>,
    pub raw_preview: Option<String>,
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
    pub artifacts: Option<Vec<AiGenerationArtifact>>,
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
