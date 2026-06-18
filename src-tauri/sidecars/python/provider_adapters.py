import json
import os
import time
import uuid
import urllib.parse
import urllib.request


DEFAULT_MAX_RESPONSE_BYTES = 4 * 1024 * 1024
PROVIDER_REGISTRY_FILE_NAME = "ai-provider-registry.json"
AUDIO_RESPONSE_FORMAT_EXTENSIONS = {
    "mp3": ".mp3",
    "wav": ".wav",
    "opus": ".opus",
    "aac": ".aac",
    "flac": ".flac",
    "pcm": ".pcm",
}
FALLBACK_PROVIDER_REGISTRY = {
    "defaultAdapterId": "openai-compatible",
    "adapters": {
        "openai-compatible": {
            "capabilities": ["models", "chat", "image", "txt2img", "audio", "video"],
        },
        "anthropic-messages": {
            "capabilities": ["chat"],
            "baseUrlHostPatterns": ["api.anthropic.com"],
        },
    },
}
_PROVIDER_REGISTRY_CACHE = None


class ProviderCapabilityError(RuntimeError):
    pass


def normalize_base_url(base_url):
    return str(base_url or "").rstrip("/")


def is_local_url(url):
    clean = str(url or "").lower()
    return clean.startswith("http://127.0.0.1") or clean.startswith("http://localhost")


def find_provider_registry_path():
    env_path = os.environ.get("MONSTER_AI_PROVIDER_REGISTRY_PATH")
    candidates = [env_path] if env_path else []
    current_dir = os.path.dirname(os.path.abspath(__file__))
    for root in [current_dir, os.getcwd(), *list_parent_dirs(current_dir), *list_parent_dirs(os.getcwd())]:
        candidates.append(os.path.join(root, "src", "config", PROVIDER_REGISTRY_FILE_NAME))
        candidates.append(os.path.join(root, "shared", PROVIDER_REGISTRY_FILE_NAME))
        candidates.append(os.path.join(root, PROVIDER_REGISTRY_FILE_NAME))

    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate
    return ""


def list_parent_dirs(path, limit=6):
    parents = []
    current = os.path.abspath(path or ".")
    for _ in range(limit):
        parent = os.path.dirname(current)
        if not parent or parent == current:
            break
        parents.append(parent)
        current = parent
    return parents


def load_provider_registry():
    global _PROVIDER_REGISTRY_CACHE
    if _PROVIDER_REGISTRY_CACHE is not None:
        return _PROVIDER_REGISTRY_CACHE

    registry_path = find_provider_registry_path()
    if registry_path:
        try:
            with open(registry_path, "r", encoding="utf-8") as file:
                _PROVIDER_REGISTRY_CACHE = json.load(file)
                return _PROVIDER_REGISTRY_CACHE
        except Exception:
            pass

    _PROVIDER_REGISTRY_CACHE = FALLBACK_PROVIDER_REGISTRY
    return _PROVIDER_REGISTRY_CACHE


def get_registry_adapters():
    registry = load_provider_registry()
    return registry.get("adapters") or {}


def get_registry_adapter(adapter_id):
    return get_registry_adapters().get(str(adapter_id or ""))


def get_default_adapter_id():
    registry = load_provider_registry()
    return str(registry.get("defaultAdapterId") or "openai-compatible")


def resolve_adapter_capabilities(adapter_id, fallback):
    adapter = get_registry_adapter(adapter_id) or {}
    capabilities = adapter.get("capabilities")
    if isinstance(capabilities, list) and capabilities:
        return frozenset(str(item) for item in capabilities)
    return frozenset(fallback)


def normalize_capability_override(value):
    if not isinstance(value, list):
        return frozenset()
    capabilities = {str(item).strip() for item in value if str(item or "").strip()}
    if capabilities.intersection({"image", "txt2img", "img2img", "inpaint", "upscale_2x", "upscale_4x", "person_consistency"}):
        capabilities.add("image")
        capabilities.add("txt2img")
    return frozenset(capabilities)


def base_url_matches_adapter(adapter_id, base_url):
    adapter = get_registry_adapter(adapter_id) or {}
    patterns = adapter.get("baseUrlHostPatterns") or []
    clean_url = normalize_base_url(base_url).lower()
    return any(str(pattern or "").lower() in clean_url for pattern in patterns)


