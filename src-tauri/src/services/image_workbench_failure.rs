use crate::infra::sensitive::sanitize_sensitive_text;
use crate::infra::{AppError, AppResult};

const IMAGE_WORKBENCH_FAILURE_TEXT_MAX_CHARS: usize = 256;
const PROVIDER_UNAVAILABLE_FAILURE_HINT: &str =
    "当前模型没有可用账号或账号池已耗尽，请换一个模型/Provider，或稍后重试。";
const UPSTREAM_SERVER_FAILURE_HINT: &str =
    "上游模型服务处理失败，请重试；如果连续出现，请换一个模型/Provider，或稍后再试。";

pub(crate) fn generation_failure_kind_to_workbench_failure_type(
    value: Option<&str>,
) -> Option<String> {
    let value = value?.trim();
    let failure_type = match value {
        "unsupported_size" => "size",
        "rate_limited" => "rate_limit",
        "canceled" | "cancelled" => "cancelled",
        "provider_unavailable" => "provider_unavailable",
        "upstream" | "upstream_error" | "server_error" => "upstream",
        "auth" | "model" | "size" | "rate_limit" | "timeout" | "connection" | "save"
        | "unknown" => value,
        _ => return None,
    };
    Some(failure_type.to_string())
}

pub(crate) fn normalize_failure_details(
    status: &str,
    failure_type: Option<String>,
    failure_hint: Option<String>,
    error: Option<&str>,
) -> AppResult<(Option<String>, Option<String>)> {
    if !matches!(status, "failed" | "cancelled") {
        return Ok((None, None));
    }

    let explicit_failure_type = normalize_failure_type(failure_type)?;
    let normalized_failure_type = if status == "cancelled" {
        Some("cancelled".to_string())
    } else {
        explicit_failure_type.or_else(|| Some(infer_failure_type(error).to_string()))
    };
    let normalized_failure_hint =
        normalize_sanitized_optional_string("图片工作台失败提示", failure_hint)?
            .or_else(|| error.and_then(short_failure_hint))
            .or_else(|| {
                if status == "cancelled" {
                    Some("用户取消".to_string())
                } else {
                    None
                }
            });

    Ok((normalized_failure_type, normalized_failure_hint))
}

fn normalize_failure_type(value: Option<String>) -> AppResult<Option<String>> {
    let Some(value) = normalize_limited_optional_string("图片工作台失败类型", value)?
    else {
        return Ok(None);
    };
    if !matches!(
        value.as_str(),
        "auth"
            | "model"
            | "size"
            | "rate_limit"
            | "provider_unavailable"
            | "upstream"
            | "timeout"
            | "connection"
            | "save"
            | "cancelled"
            | "unknown"
    ) {
        return Err(AppError::Config(format!(
            "图片工作台暂不支持的失败类型: {}",
            value
        )));
    }
    Ok(Some(value))
}

fn infer_failure_type(error: Option<&str>) -> &'static str {
    let Some(error) = error else {
        return "unknown";
    };
    let text = error.to_lowercase();
    if contains_any(
        &text,
        &["cancel", "canceled", "cancelled", "用户取消", "取消"],
    ) {
        "cancelled"
    } else if is_provider_unavailable_error(&text) {
        "provider_unavailable"
    } else if is_upstream_server_error(&text) {
        "upstream"
    } else if contains_any(
        &text,
        &[
            "auth",
            "api key",
            "apikey",
            "unauthorized",
            "forbidden",
            "invalid token",
            "401",
            "403",
            "认证",
            "鉴权",
            "授权",
            "密钥",
        ],
    ) {
        "auth"
    } else if contains_any(
        &text,
        &[
            "rate limit",
            "rate_limit",
            "too many requests",
            "quota",
            "429",
            "限流",
            "频率",
            "额度",
        ],
    ) {
        "rate_limit"
    } else if contains_any(
        &text,
        &[
            "timeout",
            "timed out",
            "deadline",
            "worker_stuck",
            "超时",
            "卡住",
        ],
    ) {
        "timeout"
    } else if contains_any(
        &text,
        &[
            "connection",
            "network",
            "refused",
            "dns",
            "socket",
            "econn",
            "enotfound",
            "连接",
            "网络",
        ],
    ) {
        "connection"
    } else if contains_any(
        &text,
        &[
            "unsupported size",
            "unsupported_size",
            "dimension",
            "resolution",
            "image size",
            "尺寸",
            "分辨率",
        ],
    ) {
        "size"
    } else if contains_any(
        &text,
        &[
            "save",
            "write",
            "copy",
            "file",
            "path",
            "artifact",
            "local image",
            "保存",
            "写入",
            "文件",
            "路径",
        ],
    ) {
        "save"
    } else if contains_any(
        &text,
        &[
            "model",
            "not found",
            "unsupported model",
            "invalid model",
            "模型",
        ],
    ) {
        "model"
    } else {
        "unknown"
    }
}

