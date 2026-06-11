import argparse
import base64
import binascii
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--token", type=str, required=True)
    return parser.parse_args()


class CreativeHealthHandler(BaseHTTPRequestHandler):
    server_version = "CreativeHealthServer/0.1"

    def _authorized(self):
        return self.headers.get("X-Monster-Token") == self.server.access_token

    def _write_json(self, status_code, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _reject(self):
        self._write_json(HTTPStatus.UNAUTHORIZED, {"ok": False, "error": "unauthorized"})

    def do_GET(self):
        if not self._authorized():
            self._reject()
            return

        if self.path == "/health":
            self._write_json(HTTPStatus.OK, {"ok": True, "status": "ok"})
            return

        if self.path.startswith("/events"):
            self._write_json(HTTPStatus.OK, {"ok": True, "events": []})
            return

        self._write_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "not_found"})

    def do_POST(self):
        if not self._authorized():
            self._reject()
            return

        if self.path != "/tasks":
            self._write_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "not_found"})
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._write_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid_json"})
            return

        if payload.get("taskType") == "generate_image_prompt":
            task_payload = payload.get("input") or payload.get("payload") or {}
            if is_cancel_requested(payload):
                self._write_json(HTTPStatus.OK, build_forced_result(payload, "cancelled"))
                return

            forced_status = resolve_forced_status(task_payload)
            if forced_status:
                self._write_json(HTTPStatus.OK, build_forced_result(payload, forced_status))
                return

            prompt = build_image_prompt(task_payload)
            metadata = {
                "source": "python-workflow-stub",
                "workflowType": payload.get("workflowType") or "image_prompt",
                "brief": task_payload.get("brief"),
                "style": task_payload.get("style"),
                "mood": task_payload.get("mood"),
                "aspectRatio": task_payload.get("aspectRatio"),
            }
            time.sleep(0.2)
            if is_cancel_requested(payload):
                self._write_json(HTTPStatus.OK, build_forced_result(payload, "cancelled"))
                return

            self._write_json(
                HTTPStatus.OK,
                {
                    "protocolVersion": payload.get("protocolVersion") or 1,
                    "taskId": payload.get("taskId"),
                    "status": "succeeded",
                    "message": "generate_image_prompt workflow completed",
                    "outputs": [{
                        "assetType": "image_prompt",
                        "title": "Generated image prompt",
                        "content": prompt,
                        "filePath": None,
                        "thumbnailPath": None,
                        "metadata": metadata,
                    }],
                    "modelRuns": [{
                        "providerId": "creative-sidecar-stub",
                        "providerType": "python-sidecar",
                        "model": "creative_health_server_stub",
                        "requestType": "workflow",
                        "status": "succeeded",
                        "durationMs": 200,
                        "promptHash": None,
                        "promptVersionId": f"workflow:{payload.get('taskId')}:1",
                        "inputTokenCount": None,
                        "outputTokenCount": None,
                        "costEstimate": None,
                        "errorCode": None,
                        "errorMessage": None,
                        "metadata": {
                            "workflowType": payload.get("workflowType") or "image_prompt",
                            "stub": True,
                        },
                    }],
                    "events": [{
                        "eventType": "workflow_step_completed",
                        "message": "prompt built",
                        "payload": {"workflowType": payload.get("workflowType") or "image_prompt"},
                    }],
                    "retry": {
                        "shouldRetry": False,
                        "reason": None,
                    },
                },
            )
            return

        if payload.get("taskType") == "demo.image.prompt":
            self._write_json(HTTPStatus.OK, run_batch_image_prompt(payload))
            return

        if payload.get("taskType") == "demo.image.generate":
            self._write_json(HTTPStatus.OK, run_batch_image_generate(payload))
            return

        self._write_json(
            HTTPStatus.ACCEPTED,
            {"ok": True, "status": "accepted", "mode": "stub", "task": payload},
        )

    def log_message(self, format, *args):
        return


def main():
    args = parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), CreativeHealthHandler)
    server.access_token = args.token
    server.serve_forever()


def build_image_prompt(payload):
    brief = str(payload.get("brief") or "").strip()
    style = str(payload.get("style") or "cinematic illustration").strip()
    mood = str(payload.get("mood") or "focused and atmospheric").strip()
    aspect_ratio = str(payload.get("aspectRatio") or "16:9").strip()
    return (
        f"{brief}. "
        f"Style: {style}. "
        f"Mood: {mood}. "
        f"Aspect ratio: {aspect_ratio}. "
        "High detail, clear focal subject, production-ready image prompt."
    )


