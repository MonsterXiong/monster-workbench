use crate::infra::image_workbench_prompt::image_workbench_default_negative_constraints;
use crate::infra::{AppError, AppResult};

pub(crate) fn normalize_upscale_scale(mode: &str, value: Option<u32>) -> AppResult<Option<u32>> {
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

pub(crate) fn validate_mode_context(
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

fn has_reference_context(
    reference_asset_ids_json: Option<&str>,
    source_asset_id: Option<&str>,
    source_image_path: Option<&str>,
) -> bool {
    reference_asset_ids_json.is_some_and(|value| !value.trim().is_empty())
        || source_asset_id.is_some_and(|value| !value.trim().is_empty())
        || source_image_path.is_some_and(|value| !value.trim().is_empty())
}

pub(crate) fn normalize_job_prompt(
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

pub(crate) fn normalize_task_prompts(
    raw_prompts: Vec<String>,
    quantity: u32,
    max_chars: usize,
) -> AppResult<Vec<String>> {
    if raw_prompts.is_empty() {
        return Ok(Vec::new());
    }
    if raw_prompts.len() > quantity as usize {
        return Err(AppError::Config(
            "图片工作台任务提示词数量不能超过任务数量".to_string(),
        ));
    }

    let mut prompts = Vec::with_capacity(raw_prompts.len());
    for (index, raw_prompt) in raw_prompts.into_iter().enumerate() {
        let label = format!("Image Workbench task prompt {}", index + 1);
        let prompt = normalize_limited_optional_string(&label, Some(raw_prompt), max_chars)?
            .unwrap_or_default();
        prompts.push(prompt);
    }
    Ok(prompts)
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

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}

pub(crate) fn validate_workbench_mode(mode: &str, allow_deferred: bool) -> AppResult<()> {
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

pub(crate) fn merge_negative_prompt(
    prompt: &str,
    user_negative_prompt: Option<String>,
) -> Option<String> {
    let mut values = Vec::new();
    if let Some(value) = normalize_optional_string(user_negative_prompt) {
        values.push(value);
    }
    values.extend(
        image_workbench_default_negative_constraints(prompt)
            .into_iter()
            .map(str::to_string),
    );
    Some(dedupe_join(values))
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
