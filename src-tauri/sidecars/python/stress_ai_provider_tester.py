import json
import subprocess
import sys
import tempfile
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

from test_ai_provider_tester import MockProviderHandler, PNG_BYTES, SCRIPT_PATH


def run_sidecar(base_url, action, output_dir, request_id, config_patch=None):
    config = {
        "provider": "custom",
        "displayName": "Mock Provider",
        "baseUrl": base_url,
        "apiKey": "",
        "rememberApiKey": False,
        "model": "chat-test",
        "testPrompt": "ping",
        "imageModel": "image-test",
        "imagePrompt": "blue robot",
        "imageSize": "1024x1024",
        "timeoutMs": 5000,
    }
    if config_patch:
        config.update(config_patch)
    payload = {
        "config": config,
        "action": action,
        "outputDir": str(output_dir or ""),
        "requestId": request_id,
    }
    completed = subprocess.run(
        [sys.executable, str(SCRIPT_PATH)],
        input=json.dumps(payload).encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=20,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.decode("utf-8", errors="ignore"))
    return json.loads(completed.stdout.decode("utf-8"))


def assert_image_saved(result):
    if not result.get("ok"):
        raise AssertionError(result)
    paths = result.get("imagePaths") or []
    saved_files = result.get("savedFiles") or []
    if len(paths) != 1 or len(saved_files) != 1:
        raise AssertionError(result)
    saved_path = Path(saved_files[0]["path"])
    if not saved_path.exists():
        raise AssertionError("saved image does not exist: {0}".format(saved_path))
    if saved_path.read_bytes() != PNG_BYTES:
        raise AssertionError("saved image bytes mismatch: {0}".format(saved_path))
    rendered = json.dumps(result, ensure_ascii=False)
    if "data:image" in rendered:
        raise AssertionError("inline base64 image leaked into sidecar output")


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), MockProviderHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = "http://127.0.0.1:{0}/v1".format(server.server_port)
    summary = []

    try:
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-stress-") as temp_dir:
            output_dir = Path(temp_dir)
            for index in range(3):
                models = run_sidecar(base_url, "models", output_dir, "stress-models-{0}".format(index))
                if not models.get("ok") or len(models.get("models") or []) != 2:
                    raise AssertionError(models)
                summary.append({"action": "models", "ok": True})

                chat = run_sidecar(base_url, "chat", output_dir, "stress-chat-{0}".format(index))
                if not chat.get("ok") or chat.get("text") != "pong":
                    raise AssertionError(chat)
                summary.append({"action": "chat", "ok": True})

                b64_image = run_sidecar(base_url, "image", output_dir, "stress-image-b64-{0}".format(index))
                assert_image_saved(b64_image)
                summary.append({"action": "image-b64", "ok": True})

                url_image = run_sidecar(
                    base_url,
                    "image",
                    output_dir,
                    "stress-image-url-{0}".format(index),
                    {"imagePrompt": "url image"},
                )
                assert_image_saved(url_image)
                summary.append({"action": "image-url", "ok": True})

            secret = run_sidecar(
                base_url,
                "chat",
                output_dir,
                "stress-secret-redaction",
                {"model": "secret-echo", "apiKey": "sk-test-secret"},
            )
            rendered = json.dumps(secret, ensure_ascii=False)
            if secret.get("ok") or "sk-test-secret" in rendered or "[已脱敏]" not in rendered:
                raise AssertionError(secret)
            summary.append({"action": "secret-redaction", "ok": True})
    finally:
        server.shutdown()
        server.server_close()

    print(json.dumps({"ok": True, "count": len(summary), "items": summary}, ensure_ascii=False))


if __name__ == "__main__":
    main()