fn contains_any(value: &str, patterns: &[&str]) -> bool {
    patterns.iter().any(|pattern| value.contains(pattern))
}

fn is_provider_unavailable_error(value: &str) -> bool {
    contains_any(
        value,
        &[
            "no available compatible accounts",
            "no available accounts",
            "no compatible accounts",
            "no available account",
            "account pool",
            "compatible accounts",
            "账号池",
            "可用账号",
            "兼容账号",
        ],
    )
}

fn normalize_sanitized_optional_string(
    label: &str,
    value: Option<String>,
) -> AppResult<Option<String>> {
    Ok(normalize_limited_optional_string(label, value)?
        .map(|value| sanitize_sensitive_text(&value)))
}

fn normalize_limited_optional_string(
    label: &str,
    value: Option<String>,
) -> AppResult<Option<String>> {
    let Some(value) = normalize_optional_string(value) else {
        return Ok(None);
    };
    if value.chars().count() > IMAGE_WORKBENCH_FAILURE_TEXT_MAX_CHARS {
        return Err(AppError::Config(format!(
            "{}长度不能超过 {} 个字符",
            label, IMAGE_WORKBENCH_FAILURE_TEXT_MAX_CHARS
        )));
    }
    Ok(Some(value))
}

fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}

fn short_failure_hint(value: &str) -> Option<String> {
    let lower = value.to_lowercase();
    if is_provider_unavailable_error(&lower) {
        return Some(PROVIDER_UNAVAILABLE_FAILURE_HINT.to_string());
    }
    if is_upstream_server_error(&lower) {
        return Some(UPSTREAM_SERVER_FAILURE_HINT.to_string());
    }
    let normalized = sanitize_sensitive_text(value)
        .chars()
        .map(|ch| {
            if matches!(ch, '\r' | '\n' | '\t') {
                ' '
            } else {
                ch
            }
        })
        .collect::<String>();
    let compact = normalized.split_whitespace().collect::<Vec<_>>().join(" ");
    let compact = compact.trim();
    if compact.is_empty() {
        return None;
    }
    Some(
        compact
            .chars()
            .take(IMAGE_WORKBENCH_FAILURE_TEXT_MAX_CHARS)
            .collect(),
    )
}

fn is_upstream_server_error(value: &str) -> bool {
    contains_any(
        value,
        &[
            "upstream_error",
            "server_error",
            "error occurred while processing your request",
            "上游",
            "模型服务处理失败",
        ],
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_provider_unavailable_error() {
        let (failure_type, failure_hint) = normalize_failure_details(
            "failed",
            None,
            None,
            Some(
                r#"生成图片失败: 模型提供商返回 HTTP 503: {"error":{"message":"No available compatible accounts","type":"api_error"}}"#,
            ),
        )
        .expect("failure details should normalize");

        assert_eq!(failure_type.as_deref(), Some("provider_unavailable"));
        assert_eq!(
            failure_hint.as_deref(),
            Some(PROVIDER_UNAVAILABLE_FAILURE_HINT)
        );
    }

    #[test]
    fn normalizes_upstream_server_error() {
        let (failure_type, failure_hint) = normalize_failure_details(
            "failed",
            None,
            None,
            Some(
                r#"生成图片失败: 模型提供商返回 HTTP 400: {"error":{"code":"upstream_error","message":"server_error"}}"#,
            ),
        )
        .expect("failure details should normalize");

        assert_eq!(failure_type.as_deref(), Some("upstream"));
        assert_eq!(failure_hint.as_deref(), Some(UPSTREAM_SERVER_FAILURE_HINT));
    }

    #[test]
    fn normalizes_cancelled_task() {
        let (failure_type, failure_hint) = normalize_failure_details("cancelled", None, None, None)
            .expect("cancelled details should normalize");

        assert_eq!(failure_type.as_deref(), Some("cancelled"));
        assert_eq!(failure_hint.as_deref(), Some("用户取消"));
    }
}
