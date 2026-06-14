use crate::infra::ai_generation_repo::{
    AiGenerationRepo, NewPersistedAiGenerationTask, PersistedAiGenerationTask,
};
use crate::infra::path::PathProvider;
use crate::services::ai_generation_task::AiGenerationTask;
use crate::services::ai_provider_task::now_ms;
use crate::services::ai_provider_types::{
    AiBusinessGenerationRequest, AiGenerationArtifact, AiGenerationOptions, AiGenerationRequest,
    AiGenerationResult, AiProviderConfig, AiProviderTestResult,
};
use tauri::{AppHandle, Runtime};

const AI_PROVIDER_IMAGE_REQUEST_TIMEOUT_MS_MIN: u64 = 60_000;
const AI_PROVIDER_IMAGE_REQUEST_TIMEOUT_MS_MAX: u64 = 900_000;
const AI_PROVIDER_IMAGE_SIDECAR_TIMEOUT_SLACK_MS: u64 = 30_000;
const AI_PROVIDER_AUDIO_REQUEST_TIMEOUT_MS_MAX: u64 = 300_000;
const AI_PROVIDER_AUDIO_SIDECAR_TIMEOUT_SLACK_MS: u64 = 5_000;

pub(crate) fn normalize_generation_capability(value: &str) -> Result<String, String> {
    let capability = value.trim().to_ascii_lowercase();
    if matches!(
        capability.as_str(),
        "chat"
            | "image"
            | "txt2img"
            | "img2img"
            | "inpaint"
            | "person_consistency"
            | "upscale_2x"
            | "upscale_4x"
            | "video"
            | "audio"
    ) {
        return Ok(capability);
    }

    Err("不支持的 AI 原子能力".to_string())
}

pub(crate) fn provider_action_for_generation_capability(capability: &str) -> &str {
    if is_image_generation_capability(capability) {
        "image"
    } else {
        capability
    }
}

pub(crate) fn ensure_generation_request_id(request: &mut AiGenerationRequest) -> String {
    let request_id = request
        .request_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .unwrap_or_else(|| format!("ai-generation-{}", now_ms()));
    request.request_id = Some(request_id.clone());
    request_id
}

pub(crate) fn ensure_business_generation_request_id(
    request: &mut AiBusinessGenerationRequest,
) -> String {
    let request_id = request
        .request_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .unwrap_or_else(|| format!("ai-business-generation-{}", now_ms()));
    request.request_id = Some(request_id.clone());
    request_id
}

pub(crate) fn persisted_generation_repo<R: Runtime>(
    app_handle: &AppHandle<R>,
) -> Result<AiGenerationRepo, String> {
    let db_path = PathProvider::new(app_handle.clone())
        .get_db_file_path()
        .map_err(|error| error.to_json_string())?;
    Ok(AiGenerationRepo::new(db_path))
}

pub(crate) fn should_persist_business_generation(request_id: &str) -> bool {
    !request_id.starts_with("iw-task-")
}

pub(crate) fn is_generation_terminal_status(status: &str) -> bool {
    matches!(status, "success" | "failed" | "canceled")
}

pub(crate) fn persist_business_generation_task<R: Runtime>(
    app_handle: &AppHandle<R>,
    request_id: &str,
    capability: &str,
    request: &AiBusinessGenerationRequest,
) -> Result<PersistedAiGenerationTask, String> {
    let request_json = serde_json::to_string(request)
        .map_err(|error| format!("序列化 AI 业务生成任务失败: {}", error))?;
    persisted_generation_repo(app_handle)?
        .enqueue_business_task(NewPersistedAiGenerationTask {
            request_id: request_id.to_string(),
            capability: capability.to_string(),
            scope: "business".to_string(),
            provider_config_id: normalize_optional_id(request.provider_config_id.as_deref()),
            model: normalize_optional_id(request.model.as_deref()),
            request_json: Some(request_json),
        })
        .map_err(|error| error.to_json_string())
}

pub(crate) fn mark_persisted_generation_running<R: Runtime>(
    app_handle: &AppHandle<R>,
    request_id: &str,
    queue_wait_ms: u64,
) -> Result<bool, String> {
    persisted_generation_repo(app_handle)?
        .mark_running(request_id, queue_wait_ms)
        .map_err(|error| error.to_json_string())
}

