import json
import os
import urllib.request


DEFAULT_MAX_RESPONSE_BYTES = 4 * 1024 * 1024
DEFAULT_ANTHROPIC_VERSION = "2023-06-01"
PROVIDER_REGISTRY_FILE_NAME = "ai-provider-registry.json"
FALLBACK_PROVIDER_REGISTRY = {
    "defaultAdapterId": "openai-compatible",
    "adapters": {
        "openai-compatible": {
            "capabilities": ["models", "chat", "image"],
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


def parse_anthropic_chat_text(payload, max_text_chars=None):
    content = payload.get("content")
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(str(item.get("text") or ""))
        text = "".join(parts)
    else:
        text = str(payload.get("text") or payload.get("completion") or "")
    return trim_text(text, max_text_chars) if max_text_chars else text


class ProviderAdapter:
    adapter_id = "base"
    capabilities = frozenset()

    def __init__(self, provider, timeout, adapter_id=None):
        self.provider = provider or {}
        self.adapter_id = adapter_id or self.adapter_id
        self.capabilities = resolve_adapter_capabilities(self.adapter_id, self.capabilities)
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

    def metadata(self):
        return {
            "adapterId": self.adapter_id,
            "baseUrl": self.base_url,
            "capabilities": sorted(self.capabilities),
        }


class OpenAICompatibleAdapter(ProviderAdapter):
    adapter_id = "openai-compatible"
    capabilities = frozenset({"models", "chat", "image"})

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

    def image(self, prompt, image_size, image_count=1, max_response_bytes=DEFAULT_MAX_RESPONSE_BYTES):
        self.ensure_base_model()
        self.ensure_capability("image")
        body = {
            "model": self.model,
            "prompt": prompt,
            "n": image_count,
            "size": image_size or "1024x1024",
        }
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


class AnthropicMessagesAdapter(ProviderAdapter):
    adapter_id = "anthropic-messages"
    capabilities = frozenset({"chat"})

    def _headers(self):
        headers = {
            "Content-Type": "application/json",
            "anthropic-version": str(self.provider.get("anthropicVersion") or DEFAULT_ANTHROPIC_VERSION),
        }
        api_key = str(self.provider.get("apiKey") or "")
        if api_key:
            headers["x-api-key"] = api_key
        return headers

    def _messages_url(self):
        if self.base_url.endswith("/messages"):
            return self.base_url
        if self.base_url.endswith("/v1"):
            return self.base_url + "/messages"
        return self.base_url + "/v1/messages"

    def list_models(self, *_, **__):
        self.ensure_capability("models")

    def chat(
        self,
        prompt,
        max_tokens=512,
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
            self._messages_url(),
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
            "text": parse_anthropic_chat_text(parsed, max_text_chars),
            "raw": parsed,
        }

    def image(self, *_, **__):
        self.ensure_capability("image")


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
