import argparse
import json
import time
import urllib.error
import urllib.request
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
        prompt_text, provider_metadata = request_provider_chat(provider, prompt_request)
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


def request_provider_chat(provider, prompt_request):
    base_url = str(provider.get("baseUrl") or "").rstrip("/")
    model = str(provider.get("model") or "").strip()
    if not base_url:
        raise ValueError("provider.baseUrl is required")
    if not model:
        raise ValueError("provider.model is required")

    timeout_ms = int(provider.get("timeoutMs") or 60000)
    timeout = max(timeout_ms / 1000, 3)
    body = {
        "model": model,
        "messages": [{"role": "user", "content": prompt_request}],
        "max_tokens": 512,
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
    }


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
    except (urllib.error.URLError, TimeoutError, ValueError):
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
