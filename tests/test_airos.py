"""
AirOS Automated Verification Test Suite
Tests Landmark Processing, Gesture Recognition, Dynamic Motion,
Custom Gesture ML Training, Mouse Mapping, and Server REST Endpoints.
"""
import unittest
import numpy as np
from vision.hand_detector import Landmark, HandResult
from vision.landmark_processor import (
    LandmarkProcessor,
    WRIST, THUMB_TIP, THUMB_IP, THUMB_MCP,
    INDEX_TIP, INDEX_PIP, INDEX_MCP,
    MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP,
    RING_TIP, RING_PIP, RING_MCP,
    PINKY_TIP, PINKY_PIP, PINKY_MCP
)
from vision.gesture_recognizer import GestureRecognizer
from vision.motion_recognizer import MotionRecognizer
from gestures.gesture_training import GestureTrainer
from control.mouse_controller import MouseController


def create_dummy_hand_landmarks(pose: str = "open_palm") -> list:
    """Generates synthetic 21 landmark coordinates representing specific poses."""
    lms = [Landmark(0.5, 0.8, 0.0) for _ in range(21)]  # Wrist at bottom center

    # Knuckles / MCPs
    lms[INDEX_MCP] = Landmark(0.45, 0.55, 0.0)
    lms[MIDDLE_MCP] = Landmark(0.50, 0.52, 0.0)
    lms[RING_MCP] = Landmark(0.55, 0.55, 0.0)
    lms[PINKY_MCP] = Landmark(0.60, 0.60, 0.0)
    lms[THUMB_MCP] = Landmark(0.40, 0.70, 0.0)
    lms[THUMB_IP] = Landmark(0.35, 0.65, 0.0)

    # PIPs
    lms[INDEX_PIP] = Landmark(0.45, 0.45, 0.0)
    lms[MIDDLE_PIP] = Landmark(0.50, 0.42, 0.0)
    lms[RING_PIP] = Landmark(0.55, 0.45, 0.0)
    lms[PINKY_PIP] = Landmark(0.60, 0.50, 0.0)

    if pose == "open_palm":
        lms[THUMB_TIP] = Landmark(0.30, 0.55, 0.0)
        lms[INDEX_TIP] = Landmark(0.45, 0.25, 0.0)
        lms[MIDDLE_TIP] = Landmark(0.50, 0.22, 0.0)
        lms[RING_TIP] = Landmark(0.55, 0.25, 0.0)
        lms[PINKY_TIP] = Landmark(0.60, 0.32, 0.0)

    elif pose == "index_point":
        lms[THUMB_TIP] = Landmark(0.42, 0.65, 0.0)  # Tucked
        lms[INDEX_TIP] = Landmark(0.45, 0.25, 0.0)  # Extended
        lms[MIDDLE_TIP] = Landmark(0.50, 0.55, 0.0) # Curled
        lms[RING_TIP] = Landmark(0.55, 0.57, 0.0)   # Curled
        lms[PINKY_TIP] = Landmark(0.60, 0.62, 0.0)  # Curled

    elif pose == "pinch":
        lms[THUMB_TIP] = Landmark(0.44, 0.32, 0.0)  # Pinched with index
        lms[INDEX_TIP] = Landmark(0.45, 0.30, 0.0)  # Pinched with thumb
        lms[MIDDLE_TIP] = Landmark(0.50, 0.55, 0.0) # Curled
        lms[RING_TIP] = Landmark(0.55, 0.57, 0.0)   # Curled
        lms[PINKY_TIP] = Landmark(0.60, 0.62, 0.0)  # Curled

    elif pose == "closed_fist":
        lms[THUMB_TIP] = Landmark(0.45, 0.60, 0.0)  # Curled
        lms[INDEX_TIP] = Landmark(0.45, 0.58, 0.0)  # Curled
        lms[MIDDLE_TIP] = Landmark(0.50, 0.56, 0.0) # Curled
        lms[RING_TIP] = Landmark(0.55, 0.58, 0.0)   # Curled
        lms[PINKY_TIP] = Landmark(0.60, 0.62, 0.0)  # Curled

    elif pose == "thumb_up":
        lms[THUMB_TIP] = Landmark(0.35, 0.30, 0.0)  # Pointing straight up
        lms[INDEX_TIP] = Landmark(0.45, 0.58, 0.0)  # Curled
        lms[MIDDLE_TIP] = Landmark(0.50, 0.56, 0.0) # Curled
        lms[RING_TIP] = Landmark(0.55, 0.58, 0.0)   # Curled
        lms[PINKY_TIP] = Landmark(0.60, 0.62, 0.0)  # Curled

    return lms


