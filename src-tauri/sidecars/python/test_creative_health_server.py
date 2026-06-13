import importlib.util
import json
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path


SCRIPT_PATH = Path(__file__).with_name("creative_health_server.py")
SPEC = importlib.util.spec_from_file_location("creative_health_server", SCRIPT_PATH)
CREATIVE_HEALTH_SERVER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CREATIVE_HEALTH_SERVER)


class CreativeHealthServerEventsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.token = "creative-health-test-token"
        cls.server = ThreadingHTTPServer(
            ("127.0.0.1", 0),
            CREATIVE_HEALTH_SERVER.CreativeHealthHandler,
        )
        cls.server.access_token = cls.token
        cls.server.event_buffer = CREATIVE_HEALTH_SERVER.SidecarEventBuffer()
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = "http://127.0.0.1:{0}".format(cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def request_json(self, path, payload=None):
        data = None
        method = "GET"
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            method = "POST"
        request = urllib.request.Request(
            self.base_url + path,
            data=data,
            headers={
                "Content-Type": "application/json",
                "X-Monster-Token": self.token,
            },
            method=method,
        )
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8") or "{}")

    def test_events_endpoint_returns_buffered_workflow_events(self):
        task_result = self.request_json(
            "/tasks",
            {
                "protocolVersion": 1,
                "taskId": 77,
                "taskType": "generate_image_prompt",
                "workflowType": "image_prompt",
                "input": {"brief": "a precise architecture diagram"},
            },
        )
        self.assertEqual(task_result["status"], "succeeded")
        self.assertEqual(task_result["events"][0]["eventType"], "workflow_step_completed")

        events_result = self.request_json("/events?after=0&limit=10")
        self.assertTrue(events_result["ok"])
        self.assertTrue(events_result["runtimeInstanceId"])
        self.assertTrue(events_result["runtimeStartedAt"].endswith("Z"))
        self.assertEqual(events_result["nextCursor"], 1)
        self.assertEqual(len(events_result["events"]), 1)
        event = events_result["events"][0]
        self.assertEqual(event["id"], 1)
        self.assertEqual(event["runtimeInstanceId"], events_result["runtimeInstanceId"])
        self.assertEqual(event["runtimeStartedAt"], events_result["runtimeStartedAt"])
        self.assertEqual(event["taskId"], 77)
        self.assertEqual(event["workflowType"], "image_prompt")
        self.assertEqual(event["eventType"], "workflow_step_completed")
        self.assertEqual(event["payload"]["workflowType"], "image_prompt")
        self.assertTrue(event["createdAt"].endswith("Z"))

        empty_result = self.request_json("/events?after=1&limit=10")
        self.assertTrue(empty_result["ok"])
        self.assertEqual(empty_result["runtimeInstanceId"], events_result["runtimeInstanceId"])
        self.assertEqual(empty_result["runtimeStartedAt"], events_result["runtimeStartedAt"])
        self.assertEqual(empty_result["nextCursor"], 1)
        self.assertEqual(empty_result["events"], [])

    def test_batch_prompt_builder_expands_template_inside_sidecar(self):
        payload = {
            "protocolVersion": 1,
            "taskId": 88,
            "taskType": "image.generate.batch",
            "workflowType": "image.generate.batch",
            "input": {
                "promptTemplate": "Render frame {{sequenceNo}} / {{index}}",
                "imageSize": "1024x1024",
            },
            "context": {
                "batchJobId": 7,
                "sequenceNo": 3,
            },
        }

        prompt_request = CREATIVE_HEALTH_SERVER.build_batch_prompt_request(payload)
        self.assertEqual(prompt_request, "Render frame 3 / 3")
        self.assertEqual(
            CREATIVE_HEALTH_SERVER.simple_prompt_hash(prompt_request),
            "193c8ba56dc67cff",
        )

        result = CREATIVE_HEALTH_SERVER.build_batch_image_result(
            payload,
            "failed",
            None,
            "provider failed",
            duration_ms=12,
            prompt_request=prompt_request,
        )
        self.assertEqual(result["modelRuns"][0]["promptHash"], "193c8ba56dc67cff")
        self.assertEqual(
            result["modelRuns"][0]["metadata"]["promptRequest"],
            "Render frame 3 / 3",
        )
        self.assertEqual(
            result["modelRuns"][0]["metadata"]["promptTemplate"],
            "Render frame {{sequenceNo}} / {{index}}",
        )

    def test_parse_worker_task_types_falls_back_to_default_list(self):
        self.assertEqual(
            CREATIVE_HEALTH_SERVER.parse_worker_task_types(None),
            ["image.prompt.batch", "image.generate.batch"],
        )
        self.assertEqual(
            CREATIVE_HEALTH_SERVER.parse_worker_task_types(" , "),
            ["image.prompt.batch", "image.generate.batch"],
        )
        self.assertEqual(
            CREATIVE_HEALTH_SERVER.parse_worker_task_types("image.prompt.batch, custom.task"),
            ["image.prompt.batch", "custom.task"],
        )

    def test_worker_loop_once_claims_prompt_task_and_completes_with_sidecar_result(self):
        class FakeWorkerClient:
            def __init__(self):
                self.claim_count = 0
                self.completed = []
                self.heartbeats = []
                self.checkpoints = []

            def claim(self, task_type, worker_id, runtime_instance_id, lease_duration_ms):
                self.claim_count += 1
                self.worker_id = worker_id
                self.runtime_instance_id = runtime_instance_id
                self.lease_duration_ms = lease_duration_ms
                if task_type != "image.prompt.batch" or self.claim_count > 1:
                    return None
                return {
                    "workerId": worker_id,
                    "runtimeInstanceId": runtime_instance_id,
                    "claimToken": "claim-a",
                    "leaseExpiresAt": "9999999999999",
                    "task": {
                        "id": 99,
                        "projectId": "project-a",
                        "batchJobId": 7,
                        "goalId": None,
                        "taskType": "image.prompt.batch",
                        "status": "running",
                        "priority": 0,
                        "payloadJson": json.dumps({
                            "batchJobId": 7,
                            "sequenceNo": 4,
                            "batchType": "image.prompt.batch",
                            "promptTemplate": "Render prompt {{sequenceNo}}",
                            "providerConfig": {
                                "provider": "openai-compatible",
                                "displayName": "stub-provider",
                                "baseUrl": "http://127.0.0.1:9",
                                "apiKey": "",
                                "model": "stub-model",
                                "timeoutMs": 1000,
                            },
                        }),
                        "resultJson": None,
                        "errorMessage": None,
                        "retryCount": 0,
                        "maxRetries": 1,
                        "parentTaskId": None,
                        "assetId": None,
                        "sequenceNo": 4,
                    },
                }

            def checkpoint(self, task_id, worker_id, runtime_instance_id, claim_token):
                self.checkpoints.append({
                    "taskId": task_id,
                    "workerId": worker_id,
                    "runtimeInstanceId": runtime_instance_id,
                    "claimToken": claim_token,
                })
                return False

            def heartbeat(self, *args):
                self.heartbeats.append(args)
                return {"ok": True}

            def complete(
                self,
                task_id,
                worker_id,
                runtime_instance_id,
                claim_token,
                status,
                sidecar_result,
                lease_duration_ms,
            ):
                self.completed.append({
                    "taskId": task_id,
                    "workerId": worker_id,
                    "runtimeInstanceId": runtime_instance_id,
                    "claimToken": claim_token,
                    "status": status,
                    "sidecarResult": sidecar_result,
                    "leaseDurationMs": lease_duration_ms,
                })
                return {"task": {"id": task_id, "status": status}}

        original_request_provider_chat = CREATIVE_HEALTH_SERVER.request_provider_chat

        def fake_request_provider_chat(provider, prompt_request, budget=None):
            return "Generated prompt: {0}".format(prompt_request), {
                "baseUrl": provider.get("baseUrl"),
                "statusCode": 200,
            }

        CREATIVE_HEALTH_SERVER.request_provider_chat = fake_request_provider_chat
        try:
            client = FakeWorkerClient()
            event_buffer = CREATIVE_HEALTH_SERVER.SidecarEventBuffer()
            processed = CREATIVE_HEALTH_SERVER.worker_loop_once(
                client,
                event_buffer,
                "worker-a",
                "runtime-a",
                ["image.prompt.batch"],
                lease_duration_ms=60000,
            )
        finally:
            CREATIVE_HEALTH_SERVER.request_provider_chat = original_request_provider_chat

        self.assertTrue(processed)
        self.assertEqual(len(client.completed), 1)
        complete = client.completed[0]
        self.assertEqual(complete["taskId"], 99)
        self.assertEqual(complete["workerId"], "worker-a")
        self.assertEqual(complete["runtimeInstanceId"], "runtime-a")
        self.assertEqual(complete["claimToken"], "claim-a")
        self.assertEqual(client.checkpoints, [
            {
                "taskId": 99,
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "claimToken": "claim-a",
            },
            {
                "taskId": 99,
                "workerId": "worker-a",
                "runtimeInstanceId": "runtime-a",
                "claimToken": "claim-a",
            },
        ])
        self.assertEqual(complete["status"], "succeeded")
        result = complete["sidecarResult"]
        self.assertEqual(result["taskId"], 99)
        self.assertEqual(result["status"], "succeeded")
        self.assertEqual(result["outputs"][0]["assetType"], "demo_image_prompt")
        self.assertIn("Render prompt 4", result["outputs"][0]["content"])
        self.assertEqual(result["outputs"][0]["filePath"], None)
        self.assertEqual(result["modelRuns"][0]["requestType"], "chat")
        self.assertEqual(event_buffer.list_after(0, 10)["events"][0]["taskId"], 99)

    def test_worker_task_payload_for_image_generate_uses_output_dir_and_image_provider(self):
        task = {
            "id": 100,
            "projectId": "project-a",
            "batchJobId": 8,
            "goalId": None,
            "taskType": "image.generate.batch",
            "retryCount": 1,
            "maxRetries": 3,
            "parentTaskId": None,
            "sequenceNo": 5,
            "payloadJson": json.dumps({
                "batchJobId": 8,
                "sequenceNo": 5,
                "batchType": "image.generate.batch",
                "promptTemplate": "Render image {{sequenceNo}}",
                "imageSize": "1536x1024",
                "outputDir": "C:/tmp/monster-generated",
                "providerConfig": {
                    "provider": "openai-compatible",
                    "displayName": "image-provider",
                    "baseUrl": "http://127.0.0.1:9",
                    "apiKey": "",
                    "model": "image-model",
                    "timeoutMs": 2000,
                },
            }),
        }

        payload = CREATIVE_HEALTH_SERVER.build_worker_task_payload(task)

        self.assertEqual(payload["taskType"], "image.generate.batch")
        self.assertEqual(payload["workflowType"], "image.generate.batch")
        self.assertEqual(payload["attempt"], 2)
        self.assertEqual(payload["provider"]["requestType"], "image")
        self.assertEqual(payload["input"]["imageSize"], "1536x1024")
        self.assertEqual(payload["input"]["outputDir"], "C:/tmp/monster-generated")
        self.assertEqual(payload["context"]["batchJobId"], 8)
        self.assertEqual(payload["context"]["sequenceNo"], 5)


if __name__ == "__main__":
    unittest.main()
