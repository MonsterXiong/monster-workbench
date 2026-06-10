import base64
import importlib.util
import json
import os
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
        self.send_header("Content-Length", str(AI_PROVIDER_TESTER.MAX_IMAGE_RESPONSE_BYTES + 1))
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
            if body.get("model") == "claude-opus-4-5-20251101":
                self._write_json({"error": {"message": "当前 API 不支持所选模型 claude-opus-4-5-20251101"}}, status=404)
                return
            if body.get("model") == "anthropic/claude-opus-4.5":
                self._write_json({"choices": [{"message": {"content": "claude anyrouter ok"}}]})
                return
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
            if "unsupported size image" in prompt:
                self._write_json({"error": {"message": "unsupported image size"}}, status=400)
                return
            if "fallback size image" in prompt:
                self.close_connection = True
                return
            if "metadata url image" in prompt:
                self._write_json({
                    "data": [{
                        "url": "http://169.254.169.254/latest/meta-data/iam/security-credentials"
                    }]
                })
                return
            if "oversized b64 image" in prompt:
                byte_count = int(getattr(self.server, "oversized_b64_bytes", 33 * 1024 * 1024))
                self._write_json({
                    "data": [{
                        "b64_json": base64.b64encode(b"x" * byte_count).decode("ascii")
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

    def run_sidecar(self, action, output_dir=None, request_id="contract-test", config_patch=None, env_patch=None):
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
            env={**os.environ, **(env_patch or {})},
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

    def test_chat_contract_normalizes_anyrouter_anthropic_model_id(self):
        result = self.run_sidecar(
            "chat",
            request_id="chat-anyrouter-anthropic",
            config_patch={
                "provider": "anyrouter",
                "model": "claude-opus-4-5-20251101",
            },
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["requestId"], "chat-anyrouter-anthropic")
        self.assertEqual(result["model"], "anthropic/claude-opus-4.5")
        self.assertEqual(result["text"], "claude anyrouter ok")
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
            self.assertEqual(result["apiImageSize"], "1024x1024")
            self.assertEqual(result["requestedImageSize"], "1024x1024")
            self.assertEqual(result["actualImageSize"], "1x1")
            self.assertIsNone(result["fallbackImageSize"])
            self.assertEqual(result["imageAttempts"], 1)
            self.assertIsNone(result["failureKind"])

            saved_file = result["savedFiles"][0]
            saved_path = Path(saved_file["path"])
            self.assertTrue(saved_path.exists())
            self.assertEqual(saved_path.read_bytes(), PNG_BYTES)
            self.assertEqual(saved_file["path"], result["imagePaths"][0])
            self.assertEqual(saved_file["sizeBytes"], len(PNG_BYTES))
            self.assertEqual(saved_file["mimeType"], "image/png")
            self.assertEqual(saved_file["dimensions"], "1x1")

    def test_image_contract_does_not_fallback_size_after_disconnect(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-fallback-size-") as temp_dir:
            result = self.run_sidecar(
                "image",
                output_dir=temp_dir,
                request_id="image-fallback-size",
                config_patch={
                    "imagePrompt": "fallback size image",
                    "imageSize": "960x3840",
                },
            )
            self.assertFalse(result["ok"], result)
            self.assertEqual(result["requestId"], "image-fallback-size")
            self.assertEqual(result["apiImageSize"], "960x3840")
            self.assertEqual(result["requestedImageSize"], "960x3840")
            self.assertIsNone(result["actualImageSize"])
            self.assertIsNone(result["fallbackImageSize"])
            self.assertEqual(result["imageAttempts"], 1)
            self.assertEqual(result["failureKind"], "connection")
            self.assertFalse(result["imagePaths"])

    def test_unsupported_oversized_size_is_reported_without_prompt_only_fallback(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-oversized-prompt-only-") as temp_dir:
            result = self.run_sidecar(
                "image",
                output_dir=temp_dir,
                request_id="image-oversized-prompt-only",
                config_patch={
                    "imagePrompt": "unsupported size image",
                    "imageSize": "7680x960",
                },
            )

            self.assertFalse(result["ok"], result)
            self.assertEqual(result["requestId"], "image-oversized-prompt-only")
            self.assertEqual(result["apiImageSize"], "7680x960")
            self.assertEqual(result["requestedImageSize"], "7680x960")
            self.assertIsNone(result["actualImageSize"])
            self.assertIsNone(result["fallbackImageSize"])
            self.assertEqual(result["imageAttempts"], 1)
            self.assertEqual(result["failureKind"], "unsupported_size")
            self.assertFalse(result["imagePaths"])

    def test_tall_oversized_size_is_reported_without_prompt_only_fallback(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-tall-oversized-") as temp_dir:
            result = self.run_sidecar(
                "image",
                output_dir=temp_dir,
                request_id="image-tall-oversized-prompt-only",
                config_patch={
                    "imagePrompt": "unsupported size image",
                    "imageSize": "640x7680",
                },
            )

            self.assertFalse(result["ok"], result)
            self.assertEqual(result["requestId"], "image-tall-oversized-prompt-only")
            self.assertEqual(result["apiImageSize"], "640x7680")
            self.assertEqual(result["requestedImageSize"], "640x7680")
            self.assertIsNone(result["actualImageSize"])
            self.assertIsNone(result["fallbackImageSize"])
            self.assertEqual(result["imageAttempts"], 1)
            self.assertEqual(result["failureKind"], "unsupported_size")
            self.assertFalse(result["imagePaths"])

    def test_edge_sizes_are_reported_without_prompt_only_fallback(self):
        for image_size in [
            "7680x480",
            "480x7680",
            "7680x320",
            "320x7680",
            "7680x240",
            "240x7680",
            "7680x160",
            "160x7680",
        ]:
            with self.subTest(image_size=image_size):
                with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-edge-prompt-only-") as temp_dir:
                    result = self.run_sidecar(
                        "image",
                        output_dir=temp_dir,
                        request_id="image-edge-prompt-only",
                        config_patch={
                            "imagePrompt": "unsupported size image",
                            "imageSize": image_size,
                        },
                    )

                    self.assertFalse(result["ok"], result)
                    self.assertEqual(result["requestId"], "image-edge-prompt-only")
                    self.assertEqual(result["apiImageSize"], image_size)
                    self.assertEqual(result["requestedImageSize"], image_size)
                    self.assertIsNone(result["actualImageSize"])
                    self.assertIsNone(result["fallbackImageSize"])
                    self.assertEqual(result["imageAttempts"], 1)
                    self.assertEqual(result["failureKind"], "unsupported_size")
                    self.assertFalse(result["imagePaths"])

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
            self.server.oversized_b64_bytes = 2048
            try:
                result = self.run_sidecar(
                    "image",
                    output_dir=temp_dir,
                    request_id="image-oversized-b64",
                    config_patch={"imagePrompt": "oversized b64 image"},
                    env_patch={"AI_PROVIDER_MAX_DECODED_IMAGE_BYTES": "1024"},
                )
            finally:
                self.server.oversized_b64_bytes = 33 * 1024 * 1024
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