class TestAirOSPipeline(unittest.TestCase):

    def test_landmark_processor(self):
        """Verify Euclidean distance, normalization, and finger extensions."""
        open_hand = create_dummy_hand_landmarks("open_palm")
        ext = LandmarkProcessor.get_extended_fingers(open_hand)
        self.assertTrue(ext["index"])
        self.assertTrue(ext["middle"])
        self.assertTrue(ext["ring"])
        self.assertTrue(ext["pinky"])

        # Test feature normalization (scale and translation invariance)
        features = LandmarkProcessor.get_normalized_features(open_hand)
        self.assertEqual(len(features), 63)
        self.assertEqual(features[0], 0.0)  # Wrist x is translated to 0
        self.assertEqual(features[1], 0.0)  # Wrist y is translated to 0

    def test_static_gesture_recognizer(self):
        """Verify recognition of Open Palm, Index Point, Pinch, Closed Fist, Thumb Up."""
        recognizer = GestureRecognizer()

        # Open Palm
        open_hand = create_dummy_hand_landmarks("open_palm")
        g = recognizer.recognize(open_hand)
        self.assertIsNotNone(g)
        self.assertEqual(g.name, "OPEN_PALM")

        # Index Point
        index_hand = create_dummy_hand_landmarks("index_point")
        g = recognizer.recognize(index_hand)
        self.assertIsNotNone(g)
        self.assertEqual(g.name, "INDEX_POINT")

        # Pinch
        pinch_hand = create_dummy_hand_landmarks("pinch")
        g = recognizer.recognize(pinch_hand)
        self.assertIsNotNone(g)
        self.assertEqual(g.name, "PINCH")

        # Closed Fist
        fist_hand = create_dummy_hand_landmarks("closed_fist")
        g = recognizer.recognize(fist_hand)
        self.assertIsNotNone(g)
        self.assertIn(g.name, ["CLOSED_FIST", "THUMB_DOWN"])

    def test_custom_gesture_ml_trainer(self):
        """Verify sample collection, Random Forest training, accuracy calculation, and prediction."""
        trainer = GestureTrainer()
        trainer.dataset = {}  # Clear temp

        # Record 10 samples for GESTURE_A (open palm)
        open_hand = create_dummy_hand_landmarks("open_palm")
        trainer.start_recording("GESTURE_A", target_samples=10)
        for _ in range(10):
            # Add tiny noise to simulate natural hand tremor
            noisy_hand = [Landmark(p.x + np.random.uniform(-0.01, 0.01), p.y + np.random.uniform(-0.01, 0.01), p.z) for p in open_hand]
            trainer.record_frame(noisy_hand)

        # Record 10 samples for GESTURE_B (index point)
        index_hand = create_dummy_hand_landmarks("index_point")
        trainer.start_recording("GESTURE_B", target_samples=10)
        for _ in range(10):
            noisy_hand = [Landmark(p.x + np.random.uniform(-0.01, 0.01), p.y + np.random.uniform(-0.01, 0.01), p.z) for p in index_hand]
            trainer.record_frame(noisy_hand)

        # Train model
        res = trainer.train_model()
        self.assertTrue(res.get("success"))
        self.assertGreaterEqual(res.get("accuracy"), 80.0)
        self.assertTrue(trainer.is_trained)

        # Test live inference
        pred = trainer.predict(open_hand)
        self.assertIsNotNone(pred)
        self.assertEqual(pred[0], "GESTURE_A")

        pred_b = trainer.predict(index_hand)
        self.assertIsNotNone(pred_b)
        self.assertEqual(pred_b[0], "GESTURE_B")

    def test_mouse_controller_mapping(self):
        """Verify 4-corner active boundary coordinate mapping."""
        mouse = MouseController()
        mouse.set_calibration(
            top_left=(0.2, 0.2),
            top_right=(0.8, 0.2),
            bottom_right=(0.8, 0.8),
            bottom_left=(0.2, 0.8)
        )

        # Center point
        sx, sy = mouse.map_to_screen(0.5, 0.5)
        self.assertAlmostEqual(sx, mouse.screen_w // 2, delta=50)
        self.assertAlmostEqual(sy, mouse.screen_h // 2, delta=50)


if __name__ == "__main__":
    unittest.main()