def run_batch_image_prompt(payload):
    if is_cancel_requested(payload):
        return build_batch_prompt_result(payload, "cancelled", None, "batch prompt cancelled")

    task_payload = payload.get("input") or {}
    prompt_request = str(task_payload.get("promptRequest") or "").strip()
    if not prompt_request:
        return build_batch_prompt_result(payload, "failed", None, "promptRequest is required")

    provider = payload.get("provider") or {}
    started = time.time()
    try:
        prompt_text, provider_metadata = request_provider_chat(
            provider,
            prompt_request,
            payload.get("budget") or {},
        )
    except Exception as error:
        duration_ms = int((time.time() - started) * 1000)
        return build_batch_prompt_result(
            payload,
            "failed",
            None,
            "batch prompt provider failed: {0}".format(error),
            duration_ms=duration_ms,
            provider_metadata={"error": str(error)},
        )

    duration_ms = int((time.time() - started) * 1000)
    if is_cancel_requested(payload):
        return build_batch_prompt_result(
            payload,
            "cancelled",
            None,
            "batch prompt cancelled after provider call",
            duration_ms=duration_ms,
            provider_metadata=provider_metadata,
        )

    return build_batch_prompt_result(
        payload,
        "succeeded",
        prompt_text,
        "batch prompt workflow completed",
        duration_ms=duration_ms,
        provider_metadata=provider_metadata,
    )


def run_batch_image_generate(payload):
    if is_cancel_requested(payload):
        return build_batch_image_result(payload, "cancelled", None, "batch image cancelled")

    task_payload = payload.get("input") or {}
    prompt_request = str(task_payload.get("promptRequest") or "").strip()
    image_size = str(task_payload.get("imageSize") or "1024x1024").strip()
    output_dir = str(task_payload.get("outputDir") or "").strip()
    if not prompt_request:
        return build_batch_image_result(payload, "failed", None, "promptRequest is required")
    if not output_dir:
        return build_batch_image_result(payload, "failed", None, "outputDir is required")

    provider = payload.get("provider") or {}
    started = time.time()
    try:
        image_result = request_provider_image(
            provider,
            prompt_request,
            image_size,
            output_dir,
            payload.get("budget") or {},
        )
    except Exception as error:
        duration_ms = int((time.time() - started) * 1000)
        return build_batch_image_result(
            payload,
            "failed",
            None,
            "batch image provider failed: {0}".format(error),
            duration_ms=duration_ms,
            provider_metadata={"error": str(error)},
        )

    duration_ms = int((time.time() - started) * 1000)
    if is_cancel_requested(payload):
        return build_batch_image_result(
            payload,
            "cancelled",
            image_result,
            "batch image cancelled after provider call",
            duration_ms=duration_ms,
            provider_metadata=image_result.get("metadata") or {},
        )

    return build_batch_image_result(
        payload,
        "succeeded",
        image_result,
        "batch image workflow completed",
        duration_ms=duration_ms,
        provider_metadata=image_result.get("metadata") or {},
    )


