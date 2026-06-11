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
