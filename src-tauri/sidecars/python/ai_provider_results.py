import json
import time


SECRET_KEYS = {"api_key", "apikey", "apiKey", "authorization", "token", "secret", "password"}
MAX_PREVIEW_CHARS = 4096
MAX_RAW_STRING_CHARS = 512
PROVIDER_UNAVAILABLE_MESSAGE = "当前模型没有可用账号或账号池已耗尽，请换一个模型/Provider，或稍后重试"


def trim_value(value, max_chars, marker="[已截断]"):
    text = str(value or "")
    if len(text) <= max_chars:
        return text
    if max_chars <= len(marker):
        return text[:max_chars]
    return text[:max_chars - len(marker)] + marker


def sanitize_text(value):
    text = str(value or "")
    for marker in ("Bearer ", "sk-", "AIza"):
        if marker in text:
            start = text.find(marker)
            end = start + len(marker)
            while end < len(text) and text[end] not in (" ", "\n", "\r", "\t", '"', "'", ",", "}"):
                end += 1
            text = text[:start] + marker + "[已脱敏]" + text[end:]
    return text


def redact_sensitive(value):
    if isinstance(value, list):
        return [redact_sensitive(item) for item in value]
    if isinstance(value, dict):
        redacted = {}
        for key, item in value.items():
            if str(key).lower() in SECRET_KEYS:
                redacted[key] = "[已脱敏]"
            else:
                redacted[key] = redact_sensitive(item)
        return redacted
    if isinstance(value, str):
        return trim_value(sanitize_text(value), MAX_RAW_STRING_CHARS)
    return value


def mask_large_images(value):
    if isinstance(value, list):
        return [mask_large_images(item) for item in value]
    if isinstance(value, dict):
        masked = {}
        for key, item in value.items():
            if key == "b64_json" and isinstance(item, str):
                masked[key] = "[BASE64_IMAGE_OMITTED:{0} chars]".format(len(item))
            else:
                masked[key] = mask_large_images(item)
        return masked
    return value


def raw_preview(value):
    return json.dumps(redact_sensitive(mask_large_images(value)), ensure_ascii=False)[:MAX_PREVIEW_CHARS]


def format_error_message(error):
    text = str(error)
    if "10054" in text or "forcibly closed" in text:
        return "远程模型服务主动断开连接，请检查模型服务是否可用、/images/generations 是否已接入，或稍后重试"
    return sanitize_text(text)[:240]


def try_parse_json(value):
    try:
        return json.loads(value)
    except Exception:
        return None


def find_nested_error_message(value):
    if isinstance(value, dict):
        error = value.get("error")
        if isinstance(error, dict):
            message = error.get("message")
            if isinstance(message, str) and message.strip():
                nested = try_parse_json(message)
                return find_nested_error_message(nested) or message
        message = value.get("message")
        if isinstance(message, str) and message.strip():
            nested = try_parse_json(message)
            return find_nested_error_message(nested) or message
        for item in value.values():
            found = find_nested_error_message(item)
            if found:
                return found
    if isinstance(value, list):
        for item in value:
            found = find_nested_error_message(item)
            if found:
                return found
    return ""


def support_prefix(model, model_listed):
    if model_listed is True:
        return "模型 {0} 已出现在 /models 列表中，但 ".format(model)
    if model_listed is False:
        return "模型 {0} 未出现在 /models 列表中，".format(model)
    return ""


def is_remote_disconnect(error):
    text = str(error).lower()
    return (
        "10054" in text
        or "10061" in text
        or "forcibly closed" in text
        or "actively refused" in text
        or "connection refused" in text
        or "connection reset" in text
        or "econnreset" in text
        or "remote end closed connection" in text
        or "remote disconnected" in text
    )


def is_timeout_error(error):
    text = str(error).lower()
    return isinstance(error, TimeoutError) or "timed out" in text or "timeout" in text or "超时" in text


def classify_image_http_error(status_code, detail):
    text = str(detail or "").lower()
    if status_code == 503 and is_provider_account_unavailable(text):
        return "provider_unavailable"
    if status_code in (400, 413, 422) and any(
        marker in text
        for marker in (
            "size",
            "width",
            "height",
            "dimension",
            "resolution",
            "unsupported",
            "invalid",
            "too large",
            "尺寸",
            "宽度",
            "高度",
            "分辨率",
            "不支持",
            "无效",
            "过大",
        )
    ):
        return "unsupported_size"
    if status_code == 429:
        return "rate_limited"
    if status_code in (401, 403):
        return "auth"
    return "provider_http"


def is_provider_account_unavailable(text):
    return any(
        marker in text
        for marker in (
            "no available compatible accounts",
            "no available accounts",
            "no compatible accounts",
            "no available account",
            "account pool",
            "compatible accounts",
            "账号池",
            "可用账号",
            "兼容账号",
        )
    )


def classify_image_exception(error):
    if is_timeout_error(error):
        return "timeout"
    if is_remote_disconnect(error):
        return "connection"
    return "provider_error"


def media_action_label(action):
    if action == "image":
        return "生成图片失败"
    if action == "audio":
        return "生成音频失败"
    if action == "video":
        return "生成视频失败"
    if action == "chat":
        return "模型对话失败"
    return "模型提供商请求失败"


def media_result_model(action, model, image_model, generation_model):
    if action == "image":
        return image_model
    if action in ("chat", "audio", "video"):
        return generation_model or model
    return model


def build_provider_result(ctx, ok, model, message, status_code=None, **fields):
    result = {
        "ok": ok,
        "action": ctx.action,
        "provider": ctx.provider,
        "model": model,
        "baseUrl": ctx.base_url,
        "latencyMs": int((time.time() - ctx.started) * 1000),
        "message": message,
        "statusCode": status_code,
    }
    result.update(fields)
    result["requestId"] = ctx.request_id
    return result


def build_media_failure_result(ctx, message, status_code=None, failure_kind=None, raw_preview_value=None):
    return build_provider_result(
        ctx,
        False,
        media_result_model(ctx.action, ctx.model, ctx.image_model, ctx.generation_model),
        message,
        status_code=status_code,
        models=None,
        text=None,
        imageUrls=None,
        imagePaths=None,
        savedFiles=None,
        artifacts=None,
        apiImageSize=ctx.image_size if ctx.action == "image" else None,
        requestedImageSize=ctx.image_size if ctx.action == "image" else None,
        actualImageSize=None,
        fallbackImageSize=None,
        imageAttempts=1 if ctx.action == "image" else None,
        failureKind=failure_kind,
        rawPreview=raw_preview_value,
    )
