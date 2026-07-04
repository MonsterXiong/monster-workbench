import json
import os
import sys
import time
import urllib.error

from ai_provider_actions import ProviderActionLimits, probe_model_listed, run_provider_action
from ai_provider_artifacts import (
    MAX_DECODED_IMAGE_BYTES,
    MAX_IMAGE_DOWNLOAD_TIMEOUT_SECONDS,
    MAX_IMAGE_RESPONSE_BYTES,
    is_safe_image_url,
)
from ai_provider_input import parse_provider_request
from ai_provider_results import (
    MAX_PREVIEW_CHARS,
    PROVIDER_UNAVAILABLE_MESSAGE,
    build_media_failure_result,
    classify_image_exception,
    classify_image_http_error,
    find_nested_error_message,
    format_error_message,
    media_action_label,
    sanitize_text,
    support_prefix,
    try_parse_json,
)
from provider_adapters import ProviderCapabilityError, create_provider_adapter


def read_positive_int_env(name, default):
    try:
        value = int(os.environ.get(name) or "")
        if value > 0:
            return value
    except Exception:
        pass
    return default


MAX_RESPONSE_BYTES = 4 * 1024 * 1024
MAX_AUDIO_RESPONSE_BYTES = read_positive_int_env("AI_PROVIDER_MAX_AUDIO_RESPONSE_BYTES", 64 * 1024 * 1024)
MAX_VIDEO_RESPONSE_BYTES = read_positive_int_env("AI_PROVIDER_MAX_VIDEO_RESPONSE_BYTES", 512 * 1024 * 1024)
MAX_MODELS = 200
MAX_MODEL_ID_CHARS = 256
MAX_TEXT_CHARS = 8192


def build_action_limits():
    return ProviderActionLimits(
        max_models=MAX_MODELS,
        max_model_id_chars=MAX_MODEL_ID_CHARS,
        max_response_bytes=MAX_RESPONSE_BYTES,
        max_image_response_bytes=MAX_IMAGE_RESPONSE_BYTES,
        max_audio_response_bytes=MAX_AUDIO_RESPONSE_BYTES,
        max_video_response_bytes=MAX_VIDEO_RESPONSE_BYTES,
        max_text_chars=MAX_TEXT_CHARS,
    )


def main():
    started = time.time()
    raw = sys.stdin.buffer.read().decode("utf-8").strip()
    payload = json.loads(raw or "{}")
    ctx = parse_provider_request(payload, started)
    limits = build_action_limits()

    adapter = create_provider_adapter({**ctx.config, "model": ctx.model}, ctx.timeout)
    image_adapter = create_provider_adapter({**ctx.config, "model": ctx.image_model}, ctx.timeout)
    generation_adapter = create_provider_adapter({**ctx.config, "model": ctx.generation_model or ctx.model}, ctx.timeout)

    image_model_listed = None
    if ctx.action == "image":
        image_model_listed = probe_model_listed(image_adapter, ctx.image_model, limits)

    try:
        result = run_provider_action(ctx, adapter, image_adapter, generation_adapter, limits)
    except ProviderCapabilityError as error:
        action_label = media_action_label(ctx.action)
        result = build_media_failure_result(
            ctx,
            "{0}: {1}".format(action_label, format_error_message(error)),
            failure_kind="provider_error" if ctx.action == "image" else None,
        )
    except urllib.error.HTTPError as error:
        detail = error.read(2048).decode("utf-8", errors="ignore")
        safe_detail = sanitize_text(detail)
        nested_detail = find_nested_error_message(try_parse_json(safe_detail))
        support_detail = sanitize_text(nested_detail or safe_detail)[:600] if safe_detail else "网关返回空响应"
        message_detail = safe_detail[:240] if safe_detail else "网关返回空响应"
        action_label = media_action_label(ctx.action)
        failure_kind = classify_image_http_error(error.code, support_detail or message_detail) if ctx.action == "image" else None
        if failure_kind == "provider_unavailable":
            message_detail = PROVIDER_UNAVAILABLE_MESSAGE
        result = build_media_failure_result(
            ctx,
            "{0}: 模型提供商返回 HTTP {1}: {2}".format(action_label, error.code, message_detail),
            status_code=error.code,
            failure_kind=failure_kind,
            raw_preview_value=safe_detail[:MAX_PREVIEW_CHARS],
        )
    except Exception as error:
        support_message_prefix = support_prefix(ctx.image_model, image_model_listed) if ctx.action == "image" else ""
        action_label = media_action_label(ctx.action)
        failure_kind = classify_image_exception(error) if ctx.action == "image" else None
        result = build_media_failure_result(
            ctx,
            "{0}: {1}{2}".format(action_label, support_message_prefix, format_error_message(error)),
            failure_kind=failure_kind,
        )

    sys.stdout.buffer.write(json.dumps(result, ensure_ascii=False).encode("utf-8"))


if __name__ == "__main__":
    main()