pub(crate) fn complete_persisted_generation_task<R: Runtime>(
    app_handle: &AppHandle<R>,
    request_id: &str,
    result: &AiGenerationResult,
    total_latency_ms: u64,
) -> Result<bool, String> {
    let result_json = serde_json::to_string(result)
        .map_err(|error| format!("序列化 AI 生成结果失败: {}", error))?;
    persisted_generation_repo(app_handle)?
        .complete(
            request_id,
            result.ok,
            result_json,
            if result.ok {
                None
            } else {
                Some(result.message.clone())
            },
            total_latency_ms,
        )
        .map_err(|error| error.to_json_string())
}

pub(crate) fn fail_persisted_generation_task<R: Runtime>(
    app_handle: &AppHandle<R>,
    request_id: &str,
    error: String,
    total_latency_ms: u64,
) -> Result<bool, String> {
    persisted_generation_repo(app_handle)?
        .fail(request_id, error, total_latency_ms)
        .map_err(|error| error.to_json_string())
}

pub(crate) fn cancel_persisted_generation_task<R: Runtime>(
    app_handle: &AppHandle<R>,
    request_id: &str,
    reason: String,
) -> Result<bool, String> {
    persisted_generation_repo(app_handle)?
        .cancel(request_id, reason)
        .map_err(|error| error.to_json_string())
}

pub(crate) fn persisted_task_to_generation_task(
    task: PersistedAiGenerationTask,
) -> Result<AiGenerationTask, String> {
    let result = match task.result_json {
        Some(value) => Some(
            serde_json::from_str::<AiGenerationResult>(&value)
                .map_err(|error| format!("AI 生成任务结果 JSON 格式不合法: {}", error))?,
        ),
        None => None,
    };

    Ok(AiGenerationTask {
        request_id: task.request_id,
        capability: task.capability,
        scope: task.scope,
        status: task.status,
        provider_config_id: task.provider_config_id,
        model: task.model,
        created_at_ms: task.created_at_ms.max(0) as u128,
        started_at_ms: task.started_at_ms.map(|value| value.max(0) as u128),
        finished_at_ms: task.finished_at_ms.map(|value| value.max(0) as u128),
        queue_wait_ms: task.queue_wait_ms,
        total_latency_ms: task.total_latency_ms,
        result,
        error: task.error,
    })
}

pub(crate) fn generation_task_to_blocking_result(
    task: AiGenerationTask,
) -> Result<AiGenerationResult, String> {
    if let Some(result) = task.result {
        return Ok(result);
    }

    Err(task
        .error
        .unwrap_or_else(|| "AI 生成任务已结束".to_string()))
}

pub(crate) fn persisted_task_to_business_request(
    task: &PersistedAiGenerationTask,
) -> Result<Option<AiBusinessGenerationRequest>, String> {
    let Some(request_json) = task.request_json.as_deref() else {
        return Ok(None);
    };
    let request = serde_json::from_str::<AiBusinessGenerationRequest>(request_json)
        .map_err(|error| format!("AI 业务生成任务请求 JSON 格式不合法: {}", error))?;
    Ok(Some(request))
}

pub(crate) fn normalize_optional_id(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

pub(crate) fn business_active_config_keys(capability: &str) -> &'static [&'static str] {
    match capability {
        "image" | "txt2img" => &["txt2img", "image"],
        "img2img" => &["img2img", "image", "txt2img"],
        "inpaint" => &["inpaint", "image", "txt2img"],
        "upscale_2x" => &["upscale_2x", "image", "txt2img"],
        "upscale_4x" => &["upscale_4x", "upscale_2x", "image", "txt2img"],
        "person_consistency" => &["person_consistency", "image", "txt2img"],
        "audio" => &["audio", "chat"],
        "video" => &["video", "image", "txt2img"],
        _ => &["chat"],
    }
}

pub(crate) fn normalize_generation_options(
    mut options: AiGenerationOptions,
) -> AiGenerationOptions {
    options.count = options.count.clamp(1, 4);
    options
}

