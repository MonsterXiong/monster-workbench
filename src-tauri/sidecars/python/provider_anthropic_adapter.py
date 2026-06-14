from provider_adapters import (
    DEFAULT_MAX_RESPONSE_BYTES,
    ProviderAdapter,
    request_json,
    trim_text,
)


DEFAULT_ANTHROPIC_VERSION = "2023-06-01"


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
