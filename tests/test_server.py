"""
AirOS Server REST API and Engine Integration Test
"""
import unittest
from fastapi.testclient import TestClient
from ui.server import app
from core.airos_engine import airos_engine


class TestAirOSServer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_status_endpoint(self):
        response = self.client.get("/api/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "online")
        self.assertIn("mode", data)
        self.assertIn("fps", data)

    def test_mode_switch_endpoint(self):
        for mode in ["CURSOR", "MEDIA", "PRESENTATION", "BROWSER", "CUSTOM", "TRAINING"]:
            resp = self.client.post("/api/mode", json={"mode": mode})
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json().get("active_mode"), mode)

    def test_config_endpoint(self):
        resp = self.client.get("/api/config")
        self.assertEqual(resp.status_code, 200)
        cfg = resp.json()
        self.assertIn("camera", cfg)
        self.assertIn("mouse", cfg)
        self.assertIn("recognition", cfg)

    def test_custom_gestures_endpoint(self):
        resp = self.client.get("/api/custom-gestures")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("gestures", data)
        self.assertIsInstance(data["gestures"], list)

    def test_training_dataset_endpoint(self):
        resp = self.client.get("/api/training/dataset")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("classes", data)
        self.assertIn("is_trained", data)


if __name__ == "__main__":
    unittest.main()
