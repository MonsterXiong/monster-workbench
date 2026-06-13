use crate::infra::{AppError, AppResult};
use crate::services::ai_provider_types::AiProviderConfig;
use serde_json::{json, Value};

pub(super) const AI_PROVIDER_TEST_MAX_CONFIG_CONCURRENCY: usize = 6;

const AI_PROVIDER_DISPLAY_NAME_MAX_CHARS: usize = 128;
const AI_PROVIDER_BASE_URL_MAX_CHARS: usize = 2_048;
const AI_PROVIDER_API_KEY_MAX_CHARS: usize = 4_096;
const AI_PROVIDER_MODEL_MAX_CHARS: usize = 256;
const AI_PROVIDER_PROMPT_MAX_CHARS: usize = 8_192;
const AI_PROVIDER_REGISTRY_JSON: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../src/config/ai-provider-registry.json"
));
const SUPPORTED_IMAGE_SIZES: &[&str] = &[
    "1008x1792",
    "1008x1344",
    "1536x864",
    "1344x1008",
    "1024x1024",
    "2048x2048",
    "1152x2048",
    "2048x1152",
    "1536x2048",
    "2048x1536",
    "1344x2016",
    "2016x1344",
    "2000x1600",
    "1600x2000",
    "2000x1200",
    "1200x2000",
    "2048x1024",
    "1024x2048",
    "2880x2880",
    "2160x3840",
    "3840x2160",
    "2160x2880",
    "2880x2160",
    "2304x3456",
    "3456x2304",
    "2880x2304",
    "2304x2880",
    "3600x2160",
    "2160x3600",
    "3840x1920",
    "1920x3840",
    "3840x1280",
    "1280x3840",
];

pub(super) fn validate_provider_config(config: &AiProviderConfig, action: &str) -> AppResult<()> {
    if !matches!(action, "models" | "chat" | "image") {
        return Err(AppError::Config("不支持的 AI 测试动作".to_string()));
    }

    if !is_supported_provider_id(&config.provider) {
        return Err(AppError::Config("不支持的 AI 模型提供商".to_string()));
    }

    if !provider_supports_test_action(config, action) {
        return Err(AppError::Config(
            "当前 AI 模型配置不支持该测试动作".to_string(),
        ));
    }

    if !matches!(config.queue_mode.as_str(), "serial" | "concurrent") {
        return Err(AppError::Config("不支持的 AI 队列模式".to_string()));
    }

    if config.max_concurrency == 0
        || config.max_concurrency > AI_PROVIDER_TEST_MAX_CONFIG_CONCURRENCY
    {
        return Err(AppError::Config(format!(
            "AI 并发槽位必须在 1 到 {} 之间",
            AI_PROVIDER_TEST_MAX_CONFIG_CONCURRENCY
        )));
    }

    if action == "image" && (config.image_count == 0 || config.image_count > 4) {
        return Err(AppError::Config(
            "生图测试一次仅支持 1 到 4 张图片".to_string(),
        ));
    }

    validate_text_len(
        "提供商显示名称",
        &config.display_name,
        AI_PROVIDER_DISPLAY_NAME_MAX_CHARS,
    )?;
    validate_text_len("Base URL", &config.base_url, AI_PROVIDER_BASE_URL_MAX_CHARS)?;
    validate_text_len("API Key", &config.api_key, AI_PROVIDER_API_KEY_MAX_CHARS)?;
    validate_text_len("模型名称", &config.model, AI_PROVIDER_MODEL_MAX_CHARS)?;
    validate_text_len(
        "测试提示词",
        &config.test_prompt,
        AI_PROVIDER_PROMPT_MAX_CHARS,
    )?;
    validate_text_len(
        "生图模型名称",
        &config.image_model,
        AI_PROVIDER_MODEL_MAX_CHARS,
    )?;
    validate_text_len(
        "生图提示词",
        &config.image_prompt,
        AI_PROVIDER_PROMPT_MAX_CHARS,
    )?;

    if config.base_url.trim().is_empty() {
        return Err(AppError::Config("模型提供商 Base URL 不能为空".to_string()));
    }

    let base_url = config.base_url.trim().to_lowercase();
    let is_local =
        base_url.starts_with("http://127.0.0.1") || base_url.starts_with("http://localhost");
    if !base_url.starts_with("https://") && !is_local {
        return Err(AppError::Config(
            "Base URL 仅允许 https，或本机 localhost/127.0.0.1 调试地址".to_string(),
        ));
    }

    if action == "chat" && config.model.trim().is_empty() {
        return Err(AppError::Config("模型名称不能为空".to_string()));
    }

    if action == "image" {
        if config.image_model.trim().is_empty() {
            return Err(AppError::Config("生图模型名称不能为空".to_string()));
        }

        if config.image_prompt.trim().is_empty() {
            return Err(AppError::Config("生图提示词不能为空".to_string()));
        }

        if !SUPPORTED_IMAGE_SIZES.contains(&config.image_size.as_str()) {
            return Err(AppError::Config("不支持的生图尺寸".to_string()));
        }
    }

    if config.api_key.trim().is_empty() && !is_local {
        return Err(AppError::Config("API Key 不能为空".to_string()));
    }

    Ok(())
}

