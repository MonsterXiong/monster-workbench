from dataclasses import dataclass

from provider_adapters import normalize_base_url


@dataclass
class ProviderRequestContext:
    started: float
    payload: dict
    config: dict
    action: str
    output_dir: str
    request_id: str
    generation: dict
    generation_options: dict
    provider: str
    base_url: str
    model: str
    prompt: str
    generation_model: str
    image_model: str
    image_prompt: str
    image_size: str
    timeout_ms: int
    timeout: float


def parse_provider_request(payload, started):
    payload = payload or {}
    config = payload.get("config") or {}
    action = payload.get("action") or "chat"
    generation = payload.get("generation") or {}
    generation_options = generation.get("options") or {}

    model = str(config.get("model") or "").strip()
    prompt = generation.get("prompt") or config.get("testPrompt") or "ping"
    generation_model = str(generation.get("model") or model).strip()
    image_model = str(config.get("imageModel") or model).strip()
    timeout_ms = int(config.get("timeoutMs") or 20000)

    return ProviderRequestContext(
        started=started,
        payload=payload,
        config=config,
        action=action,
        output_dir=payload.get("outputDir") or "",
        request_id=payload.get("requestId") or "",
        generation=generation,
        generation_options=generation_options,
        provider=config.get("provider") or "custom",
        base_url=normalize_base_url(config.get("baseUrl") or ""),
        model=model,
        prompt=prompt,
        generation_model=generation_model,
        image_model=image_model,
        image_prompt=config.get("imagePrompt") or prompt,
        image_size=config.get("imageSize") or "1024x1024",
        timeout_ms=timeout_ms,
        timeout=max(timeout_ms / 1000, 3),
    )
