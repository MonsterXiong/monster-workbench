use crate::infra::image_workbench_types::ImageWorkbenchJob;
use crate::services::ai_provider_types::{
    AiGenerationArtifact, AiGenerationOptions, AiGenerationResult,
};
use crate::services::image_workbench_service_types::RecordImageWorkbenchModelRunInput;
use serde_json::json;

pub(crate) fn image_artifacts(artifacts: &[AiGenerationArtifact]) -> Vec<&AiGenerationArtifact> {
    artifacts
        .iter()
        .filter(|artifact| {
            artifact.kind == "image"
                && artifact
                    .path
                    .as_deref()
                    .map(|path| !path.trim().is_empty())
                    .unwrap_or(false)
        })
        .collect()
}

pub(crate) fn parse_artifact_dimensions(value: Option<&str>) -> (Option<u32>, Option<u32>) {
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

pub(crate) fn generation_options_for_job(
    job: &ImageWorkbenchJob,
    target_size: Option<String>,
) -> AiGenerationOptions {
    let mut options = AiGenerationOptions {
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
    };
    merge_generation_options_json(&mut options, job.generation_options_json.as_deref());
    options
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

fn merge_generation_options_json(options: &mut AiGenerationOptions, raw_json: Option<&str>) {
    let Some(raw_json) = raw_json.map(str::trim).filter(|value| !value.is_empty()) else {
        return;
    };
    let Ok(extra) = serde_json::from_str::<AiGenerationOptions>(raw_json) else {
        return;
    };
    options.quality = extra.quality;
    options.output_format = extra.output_format;
    options.output_compression = extra.output_compression;
    options.background = extra.background;
    options.moderation = extra.moderation;
}

pub(crate) fn generation_result_model_run(
    job: &ImageWorkbenchJob,
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
                "generationOptionsJson": &job.generation_options_json,
            }))
            .unwrap_or_else(|_| "{}".to_string()),
        ),
        response_preview: result.and_then(|result| result.raw_preview.clone()),
        error,
    }
}

pub(crate) fn cancelled_generation_model_run(
    job: &ImageWorkbenchJob,
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

pub(crate) fn is_cancel_error(error: &str) -> bool {
    error.contains("取消")
        || error.contains("中止")
        || error.to_ascii_lowercase().contains("cancel")
}
