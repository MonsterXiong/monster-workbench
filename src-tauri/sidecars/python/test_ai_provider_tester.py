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
AUDIO_BYTES = base64.b64decode("UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=")
VIDEO_BYTES = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom\x00\x00\x00\x08mdat"


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

    def _write_binary(self, payload, content_type):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

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
        if self.path == "/v1/videos/video-contract":
            self.server.last_video_status_path = self.path
            self._write_json({
                "id": "video-contract",
                "status": "completed",
                "download_url": "http://169.254.169.254/latest/meta-data/ignored.mp4",
            })
            return
        if self.path == "/v1/videos/video-contract/content":
            self.server.last_video_content_path = self.path
            self._write_binary(VIDEO_BYTES, "video/mp4")
            return
        if self.path == "/v1/videos/video-json-content":
            self.server.last_video_status_path = self.path
            self._write_json({
                "id": "video-json-content",
                "status": "completed",
            })
            return
        if self.path == "/v1/videos/video-json-content/content":
            self.server.last_video_content_path = self.path
            self._write_json({"error": {"message": "not a binary video response"}})
            return
        if self.path == "/v1/videos/video-mislabeled-content":
            self.server.last_video_status_path = self.path
            self._write_json({
                "id": "video-mislabeled-content",
                "status": "completed",
            })
            return
        if self.path == "/v1/videos/video-mislabeled-content/content":
            self.server.last_video_content_path = self.path
            self._write_binary(b'{"error":{"message":"not a real video"}}', "video/mp4")
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

        if self.path == "/v1/messages":
            if body.get("model") == "claude-test":
                if self.headers.get("x-api-key") != "sk-anthropic-test":
                    self._write_json({"error": {"message": "missing x-api-key"}}, status=401)
                    return
                if self.headers.get("anthropic-version") != "2023-06-01":
                    self._write_json({"error": {"message": "missing anthropic-version"}}, status=400)
                    return
                self._write_json({"content": [{"type": "text", "text": "anthropic messages ok"}]})
                return
            self._write_json({"error": {"message": "unknown anthropic model"}}, status=404)
            return

        if self.path == "/v1/chat/completions":
            self.server.last_chat_body = body
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

        if self.path == "/v1/audio/speech":
            self.server.last_audio_body = body
            if "json audio response" in str(body.get("input") or ""):
                self._write_json({"error": {"message": "not a binary audio response"}})
                return
            if "mislabeled audio response" in str(body.get("input") or ""):
                self._write_binary(b'{"error":{"message":"not a real audio"}}', "audio/mpeg")
                return
            self._write_binary(AUDIO_BYTES, "audio/wav")
            return

        if self.path == "/v1/videos":
            self.server.last_video_body = body
            if "json video response" in str(body.get("prompt") or ""):
                self._write_json({
                    "id": "video-json-content",
                    "status": "queued",
                })
                return
            if "mislabeled video response" in str(body.get("prompt") or ""):
                self._write_json({
                    "id": "video-mislabeled-content",
                    "status": "queued",
                })
                return
            self._write_json({
                "id": "video-contract",
                "status": "queued",
                "download_url": "http://169.254.169.254/latest/meta-data/ignored.mp4",
            })
            return

        if self.path == "/v1/images/generations":
            self.server.last_image_body = body
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

    def run_sidecar(
        self,
        action,
        output_dir=None,
        request_id="contract-test",
        config_patch=None,
        env_patch=None,
        generation=None,
    ):
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
        if generation is not None:
            payload["generation"] = generation
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

    def enhanced_registry_env(self, registry_path):
        registry = {
            "defaultAdapterId": "openai-compatible",
            "adapters": {
                "openai-compatible": {
                    "capabilities": [
                        "models",
                        "chat",
                        "image",
                        "txt2img",
                        "img2img",
                        "inpaint",
                        "person_consistency",
                        "upscale_2x",
                        "upscale_4x",
                        "audio",
                        "video",
                    ],
                },
                "anthropic-messages": {
                    "capabilities": ["chat"],
                    "baseUrlHostPatterns": ["api.anthropic.com"],
                },
            },
        }
        registry_path.write_text(json.dumps(registry), encoding="utf-8")
        return {"MONSTER_AI_PROVIDER_REGISTRY_PATH": str(registry_path)}

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

    def test_chat_generation_uses_generation_prompt_model_and_options(self):
        result = self.run_sidecar(
            "chat",
            request_id="chat-generation-options",
            config_patch={"model": "unused-chat-test"},
            generation={
                "prompt": "atomic chat prompt",
                "model": "chat-test",
                "options": {
                    "maxTokens": 123,
                    "temperature": 0.7,
                },
            },
        )

        self.assertTrue(result["ok"], result)
        self.assertEqual(result["requestId"], "chat-generation-options")
        self.assertEqual(result["model"], "chat-test")
        self.assertEqual(self.server.last_chat_body["model"], "chat-test")
        self.assertEqual(self.server.last_chat_body["messages"][0]["content"], "atomic chat prompt")
        self.assertEqual(self.server.last_chat_body["max_tokens"], 123)
        self.assertEqual(self.server.last_chat_body["temperature"], 0.7)

    def test_chat_contract_uses_anthropic_messages_adapter(self):
        result = self.run_sidecar(
            "chat",
            request_id="chat-anthropic-messages",
            config_patch={
                "provider": "anthropic",
                "apiKey": "sk-anthropic-test",
                "model": "claude-test",
            },
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["requestId"], "chat-anthropic-messages")
        self.assertEqual(result["model"], "claude-test")
        self.assertEqual(result["text"], "anthropic messages ok")
        self.assertEqual(result["statusCode"], 200)

    def test_chat_contract_uses_third_party_anthropic_adapter_id(self):
        result = self.run_sidecar(
            "chat",
            request_id="chat-third-party-anthropic-messages",
            config_patch={
                "provider": "custom",
                "adapterId": "anthropic-messages",
                "apiKey": "sk-anthropic-test",
                "model": "claude-test",
            },
        )
        self.assertTrue(result["ok"], result)
        self.assertEqual(result["requestId"], "chat-third-party-anthropic-messages")
        self.assertEqual(result["model"], "claude-test")
        self.assertEqual(result["text"], "anthropic messages ok")
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

    def test_audio_generation_saves_artifact_and_uses_generation_options(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-audio-") as temp_dir:
            result = self.run_sidecar(
                "audio",
                output_dir=temp_dir,
                request_id="audio-generation-contract",
                config_patch={"model": "unused-audio-model"},
                generation={
                    "prompt": "speak this line",
                    "model": "tts-test",
                    "options": {
                        "voice": "nova",
                        "format": "wav",
                    },
                },
            )

            self.assertTrue(result["ok"], result)
            self.assertEqual(result["requestId"], "audio-generation-contract")
            self.assertEqual(result["model"], "tts-test")
            self.assertEqual(result["statusCode"], 200)
            self.assertEqual(self.server.last_audio_body["model"], "tts-test")
            self.assertEqual(self.server.last_audio_body["input"], "speak this line")
            self.assertEqual(self.server.last_audio_body["voice"], "nova")
            self.assertEqual(self.server.last_audio_body["response_format"], "wav")

            artifact = result["artifacts"][0]
            saved_path = Path(artifact["path"])
            self.assertTrue(saved_path.exists())
            self.assertEqual(saved_path.read_bytes(), AUDIO_BYTES)
            self.assertEqual(artifact["kind"], "audio")
            self.assertEqual(artifact["mimeType"], "audio/wav")
            self.assertEqual(artifact["sizeBytes"], len(AUDIO_BYTES))

    def test_audio_generation_rejects_untrusted_format_names(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-audio-format-") as temp_dir:
            result = self.run_sidecar(
                "audio",
                output_dir=temp_dir,
                request_id="audio-generation-format",
                generation={
                    "prompt": "speak safely",
                    "model": "tts-test",
                    "options": {
                        "voice": "alloy",
                        "format": "../not-a-real-format",
                    },
                },
            )

            self.assertTrue(result["ok"], result)
            self.assertEqual(self.server.last_audio_body["response_format"], "mp3")
            artifact = result["artifacts"][0]
            saved_path = Path(artifact["path"])
            self.assertEqual(saved_path.parent, Path(temp_dir))
            self.assertTrue(saved_path.name.startswith("ai-audio-"))

    def test_audio_generation_rejects_json_media_response(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-audio-json-") as temp_dir:
            result = self.run_sidecar(
                "audio",
                output_dir=temp_dir,
                request_id="audio-json-media-response",
                generation={
                    "prompt": "json audio response",
                    "model": "tts-test",
                    "options": {
                        "voice": "alloy",
                        "format": "mp3",
                    },
                },
            )

            self.assertFalse(result["ok"], result)
            self.assertIn("unexpected media response content-type", result["message"])
            self.assertIsNone(result["artifacts"])
            self.assertFalse(any(Path(temp_dir).iterdir()))

    def test_audio_generation_rejects_mislabeled_json_media_body(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-audio-body-") as temp_dir:
            result = self.run_sidecar(
                "audio",
                output_dir=temp_dir,
                request_id="audio-json-media-body",
                generation={
                    "prompt": "mislabeled audio response",
                    "model": "tts-test",
                    "options": {
                        "voice": "alloy",
                        "format": "mp3",
                    },
                },
            )

            self.assertFalse(result["ok"], result)
            self.assertIn("unexpected media response body", result["message"])
            self.assertIsNone(result["artifacts"])
            self.assertFalse(any(Path(temp_dir).iterdir()))

    def test_video_generation_polls_and_downloads_same_provider_content(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-video-") as temp_dir:
            result = self.run_sidecar(
                "video",
                output_dir=temp_dir,
                request_id="video-generation-contract",
                config_patch={"model": "unused-video-model"},
                generation={
                    "prompt": "make a short clip",
                    "model": "sora-test",
                    "options": {
                        "size": "640x360",
                        "durationSeconds": 3,
                    },
                },
            )

            self.assertTrue(result["ok"], result)
            self.assertEqual(result["requestId"], "video-generation-contract")
            self.assertEqual(result["model"], "sora-test")
            self.assertEqual(result["statusCode"], 200)
            self.assertEqual(self.server.last_video_body["model"], "sora-test")
            self.assertEqual(self.server.last_video_body["prompt"], "make a short clip")
            self.assertEqual(self.server.last_video_body["size"], "640x360")
            self.assertEqual(self.server.last_video_body["seconds"], 3)
            self.assertEqual(self.server.last_video_status_path, "/v1/videos/video-contract")
            self.assertEqual(self.server.last_video_content_path, "/v1/videos/video-contract/content")

            artifact = result["artifacts"][0]
            saved_path = Path(artifact["path"])
            self.assertTrue(saved_path.exists())
            self.assertEqual(saved_path.read_bytes(), VIDEO_BYTES)
            self.assertEqual(artifact["kind"], "video")
            self.assertEqual(artifact["mimeType"], "video/mp4")
            self.assertEqual(artifact["sizeBytes"], len(VIDEO_BYTES))
            self.assertEqual(artifact["durationSeconds"], 3)

    def test_video_generation_rejects_json_media_response(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-video-json-") as temp_dir:
            result = self.run_sidecar(
                "video",
                output_dir=temp_dir,
                request_id="video-json-media-response",
                generation={
                    "prompt": "json video response",
                    "model": "sora-test",
                    "options": {
                        "size": "640x360",
                        "durationSeconds": 2,
                    },
                },
            )

            self.assertFalse(result["ok"], result)
            self.assertIn("unexpected media response content-type", result["message"])
            self.assertIsNone(result["artifacts"])
            self.assertFalse(any(Path(temp_dir).iterdir()))

    def test_video_generation_rejects_mislabeled_json_media_body(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-video-body-") as temp_dir:
            result = self.run_sidecar(
                "video",
                output_dir=temp_dir,
                request_id="video-json-media-body",
                generation={
                    "prompt": "mislabeled video response",
                    "model": "sora-test",
                    "options": {
                        "size": "640x360",
                        "durationSeconds": 2,
                    },
                },
            )

            self.assertFalse(result["ok"], result)
            self.assertIn("unexpected media response body", result["message"])
            self.assertIsNone(result["artifacts"])
            self.assertFalse(any(Path(temp_dir).iterdir()))

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

    def test_image_generation_native_inpaint_forwards_source_and_mask(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-native-inpaint-") as temp_dir:
            registry_path = Path(temp_dir) / "ai-provider-registry.json"
            result = self.run_sidecar(
                "image",
                output_dir=temp_dir,
                request_id="image-native-inpaint",
                env_patch=self.enhanced_registry_env(registry_path),
                generation={
                    "capability": "inpaint",
                    "prompt": "replace the sky",
                    "model": "image-test",
                    "options": {
                        "size": "1024x1024",
                        "count": 1,
                        "sourceAssetId": "asset-source",
                        "sourceImagePath": "C:/Monster/source.png",
                        "maskPath": "C:/Monster/mask.svg",
                        "fallbackMode": "native",
                    },
                },
            )

            self.assertTrue(result["ok"], result)
            self.assertEqual(self.server.last_image_body["model"], "image-test")
            self.assertEqual(self.server.last_image_body["prompt"], "replace the sky")
            self.assertEqual(self.server.last_image_body["generation_mode"], "inpaint")
            self.assertEqual(self.server.last_image_body["image"], "C:/Monster/source.png")
            self.assertEqual(self.server.last_image_body["mask"], "C:/Monster/mask.svg")
            self.assertEqual(self.server.last_image_body["source_asset_id"], "asset-source")
            self.assertEqual(self.server.last_image_body["fallback_mode"], "native")

    def test_image_generation_uses_model_config_capability_override(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-config-capability-") as temp_dir:
            result = self.run_sidecar(
                "image",
                output_dir=temp_dir,
                request_id="image-config-capability-inpaint",
                config_patch={
                    "capabilities": ["models", "chat", "image", "txt2img", "inpaint"],
                },
                generation={
                    "capability": "inpaint",
                    "prompt": "paint a new sign",
                    "model": "image-test",
                    "options": {
                        "size": "1024x1024",
                        "count": 1,
                        "sourceImagePath": "C:/Monster/source.png",
                        "maskPath": "C:/Monster/mask.svg",
                        "fallbackMode": "native",
                    },
                },
            )

            self.assertTrue(result["ok"], result)
            self.assertEqual(self.server.last_image_body["generation_mode"], "inpaint")
            self.assertEqual(self.server.last_image_body["image"], "C:/Monster/source.png")
            self.assertEqual(self.server.last_image_body["mask"], "C:/Monster/mask.svg")

    def test_image_generation_prompt_fallback_does_not_forward_native_paths(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-fallback-inpaint-") as temp_dir:
            result = self.run_sidecar(
                "image",
                output_dir=temp_dir,
                request_id="image-fallback-inpaint",
                generation={
                    "capability": "inpaint",
                    "prompt": "prompt fallback inpaint",
                    "model": "image-test",
                    "options": {
                        "size": "1024x1024",
                        "count": 1,
                        "sourceImagePath": "C:/Monster/source.png",
                        "maskPath": "C:/Monster/mask.svg",
                        "fallbackMode": "txt2img_prompt_fallback",
                    },
                },
            )

            self.assertTrue(result["ok"], result)
            self.assertEqual(self.server.last_image_body["prompt"], "prompt fallback inpaint")
            self.assertNotIn("generation_mode", self.server.last_image_body)
            self.assertNotIn("image", self.server.last_image_body)
            self.assertNotIn("mask", self.server.last_image_body)

    def test_image_generation_upscale_requires_native_capability(self):
        with tempfile.TemporaryDirectory(prefix="monster-ai-sidecar-upscale-required-") as temp_dir:
            self.server.last_image_body = None
            result = self.run_sidecar(
                "image",
                output_dir=temp_dir,
                request_id="image-upscale-native-required",
                generation={
                    "capability": "upscale_2x",
                    "prompt": "upscale source",
                    "model": "image-test",
                    "options": {
                        "size": "1024x1024",
                        "count": 1,
                        "sourceImagePath": "C:/Monster/source.png",
                        "scale": 2,
                        "fallbackMode": "txt2img_prompt_fallback",
                    },
                },
            )

            self.assertFalse(result["ok"], result)
            self.assertIn("does not support upscale_2x", result["message"])
            self.assertIsNone(self.server.last_image_body)

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
