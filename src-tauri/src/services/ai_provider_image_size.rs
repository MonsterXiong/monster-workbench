const IMAGE_SIZE_AUTO: &str = "auto";
const GPT_IMAGE_2_MAX_EDGE: u64 = 3840;
const GPT_IMAGE_2_MAX_PIXELS: u64 = 3840 * 2160;
const GPT_IMAGE_2_SIZE_STEP: u64 = 16;
const GPT_IMAGE_2_MAX_RATIO: f64 = 3.0;

const VERIFIED_IMAGE_SIZES: &[&str] = &[
    "1008x1792",
    "1008x1344",
    "1536x864",
    "1344x1008",
    "1024x1024",
    "1024x1536",
    "1536x1024",
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

const DALLE_2_IMAGE_SIZES: &[&str] = &["256x256", "512x512", "1024x1024"];
const DALLE_3_IMAGE_SIZES: &[&str] = &["1024x1024", "1792x1024", "1024x1792"];
const GPT_IMAGE_STANDARD_SIZES: &[&str] = &[IMAGE_SIZE_AUTO, "1024x1024", "1536x1024", "1024x1536"];

pub(super) fn verified_image_size_values() -> &'static [&'static str] {
    VERIFIED_IMAGE_SIZES
}

pub(super) fn is_image_size_supported_for_model(model: &str, size: &str) -> bool {
    let normalized_size = normalize_image_size_value(size);
    let normalized_model = model.trim().to_ascii_lowercase();
    if normalized_model.contains("gpt-image-2") {
        return is_valid_gpt_image_2_size(&normalized_size);
    }
    if normalized_model.starts_with("dall-e-2") {
        return DALLE_2_IMAGE_SIZES.contains(&normalized_size.as_str());
    }
    if normalized_model.starts_with("dall-e-3") {
        return DALLE_3_IMAGE_SIZES.contains(&normalized_size.as_str());
    }
    if normalized_model.starts_with("gpt-image-") {
        return GPT_IMAGE_STANDARD_SIZES.contains(&normalized_size.as_str());
    }
    VERIFIED_IMAGE_SIZES.contains(&normalized_size.as_str())
}

fn normalize_image_size_value(size: &str) -> String {
    let clean = size.trim().to_ascii_lowercase();
    if clean == IMAGE_SIZE_AUTO {
        return clean;
    }
    match parse_image_size_parts(&clean) {
        Some((width, height)) => format!("{width}x{height}"),
        None => clean.split_whitespace().collect::<String>(),
    }
}

fn parse_image_size_parts(size: &str) -> Option<(u64, u64)> {
    let (width, height) = size.split_once('x')?;
    let width = width.trim().parse::<u64>().ok()?;
    let height = height.trim().parse::<u64>().ok()?;
    if width == 0 || height == 0 {
        return None;
    }
    Some((width, height))
}

fn is_valid_gpt_image_2_size(size: &str) -> bool {
    if size == IMAGE_SIZE_AUTO {
        return true;
    }
    let Some((width, height)) = parse_image_size_parts(size) else {
        return false;
    };
    if width % GPT_IMAGE_2_SIZE_STEP != 0 || height % GPT_IMAGE_2_SIZE_STEP != 0 {
        return false;
    }
    if width > GPT_IMAGE_2_MAX_EDGE || height > GPT_IMAGE_2_MAX_EDGE {
        return false;
    }
    if width.saturating_mul(height) > GPT_IMAGE_2_MAX_PIXELS {
        return false;
    }
    let ratio = width as f64 / height as f64;
    ratio <= GPT_IMAGE_2_MAX_RATIO && ratio >= 1.0 / GPT_IMAGE_2_MAX_RATIO
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gpt_image_2_accepts_auto_and_flexible_sizes() {
        for size in ["auto", "1024x1792", "1792x1024", "2160x3840", "3840x2160"] {
            assert!(
                is_image_size_supported_for_model("gpt-image-2", size),
                "{size} should be accepted"
            );
        }
    }

    #[test]
    fn gpt_image_2_rejects_invalid_sizes() {
        for size in [
            "3840x960",
            "960x3840",
            "3840x2176",
            "3841x2160",
            "1025x1024",
            "bad-size",
        ] {
            assert!(
                !is_image_size_supported_for_model("gpt-image-2", size),
                "{size} should be rejected"
            );
        }
    }
}