def request_provider_image(provider, prompt_request, image_size, output_dir, budget=None):
    base_url = str(provider.get("baseUrl") or "").rstrip("/")
    model = str(provider.get("model") or "").strip()
    if not base_url:
        raise ValueError("provider.baseUrl is required")
    if not model:
        raise ValueError("provider.model is required")

    timeout = resolve_provider_timeout(provider, budget)
    body = {
        "model": model,
        "prompt": prompt_request,
        "n": 1,
        "size": image_size or "1024x1024",
    }
    headers = {"Content-Type": "application/json"}
    api_key = str(provider.get("apiKey") or "")
    if api_key:
        headers["Authorization"] = "Bearer " + api_key

    request = urllib.request.Request(
        build_images_url(base_url),
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read().decode("utf-8")
        parsed = json.loads(raw or "{}")

    saved_files = parse_images(parsed, output_dir, timeout, base_url)
    if not saved_files:
        raise ValueError("provider returned no saved image")

    first_file = saved_files[0]
    return {
        "filePath": first_file.get("path"),
        "savedFiles": saved_files,
        "metadata": {
            "baseUrl": base_url,
            "statusCode": getattr(response, "status", None),
            "message": "provider image completed",
            "requestedImageSize": image_size,
            "actualImageSize": first_file.get("dimensions") or image_size,
            "imageAttempts": 1,
            "budget": budget or {},
        },
    }


def build_images_url(base_url):
    if base_url.endswith("/images/generations"):
        return base_url
    return base_url + "/images/generations"


def parse_images(payload, output_dir, timeout, provider_base_url):
    saved_files = []
    for item in (payload.get("data") or [])[:1]:
        if not isinstance(item, dict):
            continue
        if item.get("b64_json"):
            saved = save_base64_image(output_dir, item["b64_json"])
            if saved:
                saved_files.append(saved)
        elif item.get("url"):
            saved = download_image_to_file(
                output_dir,
                str(item["url"]),
                timeout,
                provider_base_url,
            )
            if saved:
                saved_files.append(saved)
    return saved_files


def save_base64_image(output_dir, value):
    b64_value = str(value)
    ext = ".png"
    if "," in b64_value and b64_value.startswith("data:"):
        header, b64_value = b64_value.split(",", 1)
        if "jpeg" in header or "jpg" in header:
            ext = ".jpg"
        elif "webp" in header:
            ext = ".webp"
    try:
        data = base64.b64decode(b64_value, validate=True)
    except binascii.Error as error:
        raise ValueError("invalid image base64: {0}".format(error))
    return save_bytes(output_dir, data, ext, mime_from_extension(ext))


def download_image_to_file(output_dir, url, timeout, provider_base_url):
    if not is_safe_image_url(url, provider_base_url):
        raise ValueError("unsafe image url")
    request = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(request, timeout=max(timeout, 3)) as response:
        data = response.read(25 * 1024 * 1024 + 1)
        if len(data) > 25 * 1024 * 1024:
            raise ValueError("image response is too large")
        content_type = response.headers.get("Content-Type", "")
    return save_bytes(output_dir, data, guess_extension(content_type), content_type or None)


def save_bytes(output_dir, data, ext, mime_type=None):
    os.makedirs(output_dir, exist_ok=True)
    target_path = os.path.join(output_dir, "sidecar-image-{0}{1}".format(uuid.uuid4().hex, ext))
    with open(target_path, "wb") as file:
        file.write(data)
    return {
        "path": target_path,
        "sizeBytes": len(data),
        "mimeType": mime_type or mime_from_extension(ext),
        "dimensions": image_dimensions_from_bytes(data) or None,
    }


def guess_extension(content_type, fallback=".png"):
    clean = (content_type or "").lower()
    if "jpeg" in clean or "jpg" in clean:
        return ".jpg"
    if "webp" in clean:
        return ".webp"
    if "gif" in clean:
        return ".gif"
    return fallback


def mime_from_extension(ext):
    clean = (ext or "").lower()
    if clean in (".jpg", ".jpeg"):
        return "image/jpeg"
    if clean == ".webp":
        return "image/webp"
    if clean == ".gif":
        return "image/gif"
    return "image/png"


def image_dimensions_from_bytes(data):
    if len(data) >= 24 and data.startswith(b"\x89PNG\r\n\x1a\n"):
        width = int.from_bytes(data[16:20], "big")
        height = int.from_bytes(data[20:24], "big")
        if width > 0 and height > 0:
            return "{0}x{1}".format(width, height)
    return ""


def is_safe_image_url(url, provider_base_url):
    parsed_url = urllib.parse.urlparse(url)
    parsed_provider = urllib.parse.urlparse(provider_base_url)
    if parsed_url.scheme not in {"http", "https"}:
        return False
    if parsed_url.hostname in {"127.0.0.1", "localhost"}:
        return parsed_provider.hostname in {"127.0.0.1", "localhost"}
    return parsed_url.scheme == "https"


def build_batch_image_result(
    payload,
    status,
    image_result,
    message,
    duration_ms=0,
    provider_metadata=None,
):
    provider = payload.get("provider") or {}
    context = payload.get("context") or {}
    task_payload = payload.get("input") or {}
    task_id = payload.get("taskId")
    batch_job_id = context.get("batchJobId")
    sequence_no = context.get("sequenceNo")
    retry = {
        "shouldRetry": status == "failed",
        "reason": message if status == "failed" else None,
    }
    outputs = []
    if status == "succeeded":
        outputs.append({
            "assetType": "demo_image",
            "title": "Batch image #{0}".format(sequence_no or task_id),
            "content": message,
            "filePath": image_result.get("filePath") if image_result else None,
            "thumbnailPath": None,
            "metadata": {
                "source": "python-sidecar",
                "workflowType": payload.get("workflowType") or "batch_image_generate",
                "batchJobId": batch_job_id,
                "sourceTaskId": task_id,
                "sequenceNo": sequence_no,
                "promptTemplate": task_payload.get("promptRequest"),
                "savedFiles": image_result.get("savedFiles") if image_result else [],
                "providerResult": provider_metadata or {},
            },
        })

    model_status = "succeeded" if status == "succeeded" else status
    if status == "retrying":
        model_status = "failed"
    return {
        "protocolVersion": payload.get("protocolVersion") or 1,
        "taskId": task_id,
        "status": status,
        "message": message,
        "outputs": outputs,
        "modelRuns": [{
            "providerId": provider.get("providerId") or provider.get("displayName"),
            "providerType": provider.get("providerType"),
            "model": provider.get("model"),
            "requestType": provider.get("requestType") or "image",
            "status": model_status,
            "durationMs": duration_ms,
            "promptHash": None,
            "promptVersionId": "batch:{0}:{1}".format(batch_job_id, task_id),
            "inputTokenCount": None,
            "outputTokenCount": None,
            "costEstimate": None,
            "errorCode": None if status == "succeeded" else "provider_error",
            "errorMessage": None if status == "succeeded" else message,
            "metadata": provider_metadata or {},
        }],
        "events": [{
            "eventType": "batch_image_workflow_completed" if status == "succeeded" else "batch_image_workflow_failed",
            "message": message,
            "payload": {
                "batchJobId": batch_job_id,
                "sequenceNo": sequence_no,
                "workflowType": payload.get("workflowType") or "batch_image_generate",
            },
        }],
        "retry": retry,
    }


def request_provider_chat(provider, prompt_request, budget=None):
    base_url = str(provider.get("baseUrl") or "").rstrip("/")
    model = str(provider.get("model") or "").strip()
    if not base_url:
        raise ValueError("provider.baseUrl is required")
    if not model:
        raise ValueError("provider.model is required")

    timeout = resolve_provider_timeout(provider, budget)
    body = {
        "model": model,
        "messages": [{"role": "user", "content": prompt_request}],
        "max_tokens": resolve_max_tokens(budget, 512),
        "temperature": 0,
    }
    headers = {"Content-Type": "application/json"}
    api_key = str(provider.get("apiKey") or "")
    if api_key:
        headers["Authorization"] = "Bearer " + api_key

    request = urllib.request.Request(
        build_chat_url(base_url),
        data=json.dumps(body).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read().decode("utf-8")
        parsed = json.loads(raw or "{}")

    prompt_text = parse_chat_text(parsed).strip()
    if not prompt_text:
        raise ValueError("provider returned empty prompt text")

    return prompt_text, {
        "baseUrl": base_url,
        "statusCode": getattr(response, "status", None),
        "message": "provider chat completed",
        "budget": budget or {},
    }


def resolve_provider_timeout(provider, budget=None):
    provider_timeout_ms = positive_int(provider.get("timeoutMs"), 60000)
    budget = budget or {}
    budget_ms = positive_int(budget.get("maxDurationMs"), provider_timeout_ms)
    if not budget.get("maxDurationMs") and budget.get("maxDurationSeconds"):
        budget_ms = positive_int(budget.get("maxDurationSeconds"), provider_timeout_ms // 1000) * 1000
    effective_ms = min(provider_timeout_ms, budget_ms) if budget_ms > 0 else provider_timeout_ms
    return max(effective_ms / 1000, 3)


def resolve_max_tokens(budget, default_value):
    budget = budget or {}
    return positive_int(budget.get("maxTokens"), default_value)


def positive_int(value, default_value):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default_value
    return parsed if parsed > 0 else default_value


def build_chat_url(base_url):
    if base_url.endswith("/chat/completions"):
        return base_url
    return base_url + "/chat/completions"


def parse_chat_text(payload):
    choices = payload.get("choices") or []
    if not choices:
        return ""
    first = choices[0] or {}
    message = first.get("message") or {}
    content = message.get("content")
    if isinstance(content, list):
        return "\n".join(
            str(item.get("text") or "")
            for item in content
            if isinstance(item, dict)
        )
    if content is None:
        content = first.get("text")
    return str(content or "")


def build_batch_prompt_result(
    payload,
    status,
    prompt_text,
    message,
    duration_ms=0,
    provider_metadata=None,
):
    provider = payload.get("provider") or {}
    context = payload.get("context") or {}
    task_id = payload.get("taskId")
    batch_job_id = context.get("batchJobId")
    sequence_no = context.get("sequenceNo")
    retry = {
        "shouldRetry": status == "failed",
        "reason": message if status == "failed" else None,
    }
    outputs = []
    if status == "succeeded":
        outputs.append({
            "assetType": "demo_image_prompt",
            "title": "Batch prompt #{0}".format(sequence_no or task_id),
            "content": prompt_text,
            "filePath": None,
            "thumbnailPath": None,
            "metadata": {
                "source": "python-sidecar",
                "workflowType": payload.get("workflowType") or "batch_image_prompt",
                "batchJobId": batch_job_id,
                "sourceTaskId": task_id,
                "sequenceNo": sequence_no,
                "promptTemplate": (payload.get("input") or {}).get("promptRequest"),
                "provenance": {
                    "sourceTaskId": task_id,
                    "batchJobId": batch_job_id,
                },
            },
        })

    model_status = "succeeded" if status == "succeeded" else status
    if status == "retrying":
        model_status = "failed"
    model_run = {
        "providerId": provider.get("providerId") or provider.get("displayName"),
        "providerType": provider.get("providerType"),
        "model": provider.get("model"),
        "requestType": provider.get("requestType") or "chat",
        "status": model_status,
        "durationMs": duration_ms,
        "promptHash": None,
        "promptVersionId": "batch:{0}:{1}".format(batch_job_id, task_id),
        "inputTokenCount": None,
        "outputTokenCount": None,
        "costEstimate": None,
        "errorCode": None if status == "succeeded" else "provider_error",
        "errorMessage": None if status == "succeeded" else message,
        "metadata": provider_metadata or {},
    }
    return {
        "protocolVersion": payload.get("protocolVersion") or 1,
        "taskId": task_id,
        "status": status,
        "message": message,
        "outputs": outputs,
        "modelRuns": [model_run],
        "events": [{
            "eventType": "batch_prompt_workflow_completed" if status == "succeeded" else "batch_prompt_workflow_failed",
            "message": message,
            "payload": {
                "batchJobId": batch_job_id,
                "sequenceNo": sequence_no,
                "workflowType": payload.get("workflowType") or "batch_image_prompt",
            },
        }],
        "retry": retry,
    }


def is_cancel_requested(payload):
    checkpoint = payload.get("cancelCheckpoint") or {}
    url = checkpoint.get("url")
    token = checkpoint.get("token")
    if not url or not token:
        return False
    request = urllib.request.Request(url, headers={"X-Monster-Token": token})
    try:
        with urllib.request.urlopen(request, timeout=1.0) as response:
            body = response.read().decode("utf-8")
    except Exception:
        return False
    try:
        result = json.loads(body or "{}")
    except json.JSONDecodeError:
        return False
    return bool(result.get("cancelRequested"))


def resolve_forced_status(payload):
    brief = str(payload.get("brief") or "").strip()
    prefix = "__sidecar_status:"
    if not brief.startswith(prefix):
        return None
    status = brief[len(prefix):].strip().split()[0]
    if status in {"failed", "cancelled", "retrying", "blocked"}:
        return status
    return None


def build_forced_result(payload, status):
    message = f"forced sidecar {status}"
    retry = {"shouldRetry": status == "retrying", "reason": message if status == "retrying" else None}
    return {
        "protocolVersion": payload.get("protocolVersion") or 1,
        "taskId": payload.get("taskId"),
        "status": status,
        "message": message,
        "outputs": [],
        "modelRuns": [{
            "providerId": "creative-sidecar-stub",
            "providerType": "python-sidecar",
            "model": "creative_health_server_stub",
            "requestType": "workflow",
            "status": "failed" if status in {"failed", "retrying"} else status,
            "durationMs": 10,
            "promptHash": None,
            "promptVersionId": f"workflow:{payload.get('taskId')}:forced",
            "inputTokenCount": None,
            "outputTokenCount": None,
            "costEstimate": None,
            "errorCode": f"forced_{status}",
            "errorMessage": message,
            "metadata": {
                "workflowType": payload.get("workflowType") or "image_prompt",
                "forcedStatus": status,
            },
        }],
        "events": [{
            "eventType": f"workflow_{status}",
            "message": message,
            "payload": {"forcedStatus": status},
        }],
        "retry": retry,
    }


if __name__ == "__main__":
    main()