pub(super) fn build_sidecar_input(
    config: &AiProviderConfig,
    action: &str,
    request_id: Option<&str>,
    output_dir: &str,
) -> AppResult<String> {
    serde_json::to_string(&json!({
        "config": config,
        "action": action,
        "outputDir": if should_prepare_output_dir(action) { output_dir } else { "" },
        "requestId": request_id,
    }))
    .map_err(|error| AppError::Config(format!("AI 测试参数序列化失败: {}", error)))
}

pub(super) fn should_prepare_output_dir(action: &str) -> bool {
    action == "image"
}

fn is_supported_provider_id(provider: &str) -> bool {
    let registry = ai_provider_registry();
    registry_provider(&registry, provider).is_some() || provider.trim() == "anthropic"
}

fn ai_provider_registry() -> Value {
    serde_json::from_str(AI_PROVIDER_REGISTRY_JSON).unwrap_or_else(|_| json!({}))
}

fn registry_provider<'a>(registry: &'a Value, provider: &str) -> Option<&'a Value> {
    registry.get("providers")?.get(provider.trim())
}

fn registry_adapter<'a>(registry: &'a Value, adapter_id: &str) -> Option<&'a Value> {
    registry.get("adapters")?.get(adapter_id.trim())
}

fn registry_text(value: &Value, key: &str) -> String {
    value
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}

fn registry_default_adapter_id(registry: &Value) -> String {
    registry
        .get("defaultAdapterId")
        .and_then(Value::as_str)
        .unwrap_or("openai-compatible")
        .to_string()
}

fn registry_provider_adapter_id(registry: &Value, provider: &str) -> String {
    registry_provider(registry, provider)
        .map(|record| registry_text(record, "adapterId"))
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| {
            if provider.trim() == "anthropic" {
                "anthropic-messages".to_string()
            } else {
                registry_default_adapter_id(registry)
            }
        })
}

fn registry_record_has_capability(record: &Value, capability: &str) -> bool {
    record
        .get("capabilities")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .any(|item| item.as_str().is_some_and(|value| value == capability))
        })
        .unwrap_or(false)
}

fn registry_record_declares_capabilities(record: &Value) -> bool {
    record
        .get("capabilities")
        .and_then(Value::as_array)
        .is_some()
}

