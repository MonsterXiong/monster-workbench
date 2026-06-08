import base64
import importlib.util
import json
import subprocess
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


SCRIPT_PATH = Path(__file__).with_name("ai_provider_tester.py")
SPEC = importlib.util.spec_from_file_location("ai_provider_tester", SCRIPT_PATH)
AI_PROVIDER_TESTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AI_PROVIDER_TESTER)
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP8z8AARQAFAgH/"
    "qk9lAAAAAElFTkSuQmCC"
)


class MockProviderHandler(BaseHTTPRequestHandler):
    def _write_json(self, payload, status=200):
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _write_png(self):
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(PNG_BYTES)))
        self.end_headers()
        self.wfile.write(PNG_BYTES)

    def _write_too_large_image_headers(self):
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(64 * 1024 * 1024 + 1))
        self.end_headers()

    def do_GET(self):
        if self.path == "/v1/models":
            if getattr(self.server, "large_models", False):
                self._write_json({"data": [{"id": "model-{0}".format(index)} for index in range(260)]})
                return
            if getattr(self.server, "long_model_id", False):
                self._write_json({"data": [{"id": "model-" + "x" * 400}]})
                return
            self._write_json({"data": [{"id": "chat-test"}, {"id": "image-test"}]})
            return
        if self.path == "/assets/image.png":
            self._write_png()
            return
        if self.path == "/assets/too-large.png":
            self._write_too_large_image_headers()
            return
        self._write_json({"error": "not found"}, status=404)

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", "0") or "0")
        body = {}
        if content_length:
            body = json.loads(self.rfile.read(content_length).decode("utf-8") or "{}")

        if self.path == "/v1/chat/completions":
            if body.get("model") == "secret-echo":
                self._write_json({
                    "error": "Authorization Bearer sk-test-secret should not be visible",
                    "apiKey": "sk-test-secret",
                }, status=401)
                return
            if body.get("model") == "large-text":
                self._write_json({"choices": [{"message": {"content": "大" * 9000}}]})
                return
            self._write_json({"choices": [{"message": {"content": "pong"}}]})
            return

        if self.path == "/v1/images/generations":
            prompt = str(body.get("prompt") or "")
            if "metadata url image" in prompt:
                self._write_json({
                    "data": [{
                        "url": "http://169.254.169.254/latest/meta-data/iam/security-credentials"
                    }]
                })
                return
            if "oversized b64 image" in prompt:
                self._write_json({
                    "data": [{
                        "b64_json": base64.b64encode(b"x" * (33 * 1024 * 1024)).decode("ascii")
                    }]
                })
                return
            if "large url image" in prompt:
                self._write_json({
                    "data": [{
                        "url": "http://127.0.0.1:{0}/assets/too-large.png".format(self.server.server_port)
                    }]
                })
                return
            if "long url image" in prompt:
                self._write_json({
                    "data": [{
                        "url": "http://127.0.0.1:{0}/assets/image.png?token={1}".format(
                            self.server.server_port,
                            "x" * 3000,
                        )
                    }]
                })
                return
            if "url image" in prompt:
                self._write_json({
                    "data": [{
                        "url": "http://127.0.0.1:{0}/assets/image.png".format(self.server.server_port)
                    }]
                })
                return
            self._write_json({"data": [{"b64_json": base64.b64encode(PNG_BYTES).decode("ascii")}]})
            return

        self._write_json({"error": "not found"}, status=404)

    def log_message(self, _format, *_args):
        return


class AiProviderTesterContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), MockProviderHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = "http://127.0.0.1:{0}/v1".format(cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def run_sidecar(self, action, output_dir=None, request_id="contract-test", config_patch=None):
        config = {
            "provider": "custom",
            "displayName": "Mock Provider",
            "baseUrl": self.base_url,
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
            timeout=15,
            check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr.decode("utf-8", errors="ignore"))
        return json.loads(completed.stdout.decode("utf-8"))

    def test_models_contract(self):
        result = self.run_sidecar("models", request_id="models-contract")
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["requestId"], "models-contract")
        self.assertEqual(result["models"], ["chat-test", "image-test"])
        self.assertEqual(result["statusCode"], 200)

    def test_models_contract_limits_large_model_list(self):
        self.server.large_models = True
        try:
            result = self.run_sidecar("models", request_id="models-large-list")
        finally:
            self.server.large_models = False

        self.assertTrue(result["ok"], result)
        self.assertEqual(result["requestId"], "models-large-list")
        self.assertEqual(len(result["models"]), 200)
        self.assertEqual(result["models"][0], "model-0")
        self.assertEqual(result["models"][-1], "model-199")

    def test_models_contract_truncates_long_model_id(self):
        self.server.long_model_id = True
        try:
            result = self.run_sidecar("models", request_id="models-long-id")
        finally:
            self.server.long_model_id = False

        self.assertTrue(result["ok"], result)
        self.assertEqual(result["requestId"], "models-long-id")
        self.assertEqual(len(result["models"]), 1)
        self.assertLessEqual(len(result["models"][0]), 256)
        self.assertIn("[已截断]", result["models"][0])

    def test_chat_contract(self):
        result = self.run_sidecar("chat", request_id="chat-contract")
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["requestId"], "chat-contract")
        self.assertEqual(result["text"], "pong")
        self.assertEqual(result["statusCode"], 200)

    def test_chat_contract_truncates_large_text(self):
        result = self.run_sidecar(
            "chat",
            request_id="chat-large-text",
            config_patch={"model": "large-text"},
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["requestId"], "chat-large-text")
        self.assertLess(len(result["text"]), 8300)
        self.assertIn("[内容过长，已截断]", result["text"])

    def test_non_image_actions_ignore_broken_output_dir(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-broken-dir-") as temp_dir:
            broken_path = Path(temp_dir) / "blocked-output"
            broken_path.write_text("not-a-directory", encoding="utf-8")

            models_result = self.run_sidecar("models", output_dir=broken_path, request_id="models-broken-dir")
            self.assertTrue(models_result["ok"], models_result)
            self.assertEqual(models_result["models"], ["chat-test", "image-test"])

            chat_result = self.run_sidecar("chat", output_dir=broken_path, request_id="chat-broken-dir")
            self.assertTrue(chat_result["ok"], chat_result)
            self.assertEqual(chat_result["text"], "pong")

    def test_image_contract_saves_local_file_metadata(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-") as temp_dir:
            result = self.run_sidecar("image", output_dir=temp_dir, request_id="image-contract")
            self.assertTrue(result["ok"], result)
            self.assertEqual(result["requestId"], "image-contract")
            self.assertEqual(result["statusCode"], 200)
            self.assertEqual(len(result["imagePaths"]), 1)
            self.assertEqual(len(result["savedFiles"]), 1)

            saved_file = result["savedFiles"][0]
            saved_path = Path(saved_file["path"])
            self.assertTrue(saved_path.exists())
            self.assertEqual(saved_path.read_bytes(), PNG_BYTES)
            self.assertEqual(saved_file["path"], result["imagePaths"][0])
            self.assertEqual(saved_file["sizeBytes"], len(PNG_BYTES))
            self.assertEqual(saved_file["mimeType"], "image/png")

    def test_image_contract_downloads_url_to_local_file(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-url-") as temp_dir:
            result = self.run_sidecar(
                "image",
                output_dir=temp_dir,
                request_id="image-url-contract",
                config_patch={"imagePrompt": "url image"},
            )
            self.assertTrue(result["ok"], result)
            self.assertEqual(result["requestId"], "image-url-contract")
            self.assertEqual(result["statusCode"], 200)
            self.assertEqual(result["imageUrls"], [])
            self.assertEqual(len(result["imagePaths"]), 1)
            self.assertEqual(len(result["savedFiles"]), 1)

            saved_file = result["savedFiles"][0]
            saved_path = Path(saved_file["path"])
            self.assertTrue(saved_path.exists())
            self.assertEqual(saved_path.read_bytes(), PNG_BYTES)
            self.assertEqual(saved_file["mimeType"], "image/png")

    def test_image_url_too_large_falls_back_to_provider_url(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-large-url-") as temp_dir:
            result = self.run_sidecar(
                "image",
                output_dir=temp_dir,
                request_id="image-large-url-fallback",
                config_patch={"imagePrompt": "large url image"},
            )
            self.assertTrue(result["ok"], result)
            self.assertEqual(result["requestId"], "image-large-url-fallback")
            self.assertEqual(result["statusCode"], 200)
            self.assertEqual(result["imagePaths"], [])
            self.assertEqual(result["savedFiles"], [])
            self.assertEqual(len(result["imageUrls"]), 1)
            self.assertTrue(result["imageUrls"][0].endswith("/assets/too-large.png"))

    def test_image_contract_skips_overlong_provider_url(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-long-url-") as temp_dir:
            result = self.run_sidecar(
                "image",
                output_dir=temp_dir,
                request_id="image-long-url",
                config_patch={"imagePrompt": "long url image"},
            )
            rendered = json.dumps(result, ensure_ascii=False)
            self.assertFalse(result["ok"], result)
            self.assertEqual(result["requestId"], "image-long-url")
            self.assertEqual(result["statusCode"], 200)
            self.assertEqual(result["imagePaths"], [])
            self.assertEqual(result["savedFiles"], [])
            self.assertEqual(result["imageUrls"], [])
            self.assertNotIn("x" * 3000, rendered)

    def test_image_contract_skips_restricted_provider_url_for_remote_base(self):
        self.assertFalse(AI_PROVIDER_TESTER.is_safe_image_url(
            "http://169.254.169.254/latest/meta-data/iam/security-credentials",
            "https://api.example.com/v1",
        ))
        self.assertFalse(AI_PROVIDER_TESTER.is_safe_image_url(
            "file:///C:/Windows/win.ini",
            "https://api.example.com/v1",
        ))
        self.assertTrue(AI_PROVIDER_TESTER.is_safe_image_url(
            "http://127.0.0.1:1420/assets/image.png",
            self.base_url,
        ))

    def test_image_contract_rejects_oversized_b64_decode(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-big-b64-") as temp_dir:
            result = self.run_sidecar(
                "image",
                output_dir=temp_dir,
                request_id="image-oversized-b64",
                config_patch={"imagePrompt": "oversized b64 image"},
            )
            self.assertFalse(result["ok"], result)
            self.assertEqual(result["requestId"], "image-oversized-b64")
            self.assertEqual(result["statusCode"], 200)
            self.assertEqual(result["imagePaths"], [])
            self.assertEqual(result["savedFiles"], [])
            self.assertEqual(result["imageUrls"], [])

    def test_image_contract_rejects_b64_inline_when_output_dir_is_invalid(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-inline-") as temp_dir:
            broken_path = Path(temp_dir) / "blocked-output"
            broken_path.write_text("not-a-directory", encoding="utf-8")

            result = self.run_sidecar("image", output_dir=broken_path, request_id="image-inline-fallback")
            self.assertFalse(result["ok"], result)
            self.assertEqual(result["requestId"], "image-inline-fallback")
            self.assertEqual(result["statusCode"], 200)
            self.assertEqual(result["imagePaths"], [])
            self.assertEqual(result["savedFiles"], [])
            self.assertEqual(result["imageUrls"], [])
            self.assertNotIn("data:image", json.dumps(result, ensure_ascii=False))

    def test_http_error_redacts_secret_echo(self):
        result = self.run_sidecar(
            "chat",
            request_id="secret-redaction",
            config_patch={"model": "secret-echo", "apiKey": "sk-test-secret"},
        )
        rendered = json.dumps(result, ensure_ascii=False)
        self.assertFalse(result["ok"], result)
        self.assertEqual(result["requestId"], "secret-redaction")
        self.assertEqual(result["statusCode"], 401)
        self.assertNotIn("sk-test-secret", rendered)
        self.assertIn("[已脱敏]", rendered)


if __name__ == "__main__":
    unittest.main()