def is_known_adapter(adapter_id):
    return str(adapter_id or "") in get_registry_adapters()


def trim_value(value, max_chars, marker="[已截断]"):
    text = str(value or "")
    if len(text) <= max_chars:
        return text
    if max_chars <= len(marker):
        return text[:max_chars]
    return text[:max_chars - len(marker)] + marker


def trim_text(value, max_chars):
    return trim_value(value, max_chars, "\n[内容过长，已截断]")


def request_json(url, method, headers, body, timeout, max_bytes=DEFAULT_MAX_RESPONSE_BYTES, retries=0):
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
                    raise RuntimeError(
                        "响应体超过 {0} MB，请降低图片尺寸或改用返回 URL 的生图接口".format(
                            max_bytes // 1024 // 1024
                        )
                    )
                parsed = json.loads(raw.decode("utf-8", errors="ignore") or "{}")
                return response.status, parsed
        except urllib.error.HTTPError:
            raise
        except Exception as error:
            last_error = error
            if attempt >= retries:
                break
    raise last_error


def ensure_output_dir(output_dir):
    if not output_dir:
        raise ValueError("outputDir is required for media generation")
    os.makedirs(output_dir, exist_ok=True)
    return output_dir


def extension_from_content_type(content_type, fallback_ext):
    clean = str(content_type or "").lower()
    if "mpeg" in clean or "mp3" in clean:
        return ".mp3"
    if "wav" in clean:
        return ".wav"
    if "opus" in clean:
        return ".opus"
    if "aac" in clean:
        return ".aac"
    if "flac" in clean:
        return ".flac"
    if "webm" in clean:
        return ".webm"
    if "quicktime" in clean or "mov" in clean:
        return ".mov"
    if "mp4" in clean:
        return ".mp4"
    return fallback_ext


def base_content_type(content_type):
    return str(content_type or "").split(";", 1)[0].strip().lower()


def is_text_response_content_type(content_type):
    clean = base_content_type(content_type)
    non_media_types = {
        "application/json",
        "application/javascript",
        "application/problem+json",
        "application/xhtml+xml",
        "application/xml",
    }
    return (
        clean.startswith("text/")
        or clean.endswith("+json")
        or clean.endswith("+xml")
        or clean in non_media_types
    )


def validate_media_content_type(content_type, default_mime_type, allowed_prefixes, allowed_types):
    clean = base_content_type(content_type or default_mime_type)
    if not clean:
        return default_mime_type
    if is_text_response_content_type(clean):
        raise RuntimeError("unexpected media response content-type: {0}".format(clean))
    allowed_prefixes = tuple(allowed_prefixes or ())
    allowed_types = set(allowed_types or ())
    if allowed_prefixes and not clean.startswith(allowed_prefixes) and clean not in allowed_types:
        raise RuntimeError("unexpected media response content-type: {0}".format(clean))
    return content_type or default_mime_type


def looks_like_text_error_payload(chunk):
    if not chunk:
        return False
    sample = chunk[:512].lstrip(b"\xef\xbb\xbf\r\n\t ")
    lowered = sample[:32].lower()
    return (
        lowered.startswith(b"{")
        or lowered.startswith(b"[")
        or lowered.startswith(b"<!doctype")
        or lowered.startswith(b"<html")
        or lowered.startswith(b"<?xml")
    )


def normalize_audio_response_format(value):
    clean = str(value or "mp3").strip().lower()
    if clean in AUDIO_RESPONSE_FORMAT_EXTENSIONS:
        return clean, AUDIO_RESPONSE_FORMAT_EXTENSIONS[clean]
    return "mp3", AUDIO_RESPONSE_FORMAT_EXTENSIONS["mp3"]