fn base_url_matches_adapter_record(adapter: &Value, base_url: &str) -> bool {
    let clean_base_url = base_url.trim().to_ascii_lowercase();
    adapter
        .get("baseUrlHostPatterns")
        .and_then(Value::as_array)
        .map(|patterns| {
            patterns.iter().any(|pattern| {
                pattern
                    .as_str()
                    .map(|value| clean_base_url.contains(&value.to_ascii_lowercase()))
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

fn base_url_matches_adapter(registry: &Value, adapter_id: &str, base_url: &str) -> bool {
    registry_adapter(registry, adapter_id)
        .map(|adapter| base_url_matches_adapter_record(adapter, base_url))
        .unwrap_or(false)
}

fn resolve_provider_adapter_id(registry: &Value, config: &AiProviderConfig) -> String {
    if let Some(adapters) = registry.get("adapters").and_then(Value::as_object) {
        for (adapter_id, adapter) in adapters {
            if base_url_matches_adapter_record(adapter, &config.base_url) {
                return adapter_id.to_string();
            }
        }
    }

    let explicit_adapter = config.adapter_id.trim();
    if !explicit_adapter.is_empty() && registry_adapter(registry, explicit_adapter).is_some() {
        return explicit_adapter.to_string();
    }

    registry_provider_adapter_id(registry, &config.provider)
}

fn provider_supports_test_action(config: &AiProviderConfig, action: &str) -> bool {
    let registry = ai_provider_registry();
    let adapter_id = resolve_provider_adapter_id(&registry, config);
    let provider_adapter_id = registry_provider_adapter_id(&registry, &config.provider);
    let has_adapter_override =
        !config.adapter_id.trim().is_empty() && config.adapter_id.trim() != provider_adapter_id;
    let has_base_url_override = adapter_id != provider_adapter_id
        && base_url_matches_adapter(&registry, &adapter_id, &config.base_url);

    if !has_adapter_override && !has_base_url_override {
        if let Some(provider) = registry_provider(&registry, &config.provider) {
            if registry_record_declares_capabilities(provider) {
                return registry_record_has_capability(provider, action);
            }
        }
    }

    registry_adapter(&registry, &adapter_id)
        .map(|adapter| registry_record_has_capability(adapter, action))
        .unwrap_or(false)
}

fn validate_text_len(label: &str, value: &str, max_chars: usize) -> AppResult<()> {
    if value.chars().count() > max_chars {
        return Err(AppError::Config(format!(
            "{} 不能超过 {} 个字符",
            label, max_chars
        )));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_config() -> AiProviderConfig {
        AiProviderConfig {
            provider: "custom".to_string(),
            adapter_id: "openai-compatible".to_string(),
            display_name: "Mock".to_string(),
            base_url: "https://example.com/v1".to_string(),
            api_key: "secret".to_string(),
            remember_api_key: false,
            model: "chat-test".to_string(),
            test_prompt: "ping".to_string(),
            image_model: "image-test".to_string(),
            image_prompt: "blue robot".to_string(),
            image_size: "1024x1024".to_string(),
            image_count: 1,
            timeout_ms: 5_000,
            queue_mode: "serial".to_string(),
            max_concurrency: 3,
            queue_key: String::new(),
        }
    }

    fn validation_detail(config: &AiProviderConfig, action: &str) -> String {
        validate_provider_config(config, action)
            .expect_err("config should be rejected")
            .to_response()
            .detail
    }

    #[test]
    fn non_image_action_does_not_require_generated_output_dir() {
        assert!(!should_prepare_output_dir("chat"));
        assert!(!should_prepare_output_dir("models"));
        assert!(should_prepare_output_dir("image"));
    }

    #[test]
    fn build_sidecar_input_omits_output_dir_for_non_image_actions() {
        let config = make_config();

        let raw = build_sidecar_input(&config, "chat", Some("req-1"), "C:/tmp/output")
            .expect("input should serialize");
        let parsed: serde_json::Value = serde_json::from_str(&raw).expect("json should parse");
        assert_eq!(parsed["action"], "chat");
        assert_eq!(parsed["requestId"], "req-1");
        assert_eq!(parsed["outputDir"], "");
    }

    #[test]
    fn validate_provider_config_accepts_mainstream_openai_compatible_presets() {
        for provider in [
            "openai",
            "deepseek",
            "siliconflow",
            "kimi",
            "minimax",
            "glm",
            "ollama",
            "custom",
        ] {
            let mut config = make_config();
            config.provider = provider.to_string();

            validate_provider_config(&config, "chat")
                .unwrap_or_else(|error| panic!("{provider} should be accepted: {error:?}"));
        }
    }

    #[test]
    fn validate_provider_config_rejects_unsupported_provider_action() {
        let mut config = make_config();
        config.provider = "deepseek".to_string();

        assert!(validation_detail(&config, "image").contains("不支持该测试动作"));
    }

    #[test]
    fn validate_provider_config_treats_anthropic_native_as_chat_only() {
        let mut config = make_config();
        config.base_url = "https://api.anthropic.com".to_string();

        validate_provider_config(&config, "chat")
            .expect("anthropic native chat should be accepted");
        assert!(validation_detail(&config, "models").contains("不支持该测试动作"));
        assert!(validation_detail(&config, "image").contains("不支持该测试动作"));
    }

    #[test]
    fn validate_provider_config_accepts_third_party_anthropic_adapter_as_chat_only() {
        let mut config = make_config();
        config.provider = "custom".to_string();
        config.adapter_id = "anthropic-messages".to_string();
        config.base_url = "https://anthropic-gateway.example.com".to_string();

        validate_provider_config(&config, "chat")
            .expect("third-party anthropic adapter chat should be accepted");
        assert!(validation_detail(&config, "models").contains("不支持该测试动作"));
        assert!(validation_detail(&config, "image").contains("不支持该测试动作"));
    }

    #[test]
    fn validate_provider_config_rejects_overlong_base_url() {
        let mut config = make_config();
        config.base_url = format!(
            "https://example.com/{}",
            "a".repeat(AI_PROVIDER_BASE_URL_MAX_CHARS)
        );

        assert!(validation_detail(&config, "models").contains("Base URL 不能超过"));
    }

    #[test]
    fn validate_provider_config_rejects_overlong_api_key() {
        let mut config = make_config();
        config.api_key = "k".repeat(AI_PROVIDER_API_KEY_MAX_CHARS + 1);

        assert!(validation_detail(&config, "models").contains("API Key 不能超过"));
    }

    #[test]
    fn validate_provider_config_rejects_overlong_chat_prompt() {
        let mut config = make_config();
        config.test_prompt = "你".repeat(AI_PROVIDER_PROMPT_MAX_CHARS + 1);

        assert!(validation_detail(&config, "chat").contains("测试提示词 不能超过"));
    }

    #[test]
    fn validate_provider_config_rejects_overlong_chat_model() {
        let mut config = make_config();
        config.model = "m".repeat(AI_PROVIDER_MODEL_MAX_CHARS + 1);

        assert!(validation_detail(&config, "chat").contains("模型名称 不能超过"));
    }

    #[test]
    fn validate_provider_config_rejects_overlong_image_model() {
        let mut config = make_config();
        config.image_model = "m".repeat(AI_PROVIDER_MODEL_MAX_CHARS + 1);

        assert!(validation_detail(&config, "image").contains("生图模型名称 不能超过"));
    }

    #[test]
    fn validate_provider_config_rejects_overlong_image_prompt() {
        let mut config = make_config();
        config.image_prompt = "图".repeat(AI_PROVIDER_PROMPT_MAX_CHARS + 1);

        assert!(validation_detail(&config, "image").contains("生图提示词 不能超过"));
    }

    #[test]
    fn validate_provider_config_accepts_verified_image_sizes() {
        for size in SUPPORTED_IMAGE_SIZES {
            let mut config = make_config();
            config.image_size = (*size).to_string();

            validate_provider_config(&config, "image")
                .unwrap_or_else(|error| panic!("{size} should be accepted: {error:?}"));
        }
    }

    #[test]
    fn validate_provider_config_rejects_unverified_image_sizes() {
        for size in [
            "512x512",
            "1792x1008",
            "3840x960",
            "960x3840",
            "7680x4320",
            "4320x7680",
            "7680x960",
            "7680x160",
            "8192x8192",
            "bad-size",
        ] {
            let mut config = make_config();
            config.image_size = size.to_string();

            assert!(
                validation_detail(&config, "image").contains("不支持的生图尺寸"),
                "{size} should be rejected until a real generation run verifies it"
            );
        }
    }
}
