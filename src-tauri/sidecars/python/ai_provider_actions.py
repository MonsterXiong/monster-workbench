from dataclasses import dataclass

from ai_provider_artifacts import (
    MAX_IMAGE_ITEMS,
    first_saved_file_dimensions,
    parse_images,
    saved_file_to_artifact,
)
from ai_provider_results import build_provider_result, raw_preview


@dataclass
class ProviderActionLimits:
    max_models: int
    max_model_id_chars: int
    max_response_bytes: int
    max_image_response_bytes: int
    max_audio_response_bytes: int
    max_video_response_bytes: int
    max_text_chars: int


def clamp_int(value, default, minimum, maximum):
    try:
        number = int(value)
    except Exception:
        number = default
    return max(minimum, min(maximum, number))


def clamp_float(value, default, minimum, maximum):
    try:
        number = float(value)
    except Exception:
        number = default
    return max(minimum, min(maximum, number))


def resolve_api_image_size(image_size):
    return str(image_size or "1024x1024")


def probe_model_listed(adapter, model, limits):
    try:
        result = adapter.list_models(
            max_models=limits.max_models,
            max_model_id_chars=limits.max_model_id_chars,
            max_response_bytes=limits.max_response_bytes,
        )
        return model in result.get("models", [])
    except Exception:
        return None


def run_models_action(ctx, adapter, limits):
    provider_result = adapter.list_models(
        max_models=limits.max_models,
        max_model_id_chars=limits.max_model_id_chars,
        max_response_bytes=limits.max_response_bytes,
    )
    models = provider_result["models"]
    parsed = provider_result["raw"]
    return build_provider_result(
        ctx,
        True,
        ctx.model,
        "模型列表查询成功，共 {0} 个模型".format(len(models)),
        status_code=provider_result["statusCode"],
        models=models,
        text=None,
        imageUrls=None,
        imagePaths=None,
        rawPreview=raw_preview(parsed),
    )


def run_image_action(ctx, image_adapter, limits):
    api_image_size = resolve_api_image_size(ctx.image_size)
    image_count = max(1, min(MAX_IMAGE_ITEMS, int(ctx.config.get("imageCount") or 1)))
    provider_result = image_adapter.image(
        ctx.image_prompt,
        api_image_size,
        image_count=image_count,
        max_response_bytes=limits.max_image_response_bytes,
    )
    parsed = provider_result["raw"]
    image_urls, image_paths, saved_files = parse_images(parsed, ctx.output_dir, ctx.timeout, ctx.base_url)
    saved_file_dimensions = first_saved_file_dimensions(saved_files)
    actual_image_size = saved_file_dimensions or api_image_size
    result = build_provider_result(
        ctx,
        len(image_urls) > 0 or len(image_paths) > 0,
        ctx.image_model,
        "生图测试成功，已保存 {0} 张图片到本地".format(len(image_paths)) if image_paths else "生图接口已响应，但未保存到本地图片",
        status_code=provider_result["statusCode"],
        models=None,
        text=None,
        imageUrls=image_urls,
        imagePaths=image_paths,
        savedFiles=saved_files,
        artifacts=[saved_file_to_artifact("image", item) for item in saved_files],
        apiImageSize=api_image_size,
        requestedImageSize=ctx.image_size,
        actualImageSize=actual_image_size,
        fallbackImageSize=None,
        imageAttempts=1,
        failureKind=None,
        rawPreview=raw_preview(parsed),
    )
    if result["ok"] and saved_file_dimensions and saved_file_dimensions != ctx.image_size:
        result["message"] = "生图测试成功，但返回图片尺寸为 {0}，与请求尺寸 {1} 不一致".format(
            saved_file_dimensions,
            ctx.image_size,
        )
    return result


def run_audio_action(ctx, generation_adapter, limits):
    response_format = str(ctx.generation_options.get("format") or "mp3").strip().lower()
    voice = str(ctx.generation_options.get("voice") or "alloy").strip() or "alloy"
    provider_result = generation_adapter.audio(
        ctx.prompt,
        ctx.output_dir,
        voice=voice,
        response_format=response_format,
        max_response_bytes=limits.max_audio_response_bytes,
    )
    saved_file = provider_result["savedFile"]
    return build_provider_result(
        ctx,
        bool(saved_file.get("path")),
        ctx.generation_model or ctx.model,
        "音频生成成功，已保存到本地",
        status_code=provider_result["statusCode"],
        models=None,
        text=None,
        imageUrls=None,
        imagePaths=None,
        savedFiles=None,
        artifacts=[saved_file_to_artifact("audio", saved_file)],
        apiImageSize=None,
        requestedImageSize=None,
        actualImageSize=None,
        fallbackImageSize=None,
        imageAttempts=None,
        failureKind=None,
        rawPreview=None,
    )


def run_video_action(ctx, generation_adapter, limits):
    duration_seconds = ctx.generation_options.get("durationSeconds")
    try:
        duration_seconds = int(duration_seconds) if duration_seconds is not None else None
    except Exception:
        duration_seconds = None
    video_size = str(ctx.generation_options.get("size") or "1280x720")
    provider_result = generation_adapter.video(
        ctx.prompt,
        ctx.output_dir,
        size=video_size,
        duration_seconds=duration_seconds,
        max_response_bytes=limits.max_video_response_bytes,
    )
    saved_file = provider_result["savedFile"]
    return build_provider_result(
        ctx,
        bool(saved_file.get("path")),
        ctx.generation_model or ctx.model,
        "视频生成成功，已保存到本地",
        status_code=provider_result["statusCode"],
        models=None,
        text=None,
        imageUrls=None,
        imagePaths=None,
        savedFiles=None,
        artifacts=[saved_file_to_artifact("video", saved_file, duration_seconds)],
        apiImageSize=None,
        requestedImageSize=video_size,
        actualImageSize=None,
        fallbackImageSize=None,
        imageAttempts=None,
        failureKind=None,
        rawPreview=raw_preview(provider_result.get("raw") or {}),
    )


def run_chat_action(ctx, adapter, generation_adapter, limits):
    chat_adapter = generation_adapter if ctx.generation else adapter
    max_tokens = clamp_int(ctx.generation_options.get("maxTokens"), 64, 1, 8192)
    temperature = clamp_float(ctx.generation_options.get("temperature"), 0, 0, 2)
    provider_result = chat_adapter.chat(
        ctx.prompt,
        max_tokens=max_tokens,
        temperature=temperature,
        max_text_chars=limits.max_text_chars,
        max_response_bytes=limits.max_response_bytes,
    )
    parsed = provider_result["raw"]
    return build_provider_result(
        ctx,
        True,
        provider_result["model"],
        "文本模型测试成功",
        status_code=provider_result["statusCode"],
        models=None,
        text=provider_result["text"],
        imageUrls=None,
        imagePaths=None,
        rawPreview=raw_preview(parsed),
    )


def run_provider_action(ctx, adapter, image_adapter, generation_adapter, limits):
    if ctx.action == "models":
        return run_models_action(ctx, adapter, limits)
    if ctx.action == "image":
        return run_image_action(ctx, image_adapter, limits)
    if ctx.action == "audio":
        return run_audio_action(ctx, generation_adapter, limits)
    if ctx.action == "video":
        return run_video_action(ctx, generation_adapter, limits)
    return run_chat_action(ctx, adapter, generation_adapter, limits)
