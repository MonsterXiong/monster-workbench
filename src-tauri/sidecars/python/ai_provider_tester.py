import json
import base64
import binascii
import ipaddress
import os
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

MAX_RESPONSE_BYTES = 4 * 1024 * 1024
MAX_IMAGE_RESPONSE_BYTES = 64 * 1024 * 1024
MAX_DECODED_IMAGE_BYTES = 32 * 1024 * 1024
MAX_PREVIEW_CHARS = 4096
MAX_MODELS = 200
MAX_MODEL_ID_CHARS = 256
MAX_TEXT_CHARS = 8192
MAX_IMAGE_ITEMS = 4
MAX_IMAGE_URL_CHARS = 2048
MAX_RAW_STRING_CHARS = 512
SECRET_KEYS = {"api_key", "apikey", "apiKey", "authorization", "token", "secret", "password"}


def normalize_base_url(base_url):
    return base_url.rstrip("/")


def build_chat_url(base_url):
    clean = normalize_base_url(base_url)
    if clean.endswith("/chat/completions"):
        return clean
    return clean + "/chat/completions"


def build_models_url(base_url):
    clean = normalize_base_url(base_url)
    if clean.endswith("/models"):
        return clean
    return clean + "/models"


def build_images_url(base_url):
    clean = normalize_base_url(base_url)
    if clean.endswith("/images/generations"):
        return clean
    return clean + "/images/generations"


def is_local_url(url):
    clean = (url or "").lower()
    return clean.startswith("http://127.0.0.1") or clean.startswith("http://localhost")


def is_restricted_host(hostname):
    clean = (hostname or "").strip().lower().strip("[]")
    if not clean:
        return True
    if clean in ("localhost",):
        return True

    try:
        ip = ipaddress.ip_address(clean)
        return ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified
    except ValueError:
        pass

    try:
        for family, _, _, _, sockaddr in socket.getaddrinfo(clean, None):
            if family not in (socket.AF_INET, socket.AF_INET6):
                continue
            ip = ipaddress.ip_address(sockaddr[0])
            if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
                return True
    except Exception:
        return True

    return False


def is_safe_image_url(url, provider_base_url):
    parsed = urllib.parse.urlparse(str(url or ""))
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return False
    if parsed.username or parsed.password:
        return False
    if is_local_url(provider_base_url):
        return True
    return not is_restricted_host(parsed.hostname)


def raw_preview(value):
    return json.dumps(redact_sensitive(mask_large_images(value)), ensure_ascii=False)[:MAX_PREVIEW_CHARS]


def format_error_message(error):
    text = str(error)
    if "10054" in text or "forcibly closed" in text:
        return "远程模型服务主动断开连接，请检查模型服务是否可用、/images/generations 是否已接入，或稍后重试"
    return sanitize_text(text)[:240]


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


