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


if __name__ == "__main__":
    unittest.main()