pub(crate) fn build_image_generation_prompt(
    capability: &str,
    prompt: &str,
    options: &AiGenerationOptions,
) -> String {
    let mut parts = vec![prompt.trim().to_string()];
    match capability {
        "img2img" => {
            parts.push("Use the reference image as visual guidance.".to_string());
        }
        "inpaint" => {
            parts.push("Edit only the masked area and preserve the unmasked image.".to_string());
        }
        "person_consistency" => {
            parts.push("Keep the same person's core identity, face shape, hairstyle, age impression, and overall temperament as much as the model allows.".to_string());
        }
        "upscale_2x" | "upscale_4x" => {
            let scale = options
                .scale
                .unwrap_or(if capability == "upscale_4x" { 4 } else { 2 });
            parts.push(format!(
                "Upscale the source image to {scale}x without changing the content."
            ));
        }
        _ => {}
    }

    if let Some(path) = options
        .reference_image_path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        parts.push(format!("Reference image path: {path}"));
    }
    if let Some(path) = options
        .source_image_path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        parts.push(format!("Source image path: {path}"));
    }
    if let Some(path) = options
        .mask_path
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        parts.push(format!("Mask path: {path}"));
    }
    if let Some(context) = options
        .person_context_json
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        parts.push(format!("Person consistency context: {context}"));
    }
    if !options.reference_asset_ids.is_empty() {
        parts.push(format!(
            "Reference asset ids: {}",
            options.reference_asset_ids.join(",")
        ));
    }

    parts
        .into_iter()
        .filter(|part| !part.trim().is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

pub(crate) fn provider_request_timeout_ms(action: &str, config: &AiProviderConfig) -> u64 {
    match action {
        "image" | "video" => config.timeout_ms.clamp(
            AI_PROVIDER_IMAGE_REQUEST_TIMEOUT_MS_MIN,
            AI_PROVIDER_IMAGE_REQUEST_TIMEOUT_MS_MAX,
        ),
        "audio" => config
            .timeout_ms
            .clamp(3_000, AI_PROVIDER_AUDIO_REQUEST_TIMEOUT_MS_MAX),
        _ => config.timeout_ms.clamp(3_000, 60_000),
    }
}

pub(crate) fn provider_sidecar_timeout_ms(action: &str, request_timeout_ms: u64) -> u64 {
    match action {
        "image" | "video" => request_timeout_ms + AI_PROVIDER_IMAGE_SIDECAR_TIMEOUT_SLACK_MS,
        "audio" => request_timeout_ms + AI_PROVIDER_AUDIO_SIDECAR_TIMEOUT_SLACK_MS,
        _ => request_timeout_ms,
    }
}

pub(crate) fn provider_result_to_generation(
    capability: &str,
    result: AiProviderTestResult,
) -> AiGenerationResult {
    AiGenerationResult {
        request_id: result.request_id.clone(),
        ok: result.ok,
        capability: capability.to_string(),
        provider: result.provider.clone(),
        model: result.model.clone(),
        base_url: result.base_url.clone(),
        latency_ms: result.latency_ms,
        queue_wait_ms: result.queue_wait_ms,
        total_latency_ms: result.total_latency_ms,
        message: result.message.clone(),
        status_code: result.status_code,
        text: result.text.clone(),
        artifacts: provider_result_artifacts(capability, &result),
        failure_kind: result.failure_kind.clone(),
        raw_preview: result.raw_preview.clone(),
    }
}

pub(crate) fn provider_result_artifacts(
    capability: &str,
    result: &AiProviderTestResult,
) -> Vec<AiGenerationArtifact> {
    if let Some(artifacts) = &result.artifacts {
        if artifacts.is_empty() {
            // Older or degraded sidecar responses may include an empty artifacts
            // array while still filling saved_files/image_paths below.
        } else {
            return artifacts.clone();
        }
    }

    if !is_image_generation_capability(capability) {
        return Vec::new();
    }

    let mut artifacts = Vec::new();
    if let Some(saved_files) = &result.saved_files {
        for file in saved_files {
            artifacts.push(AiGenerationArtifact {
                kind: "image".to_string(),
                url: None,
                path: Some(file.path.clone()),
                mime_type: Some(file.mime_type.clone()),
                size_bytes: Some(file.size_bytes),
                dimensions: file.dimensions.clone(),
                duration_seconds: None,
            });
        }
    }

    if artifacts.is_empty() {
        if let Some(paths) = &result.image_paths {
            for path in paths {
                artifacts.push(AiGenerationArtifact {
                    kind: "image".to_string(),
                    url: None,
                    path: Some(path.clone()),
                    mime_type: None,
                    size_bytes: None,
                    dimensions: result.actual_image_size.clone(),
                    duration_seconds: None,
                });
            }
        }
    }

    if let Some(urls) = &result.image_urls {
        for url in urls {
            artifacts.push(AiGenerationArtifact {
                kind: "image".to_string(),
                url: Some(url.clone()),
                path: None,
                mime_type: None,
                size_bytes: None,
                dimensions: result.actual_image_size.clone(),
                duration_seconds: None,
            });
        }
    }

    artifacts
}

pub(crate) fn is_image_generation_capability(capability: &str) -> bool {
    matches!(
        capability,
        "image"
            | "txt2img"
            | "img2img"
            | "inpaint"
            | "person_consistency"
            | "upscale_2x"
            | "upscale_4x"
    )
}