def request_json(url, method, headers, body, timeout, max_bytes=MAX_RESPONSE_BYTES, retries=1):
    data = None if body is None else json.dumps(body).encode("utf-8")
    last_error = None
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({})) if is_local_url(url) else None
    for attempt in range(retries + 1):
        try:
            request = urllib.request.Request(url, data=data, headers=headers, method=method)
            open_url = opener.open if opener else urllib.request.urlopen
            with open_url(request, timeout=timeout) as response:
                raw = response.read(max_bytes + 1)
                if len(raw) > max_bytes:
                    raise RuntimeError("响应体超过 {0} MB，请降低图片尺寸或改用返回 URL 的生图接口".format(max_bytes // 1024 // 1024))
                parsed = json.loads(raw.decode("utf-8", errors="ignore") or "{}")
                return response.status, parsed
        except urllib.error.HTTPError:
            raise
        except Exception as error:
            last_error = error
            if attempt >= retries:
                break
            time.sleep(0.4)
    raise last_error


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


def try_parse_json(value):
    try:
        return json.loads(value)
    except Exception:
        return None


def probe_model_listed(base_url, headers, model, timeout):
    try:
        _, parsed = request_json(
            build_models_url(base_url),
            "GET",
            headers,
            None,
            min(max(timeout, 3), 10),
            retries=0,
        )
        return model in parse_models(parsed)
    except Exception:
        return None


def support_prefix(model, model_listed):
    if model_listed is True:
        return "模型 {0} 已出现在 /models 列表中，但 ".format(model)
    if model_listed is False:
        return "模型 {0} 未出现在 /models 列表中，".format(model)
    return ""


def is_remote_disconnect(error):
    text = str(error).lower()
    return "10054" in text or "forcibly closed" in text or "connection reset" in text or "econnreset" in text


def request_image_generation(base_url, headers, body, timeout):
    return request_json(
        build_images_url(base_url),
        "POST",
        headers,
        body,
        timeout,
        max_bytes=MAX_IMAGE_RESPONSE_BYTES,
        retries=0
    )


def request_image_generation_with_recovery(base_url, headers, body, timeout):
    primary_body = dict(body)
    candidates = [primary_body]
    if primary_body.get("size") != "1024x1024":
        fallback_body = dict(primary_body)
        fallback_body["size"] = "1024x1024"
        candidates.append(fallback_body)
        candidates.append(dict(fallback_body))
    else:
        candidates.append(dict(primary_body))

    last_error = None
    for index, candidate in enumerate(candidates):
        if index > 0:
            time.sleep(2)
        try:
            status, parsed = request_image_generation(base_url, headers, candidate, timeout)
            fallback_size = candidate.get("size") if candidate.get("size") != primary_body.get("size") else None
            return status, parsed, fallback_size, index + 1
        except Exception as error:
            last_error = error
            if not is_remote_disconnect(error):
                raise
    raise last_error


def ensure_output_dir(output_dir):
    if not output_dir:
        return None
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


def guess_extension(content_type, fallback=".png"):
    content_type = (content_type or "").lower()
    if "jpeg" in content_type or "jpg" in content_type:
        return ".jpg"
    if "webp" in content_type:
        return ".webp"
    if "gif" in content_type:
        return ".gif"
    if "png" in content_type:
        return ".png"
    return fallback


def mime_from_extension(ext):
    ext = (ext or "").lower()
    if ext in (".jpg", ".jpeg"):
        return "image/jpeg"
    if ext == ".webp":
        return "image/webp"
    if ext == ".gif":
        return "image/gif"
    return "image/png"


def save_bytes(output_dir, data, ext, mime_type=None):
    if len(data) > MAX_DECODED_IMAGE_BYTES:
        raise RuntimeError("图片内容超过 {0} MB，请降低图片尺寸".format(MAX_DECODED_IMAGE_BYTES // 1024 // 1024))
    target_dir = ensure_output_dir(output_dir)
    if not target_dir:
        return None
    file_name = "ai-image-{0}{1}".format(uuid.uuid4().hex, ext)
    target_path = os.path.join(target_dir, file_name)
    with open(target_path, "wb") as file:
        file.write(data)
    return {
        "path": target_path,
        "sizeBytes": len(data),
        "mimeType": mime_type or mime_from_extension(ext)
    }


def save_base64_image(output_dir, value):
    b64_value = str(value)
    if "," in b64_value and b64_value.startswith("data:"):
        header, b64_value = b64_value.split(",", 1)
        ext = ".jpg" if "jpeg" in header or "jpg" in header else ".webp" if "webp" in header else ".png"
    else:
        ext = ".png"
    try:
        decoded_size = (len(b64_value.rstrip("=")) * 3) // 4
        if decoded_size > MAX_DECODED_IMAGE_BYTES:
            raise RuntimeError("图片内容超过 {0} MB，请降低图片尺寸".format(MAX_DECODED_IMAGE_BYTES // 1024 // 1024))
        data = base64.b64decode(b64_value, validate=True)
    except binascii.Error as error:
        raise RuntimeError("图片 Base64 数据格式不合法: {0}".format(error))
    return save_bytes(output_dir, data, ext, mime_from_extension(ext))


def download_image_to_file(output_dir, url, timeout):
    request = urllib.request.Request(url, method="GET")
    download_timeout = min(max(timeout, 3), 15)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({})) if is_local_url(url) else None
    open_url = opener.open if opener else urllib.request.urlopen
    with open_url(request, timeout=download_timeout) as response:
        content_type = response.headers.get("Content-Type", "")
        content_length = int(response.headers.get("Content-Length", "0") or "0")
        if content_length > MAX_IMAGE_RESPONSE_BYTES:
            raise RuntimeError("图片响应体超过 {0} MB，请降低图片尺寸或改用较小图片".format(MAX_IMAGE_RESPONSE_BYTES // 1024 // 1024))
        data = response.read(MAX_IMAGE_RESPONSE_BYTES + 1)
        if len(data) > MAX_IMAGE_RESPONSE_BYTES:
            raise RuntimeError("图片响应体超过 {0} MB，请降低图片尺寸或改用较小图片".format(MAX_IMAGE_RESPONSE_BYTES // 1024 // 1024))
        return save_bytes(output_dir, data, guess_extension(content_type), content_type or None)


def parse_models(payload):
    models = []
    for item in payload.get("data") or []:
        model_id = item.get("id") if isinstance(item, dict) else None
        if model_id:
            models.append(trim_value(model_id, MAX_MODEL_ID_CHARS))
        if len(models) >= MAX_MODELS:
            break
    return models


def trim_value(value, max_chars, marker="[已截断]"):
    text = str(value or "")
    if len(text) <= max_chars:
        return text
    if max_chars <= len(marker):
        return text[:max_chars]
    return text[:max_chars - len(marker)] + marker


def trim_text(value, max_chars=MAX_TEXT_CHARS):
    return trim_value(value, max_chars, "\n[内容过长，已截断]")


def parse_chat_text(payload):
    choices = payload.get("choices") or []
    if not choices:
        return ""
    first = choices[0] or {}
    message = first.get("message") or {}
    content = message.get("content")
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                parts.append(str(item.get("text") or item.get("content") or ""))
        return trim_text("".join(parts))
    return trim_text(content or first.get("text") or "")


def parse_images(payload, output_dir, timeout, provider_base_url):
    urls = []
    paths = []
    saved_files = []
    for item in (payload.get("data") or [])[:MAX_IMAGE_ITEMS]:
        if not isinstance(item, dict):
            continue
        if item.get("url"):
            url = str(item["url"])
            if len(url) > MAX_IMAGE_URL_CHARS:
                continue
            if not is_safe_image_url(url, provider_base_url):
                continue
            try:
                saved_path = download_image_to_file(output_dir, url, timeout)
                if saved_path:
                    paths.append(saved_path["path"])
                    saved_files.append(saved_path)
                else:
                    urls.append(url)
            except Exception:
                urls.append(url)
        elif item.get("b64_json"):
            try:
                saved_path = save_base64_image(output_dir, item["b64_json"])
                if saved_path:
                    paths.append(saved_path["path"])
                    saved_files.append(saved_path)
            except Exception:
                continue
    return urls, paths, saved_files


def main():
    started = time.time()
    raw = sys.stdin.buffer.read().decode("utf-8").strip()
    payload = json.loads(raw or "{}")
    config = payload.get("config") or {}
    action = payload.get("action") or "chat"
    output_dir = payload.get("outputDir") or ""
    request_id = payload.get("requestId") or ""

    provider = config.get("provider") or "custom"
    base_url = normalize_base_url(config.get("baseUrl") or "")
    api_key = config.get("apiKey") or ""
    model = config.get("model") or ""
    prompt = config.get("testPrompt") or "ping"
    image_model = config.get("imageModel") or model
    image_prompt = config.get("imagePrompt") or prompt
    image_size = config.get("imageSize") or "1024x1024"
    timeout_ms = int(config.get("timeoutMs") or 20000)
    timeout = max(timeout_ms / 1000, 3)

    headers = {
        "Content-Type": "application/json"
    }
    if api_key:
        headers["Authorization"] = "Bearer " + api_key

    image_model_listed = None
    if action == "image":
        image_model_listed = probe_model_listed(base_url, headers, image_model, timeout)

    try:
        if action == "models":
            status, parsed = request_json(build_models_url(base_url), "GET", headers, None, timeout)
            models = parse_models(parsed)
            result = {
                "ok": True,
                "action": action,
                "provider": provider,
                "model": model,
                "baseUrl": base_url,
                "latencyMs": int((time.time() - started) * 1000),
                "message": "模型列表查询成功，共 {0} 个模型".format(len(models)),
                "statusCode": status,
                "models": models,
                "text": None,
                "imageUrls": None,
                "imagePaths": None,
                "rawPreview": raw_preview(parsed)
            }
        elif action == "image":
            body = {
                "model": image_model,
                "prompt": image_prompt,
                "n": 1,
                "size": image_size
            }
            status, parsed, fallback_size, image_attempts = request_image_generation_with_recovery(
                base_url,
                headers,
                body,
                timeout,
            )
            image_urls, image_paths, saved_files = parse_images(parsed, output_dir, timeout, base_url)
            result = {
                "ok": len(image_urls) > 0 or len(image_paths) > 0,
                "action": action,
                "provider": provider,
                "model": image_model,
                "baseUrl": base_url,
                "latencyMs": int((time.time() - started) * 1000),
                "message": "生图测试成功，已保存 {0} 张图片到本地".format(len(image_paths)) if image_paths else "生图接口已响应，但未保存到本地图片",
                "statusCode": status,
                "models": None,
                "text": None,
                "imageUrls": image_urls,
                "imagePaths": image_paths,
                "savedFiles": saved_files,
                "rawPreview": raw_preview(parsed)
            }
            if fallback_size and image_paths:
                result["message"] = "生图测试成功，所选尺寸暂不稳定，已自动降级为 {0} 并保存 {1} 张图片到本地".format(fallback_size, len(image_paths))
            elif image_attempts > 1 and image_paths:
                result["message"] = "生图测试成功，远程服务首次断开后已自动重试并保存 {0} 张图片到本地".format(len(image_paths))
        else:
            body = {
                "model": model,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 64,
                "temperature": 0
            }
            status, parsed = request_json(build_chat_url(base_url), "POST", headers, body, timeout)
            text = parse_chat_text(parsed)
            result = {
                "ok": True,
                "action": action,
                "provider": provider,
                "model": model,
                "baseUrl": base_url,
                "latencyMs": int((time.time() - started) * 1000),
                "message": "文本模型测试成功",
                "statusCode": status,
                "models": None,
                "text": text,
                "imageUrls": None,
                "imagePaths": None,
                "rawPreview": raw_preview(parsed)
            }
        result["requestId"] = request_id
    except urllib.error.HTTPError as error:
        detail = error.read(2048).decode("utf-8", errors="ignore")
        safe_detail = sanitize_text(detail)
        nested_detail = find_nested_error_message(try_parse_json(safe_detail))
        support_detail = sanitize_text(nested_detail or safe_detail)[:600] if safe_detail else "网关返回空响应"
        support_message_prefix = support_prefix(image_model, image_model_listed) if action == "image" else ""
        message_detail = safe_detail[:240] if safe_detail else "网关返回空响应"
        action_label = "生成图片失败" if action == "image" else "模型对话失败" if action == "chat" else "模型提供商请求失败"
        result = {
            "ok": False,
            "action": action,
            "provider": provider,
            "model": image_model if action == "image" else model,
            "baseUrl": base_url,
            "latencyMs": int((time.time() - started) * 1000),
            "message": "{0}: 模型提供商返回 HTTP {1}: {2}".format(action_label, error.code, message_detail),
            "statusCode": error.code,
            "models": None,
            "text": None,
            "imageUrls": None,
            "imagePaths": None,
            "savedFiles": None,
            "rawPreview": safe_detail[:MAX_PREVIEW_CHARS]
        }
        result["requestId"] = request_id
    except Exception as error:
        support_message_prefix = support_prefix(image_model, image_model_listed) if action == "image" else ""
        action_label = "生成图片失败" if action == "image" else "模型对话失败" if action == "chat" else "模型提供商请求失败"
        result = {
            "ok": False,
            "action": action,
            "provider": provider,
            "model": image_model if action == "image" else model,
            "baseUrl": base_url,
            "latencyMs": int((time.time() - started) * 1000),
            "message": "{0}: {1}{2}".format(action_label, support_message_prefix, format_error_message(error)),
            "statusCode": None,
            "models": None,
            "text": None,
            "imageUrls": None,
            "imagePaths": None,
            "savedFiles": None,
            "rawPreview": None
        }
        result["requestId"] = request_id

    sys.stdout.buffer.write(json.dumps(result, ensure_ascii=False).encode("utf-8"))


if __name__ == "__main__":
    main()
