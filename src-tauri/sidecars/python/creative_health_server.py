import argparse
import json
import time
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
            task_payload = payload.get("payload") or {}
            prompt = build_image_prompt(task_payload)
            metadata = {
                "source": "creative_health_server_stub",
                "brief": task_payload.get("brief"),
                "style": task_payload.get("style"),
                "mood": task_payload.get("mood"),
                "aspectRatio": task_payload.get("aspectRatio"),
            }
            time.sleep(0.2)
            self._write_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "status": "completed",
                    "message": "generate_image_prompt workflow completed",
                    "asset": {
                        "assetType": "image_prompt",
                        "title": "Generated image prompt",
                        "content": prompt,
                        "metadataJson": json.dumps(metadata, ensure_ascii=False),
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


if __name__ == "__main__":
    main()
