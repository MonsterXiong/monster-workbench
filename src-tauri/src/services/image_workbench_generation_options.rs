use crate::infra::{AppError, AppResult};
use serde_json::json;

pub(crate) fn normalize_image_generation_options_json(
    raw_json: Option<String>,
    max_chars: usize,
) -> AppResult<Option<String>> {
    let Some(raw_json) = raw_json
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    else {
        return Ok(None);
    };
    if raw_json.chars().count() > max_chars {
        return Err(AppError::Config(format!(
            "Image Workbench generation options长度不能超过 {} 个字符",
            max_chars
        )));
    }
    let parsed: serde_json::Value = serde_json::from_str(&raw_json).map_err(|error| {
        AppError::Config(format!(
            "Image Workbench generation options 必须是合法 JSON: {}",
            error
        ))
    })?;
    let Some(object) = parsed.as_object() else {
        return Err(AppError::Config(
            "Image Workbench generation options 必须是 JSON 对象".to_string(),
        ));
    };
    let mut normalized = serde_json::Map::new();

    if let Some(quality) = normalized_option_string(object, "quality") {
        if !matches!(quality.as_str(), "auto" | "low" | "medium" | "high") {
            return Err(AppError::Config(
                "Image Workbench quality 仅支持 auto/low/medium/high".to_string(),
            ));
        }
        normalized.insert("quality".to_string(), json!(quality));
    }

    let output_format = normalized_option_string(object, "outputFormat")
        .or_else(|| normalized_option_string(object, "output_format"));
    if let Some(output_format) = output_format {
        if !matches!(output_format.as_str(), "png" | "jpeg" | "webp") {
            return Err(AppError::Config(
                "Image Workbench output format 仅支持 png/jpeg/webp".to_string(),
            ));
        }
        normalized.insert("outputFormat".to_string(), json!(output_format));
        if output_format == "jpeg" || output_format == "webp" {
            if let Some(compression) =
                normalized_u8_option(object, "outputCompression", "output_compression")?
            {
                normalized.insert("outputCompression".to_string(), json!(compression));
            }
        }
    }

    if let Some(background) = normalized_option_string(object, "background") {
        if !matches!(background.as_str(), "auto" | "opaque") {
            return Err(AppError::Config(
                "gpt-image-2 暂不支持透明背景，请使用 auto 或 opaque".to_string(),
            ));
        }
        normalized.insert("background".to_string(), json!(background));
    }

    if let Some(moderation) = normalized_option_string(object, "moderation") {
        if !matches!(moderation.as_str(), "auto" | "low") {
            return Err(AppError::Config(
                "Image Workbench moderation 仅支持 auto/low".to_string(),
            ));
        }
        normalized.insert("moderation".to_string(), json!(moderation));
    }

    if let Some(storyboard) = normalize_storyboard_generation_options(object.get("storyboard"))? {
        normalized.insert("storyboard".to_string(), storyboard);
    }

    if normalized.is_empty() {
        return Ok(None);
    }
    serde_json::to_string(&normalized)
        .map(Some)
        .map_err(|error| {
            AppError::Config(format!(
                "Image Workbench generation options 序列化失败: {}",
                error
            ))
        })
}

fn normalize_storyboard_generation_options(
    value: Option<&serde_json::Value>,
) -> AppResult<Option<serde_json::Value>> {
    let Some(value) = value else {
        return Ok(None);
    };
    let Some(object) = value.as_object() else {
        return Err(AppError::Config(
            "Image Workbench storyboard options 必须是 JSON 对象".to_string(),
        ));
    };
    let Some(raw_scenes) = object.get("scenes").and_then(|item| item.as_array()) else {
        return Ok(None);
    };
    let variants_per_scene = normalized_storyboard_u32(object.get("variantsPerScene"))
        .or_else(|| normalized_storyboard_u32(object.get("variants_per_scene")))
        .unwrap_or(4)
        .clamp(1, 8);
    let mut scenes = Vec::new();
    for (fallback_index, scene) in raw_scenes.iter().take(80).enumerate() {
        let Some(scene_object) = scene.as_object() else {
            continue;
        };
        let index = normalized_storyboard_u32(scene_object.get("index"))
            .unwrap_or((fallback_index + 1) as u32)
            .clamp(1, 999);
        let title = normalized_storyboard_text(scene_object.get("title"), 96)
            .unwrap_or_else(|| format!("分镜 {}", index));
        let task_start_index = normalized_storyboard_u32(scene_object.get("taskStartIndex"))
            .or_else(|| normalized_storyboard_u32(scene_object.get("task_start_index")))
            .unwrap_or((fallback_index as u32).saturating_mul(variants_per_scene));
        let task_count = normalized_storyboard_u32(scene_object.get("taskCount"))
            .or_else(|| normalized_storyboard_u32(scene_object.get("task_count")))
            .unwrap_or(variants_per_scene)
            .clamp(1, 32);
        let reference_prompt = normalized_storyboard_text(scene_object.get("referencePrompt"), 256)
            .or_else(|| normalized_storyboard_text(scene_object.get("reference_prompt"), 256))
            .unwrap_or_default();

        scenes.push(json!({
            "index": index,
            "title": title,
            "taskStartIndex": task_start_index,
            "taskCount": task_count,
            "referencePrompt": reference_prompt,
        }));
    }

    if scenes.is_empty() {
        return Ok(None);
    }

    Ok(Some(json!({
        "version": 1,
        "type": "storyboard",
        "variantsPerScene": variants_per_scene,
        "sceneCount": scenes.len(),
        "scenes": scenes,
    })))
}

fn normalized_storyboard_u32(value: Option<&serde_json::Value>) -> Option<u32> {
    value
        .and_then(|item| {
            item.as_u64().or_else(|| {
                item.as_str()
                    .and_then(|text| text.trim().parse::<u64>().ok())
            })
        })
        .and_then(|number| u32::try_from(number).ok())
}

fn normalized_storyboard_text(
    value: Option<&serde_json::Value>,
    max_chars: usize,
) -> Option<String> {
    let text = value?.as_str()?.trim();
    if text.is_empty() {
        return None;
    }
    Some(text.chars().take(max_chars).collect::<String>())
}

fn normalized_option_string(
    object: &serde_json::Map<String, serde_json::Value>,
    key: &str,
) -> Option<String> {
    object
        .get(key)
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| value.to_ascii_lowercase())
}

fn normalized_u8_option(
    object: &serde_json::Map<String, serde_json::Value>,
    camel_key: &str,
    snake_key: &str,
) -> AppResult<Option<u8>> {
    let Some(value) = object.get(camel_key).or_else(|| object.get(snake_key)) else {
        return Ok(None);
    };
    let number = value
        .as_u64()
        .ok_or_else(|| AppError::Config(format!("{} 必须是 0 到 100 的整数", camel_key)))?;
    if number > 100 {
        return Err(AppError::Config(format!(
            "{} 必须是 0 到 100 的整数",
            camel_key
        )));
    }
    Ok(Some(number as u8))
}