def request_binary_to_file(
    url,
    method,
    headers,
    body,
    timeout,
    output_dir,
    file_prefix,
    fallback_ext,
    default_mime_type,
    max_bytes,
    allowed_prefixes=None,
    allowed_types=None,
):
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({})) if is_local_url(url) else None
    open_url = opener.open if opener else urllib.request.urlopen
    target_dir = ensure_output_dir(output_dir)

    with open_url(request, timeout=timeout) as response:
        content_type = validate_media_content_type(
            response.headers.get("Content-Type", ""),
            default_mime_type,
            allowed_prefixes,
            allowed_types,
        )
        content_length = int(response.headers.get("Content-Length", "0") or "0")
        if content_length > max_bytes:
            raise RuntimeError("media response exceeds {0} MB".format(max_bytes // 1024 // 1024))

        extension = extension_from_content_type(content_type, fallback_ext)
        target_path = os.path.join(target_dir, "{0}-{1}{2}".format(file_prefix, uuid.uuid4().hex, extension))
        written = 0
        try:
            with open(target_path, "wb") as file:
                first_chunk = True
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    if first_chunk:
                        first_chunk = False
                        if looks_like_text_error_payload(chunk):
                            raise RuntimeError("unexpected media response body")
                    written += len(chunk)
                    if written > max_bytes:
                        raise RuntimeError("media response exceeds {0} MB".format(max_bytes // 1024 // 1024))
                    file.write(chunk)
                if written == 0:
                    raise RuntimeError("media response was empty")
        except Exception:
            try:
                os.remove(target_path)
            except Exception:
                pass
            raise

        return response.status, {
            "path": target_path,
            "sizeBytes": written,
            "mimeType": content_type or default_mime_type,
            "dimensions": None,
        }


def parse_openai_models(payload, max_models=200, max_model_id_chars=256):
    models = []
    for item in payload.get("data") or []:
        model_id = item.get("id") if isinstance(item, dict) else None
        if model_id:
            models.append(trim_value(model_id, max_model_id_chars))
        if len(models) >= max_models:
            break
    return models


def parse_openai_chat_text(payload, max_text_chars=None):
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
        text = "".join(parts)
    else:
        text = str(content or first.get("text") or "")
    return trim_text(text, max_text_chars) if max_text_chars else text


def clean_optional_text(value):
    return str(value or "").strip()


def parse_json_or_text(value):
    text = clean_optional_text(value)
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        return text


def normalize_positive_int(value):
    try:
        number = int(value)
    except Exception:
        return None
    return number if number > 0 else None


def openai_compatible_image_extension_fields(image_request):
    request = image_request if isinstance(image_request, dict) else {}
    if not request.get("nativeSupported") or request.get("promptFallback"):
        return {}

    capability = clean_optional_text(request.get("capability")).lower()
    if capability in ("", "image", "txt2img"):
        return {}

    fields = {"generation_mode": capability}
    reference_image_path = clean_optional_text(request.get("referenceImagePath"))
    source_image_path = clean_optional_text(request.get("sourceImagePath"))
    mask_path = clean_optional_text(request.get("maskPath"))
    source_asset_id = clean_optional_text(request.get("sourceAssetId"))
    reference_asset_ids = request.get("referenceAssetIds")

    if capability in ("img2img", "person_consistency"):
        reference_image = reference_image_path or source_image_path
        if reference_image:
            fields["reference_image"] = reference_image
    if capability in ("inpaint", "upscale_2x", "upscale_4x") and source_image_path:
        fields["image"] = source_image_path
    if capability == "inpaint" and mask_path:
        fields["mask"] = mask_path
    if source_asset_id:
        fields["source_asset_id"] = source_asset_id
    if isinstance(reference_asset_ids, list) and reference_asset_ids:
        fields["reference_asset_ids"] = reference_asset_ids

    person_context = parse_json_or_text(request.get("personContextJson"))
    if capability == "person_consistency" and person_context is not None:
        fields["person_context"] = person_context

    scale = normalize_positive_int(request.get("scale"))
    if capability in ("upscale_2x", "upscale_4x") and scale:
        fields["scale"] = scale

    fallback_mode = clean_optional_text(request.get("fallbackMode"))
    if fallback_mode:
        fields["fallback_mode"] = fallback_mode

    return fields


class ProviderAdapter:
    adapter_id = "base"
    capabilities = frozenset()

    def __init__(self, provider, timeout, adapter_id=None):
        self.provider = provider or {}
        self.adapter_id = adapter_id or self.adapter_id
        explicit_capabilities = normalize_capability_override(self.provider.get("capabilities"))
        self.capabilities = explicit_capabilities or resolve_adapter_capabilities(
            self.adapter_id,
            self.capabilities,
        )
        self.base_url = normalize_base_url(self.provider.get("baseUrl"))
        self.model = str(self.provider.get("model") or "").strip()
        self.timeout = max(float(timeout or 3), 3)

    def ensure_base_url(self):
        if not self.base_url:
            raise ValueError("provider.baseUrl is required")

    def ensure_base_model(self):
        self.ensure_base_url()
        if not self.model:
            raise ValueError("provider.model is required")

    def ensure_capability(self, capability):
        if capability not in self.capabilities:
            raise ProviderCapabilityError(
                "provider adapter {0} does not support {1}".format(self.adapter_id, capability)
            )

    def supports_capability(self, capability):
        return capability in self.capabilities

    def metadata(self):
        return {
            "adapterId": self.adapter_id,
            "baseUrl": self.base_url,
            "capabilities": sorted(self.capabilities),
        }


class OpenAICompatibleAdapter(ProviderAdapter):
    adapter_id = "openai-compatible"
    capabilities = frozenset({"models", "chat", "image", "txt2img", "audio", "video"})

    def _headers(self):
        headers = {"Content-Type": "application/json"}
        api_key = str(self.provider.get("apiKey") or "")
        if api_key:
            headers["Authorization"] = "Bearer " + api_key
        return headers

    def _chat_url(self):
        if self.base_url.endswith("/chat/completions"):
            return self.base_url
        return self.base_url + "/chat/completions"

    def _models_url(self):
        if self.base_url.endswith("/models"):
            return self.base_url
        return self.base_url + "/models"

    def _images_url(self):
        if self.base_url.endswith("/images/generations"):
            return self.base_url
        return self.base_url + "/images/generations"

    def _audio_speech_url(self):
        if self.base_url.endswith("/audio/speech"):
            return self.base_url
        return self.base_url + "/audio/speech"

    def _videos_url(self):
        if self.base_url.endswith("/videos"):
            return self.base_url
        return self.base_url + "/videos"

    def _video_url(self, video_id):
        root = self.base_url[:-7] if self.base_url.endswith("/videos") else self.base_url
        return root + "/videos/" + urllib.parse.quote(str(video_id), safe="")

    def _video_content_url(self, video_id):
        return self._video_url(video_id) + "/content"

    def list_models(self, max_models=200, max_model_id_chars=256, max_response_bytes=DEFAULT_MAX_RESPONSE_BYTES):
        self.ensure_base_url()
        self.ensure_capability("models")
        status, parsed = request_json(
            self._models_url(),
            "GET",
            self._headers(),
            None,
            self.timeout,
            max_bytes=max_response_bytes,
            retries=0,
        )
        return {
            **self.metadata(),
            "statusCode": status,
            "models": parse_openai_models(parsed, max_models, max_model_id_chars),
            "raw": parsed,
        }

    def chat(
        self,
        prompt,
        max_tokens=64,
        temperature=0,
        max_text_chars=None,
        max_response_bytes=DEFAULT_MAX_RESPONSE_BYTES,
        retries=1,
    ):
        self.ensure_base_model()
        self.ensure_capability("chat")
        body = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        status, parsed = request_json(
            self._chat_url(),
            "POST",
            self._headers(),
            body,
            self.timeout,
            max_bytes=max_response_bytes,
            retries=retries,
        )
        return {
            **self.metadata(),
            "statusCode": status,
            "model": self.model,
            "text": parse_openai_chat_text(parsed, max_text_chars),
            "raw": parsed,
        }

    def image(
        self,
        prompt,
        image_size,
        image_count=1,
        max_response_bytes=DEFAULT_MAX_RESPONSE_BYTES,
        image_request=None,
    ):
        self.ensure_base_model()
        self.ensure_capability("image")
        body = {
            "model": self.model,
            "prompt": prompt,
            "n": image_count,
            "size": image_size or "1024x1024",
        }
        body.update(openai_compatible_image_extension_fields(image_request))
        status, parsed = request_json(
            self._images_url(),
            "POST",
            self._headers(),
            body,
            self.timeout,
            max_bytes=max_response_bytes,
            retries=0,
        )
        return {
            **self.metadata(),
            "statusCode": status,
            "model": self.model,
            "raw": parsed,
        }

    def audio(
        self,
        prompt,
        output_dir,
        voice="alloy",
        response_format="mp3",
        instructions="",
        max_response_bytes=64 * 1024 * 1024,
    ):
        self.ensure_base_model()
        self.ensure_capability("audio")
        clean_format, fallback_ext = normalize_audio_response_format(response_format)
        body = {
            "model": self.model,
            "input": prompt,
            "voice": str(voice or "alloy").strip() or "alloy",
            "response_format": clean_format,
        }
        if instructions:
            body["instructions"] = instructions
        status, saved_file = request_binary_to_file(
            self._audio_speech_url(),
            "POST",
            self._headers(),
            body,
            self.timeout,
            output_dir,
            "ai-audio",
            fallback_ext,
            "audio/mpeg",
            max_response_bytes,
            allowed_prefixes=("audio/",),
            allowed_types={"application/octet-stream", "binary/octet-stream"},
        )
        return {
            **self.metadata(),
            "statusCode": status,
            "model": self.model,
            "savedFile": saved_file,
        }

    def video(
        self,
        prompt,
        output_dir,
        size="1280x720",
        duration_seconds=None,
        max_response_bytes=512 * 1024 * 1024,
        poll_interval_seconds=5,
    ):
        self.ensure_base_model()
        self.ensure_capability("video")
        body = {
            "model": self.model,
            "prompt": prompt,
        }
        if size:
            body["size"] = size
        if duration_seconds:
            body["seconds"] = duration_seconds

        create_status, created = request_json(
            self._videos_url(),
            "POST",
            self._headers(),
            body,
            min(self.timeout, 60),
            max_bytes=DEFAULT_MAX_RESPONSE_BYTES,
            retries=0,
        )
        video_id = created.get("id") if isinstance(created, dict) else ""
        if not video_id:
            raise RuntimeError("video generation did not return an id")

        deadline = time.time() + max(self.timeout, 60)
        current = created
        current_status = str(current.get("status") or "").lower()
        should_wait_before_poll = False
        while current_status in {"", "queued", "in_progress", "running", "processing"}:
            if time.time() >= deadline:
                raise TimeoutError("video generation polling timed out")
            if should_wait_before_poll:
                time.sleep(max(1, min(int(poll_interval_seconds or 5), 30)))
            should_wait_before_poll = True
            _, current = request_json(
                self._video_url(video_id),
                "GET",
                self._headers(),
                None,
                min(self.timeout, 60),
                max_bytes=DEFAULT_MAX_RESPONSE_BYTES,
                retries=0,
            )
            current_status = str(current.get("status") or "").lower()

        if current_status not in {"completed", "succeeded", "success", "ready"}:
            error = current.get("error") if isinstance(current, dict) else None
            raise RuntimeError("video generation failed: {0}".format(error or current_status or "unknown"))

        status, saved_file = request_binary_to_file(
            self._video_content_url(video_id),
            "GET",
            self._headers(),
            None,
            min(self.timeout, 120),
            output_dir,
            "ai-video",
            ".mp4",
            "video/mp4",
            max_response_bytes,
            allowed_prefixes=("video/",),
            allowed_types={"application/mp4", "application/octet-stream", "binary/octet-stream"},
        )
        return {
            **self.metadata(),
            "statusCode": status or create_status,
            "model": self.model,
            "savedFile": saved_file,
            "raw": current,
        }


from provider_anthropic_adapter import AnthropicMessagesAdapter


def create_provider_adapter(provider, timeout):
    provider = provider or {}
    provider_type = str(
        provider.get("providerType")
        or provider.get("provider")
        or ""
    ).strip().lower()
    adapter_id = str(provider.get("adapterId") or provider.get("adapter") or "").strip().lower()
    base_url = normalize_base_url(provider.get("baseUrl")).lower()

    for candidate_id in get_registry_adapters().keys():
        if base_url_matches_adapter(candidate_id, base_url):
            adapter_id = candidate_id
            break

    if not is_known_adapter(adapter_id) and provider_type in {"anthropic", "anthropic-native", "anthropic-messages"}:
        adapter_id = "anthropic-messages"

    if not is_known_adapter(adapter_id):
        adapter_id = get_default_adapter_id()

    if adapter_id == "anthropic-messages":
        return AnthropicMessagesAdapter(provider, timeout, adapter_id=adapter_id)
    return OpenAICompatibleAdapter(provider, timeout, adapter_id=adapter_id)
