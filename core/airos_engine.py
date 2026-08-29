"""
AirOS Engine Orchestrator
Main background worker orchestrating Camera Capture -> MediaPipe Hand Tracking ->
Static & Dynamic Gesture Recognizers -> ML Classifier -> Intent Engine -> UI Telemetry Stream.
"""
import cv2
import time
import base64
import threading
import logging
from typing import Optional, Dict, Any, List, Callable

from core.config import config_mgr
from vision.camera_stream import CameraStream
from vision.hand_detector import HandDetector, HandResult
from vision.gesture_recognizer import GestureRecognizer, RecognizedGesture
from vision.motion_recognizer import MotionRecognizer
from core.intent_engine import IntentEngine
from gestures.gesture_training import gesture_trainer

logger = logging.getLogger("AirOS.Engine")


class AirOSEngine:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            
            cls._instance = super(AirOSEngine, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.cam_config = config_mgr.get("camera", {})
        self.camera = CameraStream(
            device_index=self.cam_config.get("device_index", 0),
            width=self.cam_config.get("width", 640),
            height=self.cam_config.get("height", 480),
            fps=self.cam_config.get("fps", 30),
            mirror=self.cam_config.get("mirror", True)
        )
        self.detector = HandDetector(max_hands=2, min_confidence=0.6)
        self.static_recognizer = GestureRecognizer()
        self.motion_recognizer = MotionRecognizer()
        self.intent_engine = IntentEngine()

        self._running = False
        self._paused = False
        self._thread: Optional[threading.Thread] = None

        # Telemetry & UI callbacks
        self.telemetry_listeners: List[Callable[[Dict[str, Any]], None]] = []
        self.latest_telemetry: Dict[str, Any] = {}
        self.include_video_stream = True

        self._initialized = True

    def start(self) -> bool:
        """Starts the CV and gesture processing pipeline."""
        if self._running:
            return True

        self.camera.start()
        self._running = True
        self._thread = threading.Thread(target=self._worker_loop, name="AirOSEngineThread", daemon=True)
        self._thread.start()
        logger.info("AirOS Engine started successfully.")
        return True

    def stop(self):
        """Stops the engine and releases camera resources."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
        self.camera.stop()
        logger.info("AirOS Engine stopped.")

    def add_telemetry_listener(self, callback: Callable[[Dict[str, Any]], None]):
        """Subscribes a listener (e.g. WebSocket manager) to real-time telemetry."""
        if callback not in self.telemetry_listeners:
            self.telemetry_listeners.append(callback)

    def remove_telemetry_listener(self, callback: Callable[[Dict[str, Any]], None]):
        """Unsubscribes a listener."""
        if callback in self.telemetry_listeners:
            self.telemetry_listeners.remove(callback)

    def _worker_loop(self):
        """Main real-time vision and control loop."""
        frame_interval = 1.0 / 35.0  # Cap at ~35 FPS for ideal balance of responsiveness & CPU efficiency

        while self._running:
            start_t = time.time()

            if self._paused:
                time.sleep(0.05)
                continue

            connected, frame, fps = self.camera.get_frame()
            if frame is None:
                time.sleep(0.01)
                continue

            # Run MediaPipe hand landmark detection
            hands: List[HandResult] = self.detector.detect(frame)

            active_gesture: Optional[RecognizedGesture] = None
            custom_ml: Optional[tuple] = None
            action_label = "IDLE"
            laser_coords = None
            spotlight_on = False

            training_info = None
            if hands:
                primary_hand = hands[0]
                landmarks = primary_hand.landmarks
                handedness = primary_hand.handedness

                # 1. If in TRAINING mode and recording active, record landmarks
                if self.intent_engine.active_mode == "TRAINING" and gesture_trainer.active_recording_name:
                    is_done, count, target = gesture_trainer.record_frame(landmarks)
                    training_info = {
                        "recording": True,
                        "gesture": gesture_trainer.active_recording_name,
                        "count": count,
                        "target": target,
                        "progress": round((count / target) * 100, 1),
                        "done": is_done
                    }
                    action_label = f"Recording: {count}/{target}"
                else:
                    # 2. Check Dynamic Motion Gestures (swipes, rotations, waves, circles)
                    dyn_gesture = self.motion_recognizer.update(landmarks, handedness)

                    # 3. Check Static Rule-Based Gestures
                    stat_gesture = self.static_recognizer.recognize(landmarks, handedness)

                    # 4. Check Custom ML Trained Classifier
                    custom_ml = gesture_trainer.predict(landmarks)

                    # Motion gestures take precedence if present; otherwise static gesture
                    active_gesture = dyn_gesture or stat_gesture

                    # 5. Dispatch Intent & System Actions
                    telemetry_intent = self.intent_engine.process(active_gesture, landmarks, custom_ml)
                    if telemetry_intent:
                        action_label = telemetry_intent.get("action", "IDLE")
                        laser_coords = telemetry_intent.get("laser_pos")
                        spotlight_on = telemetry_intent.get("spotlight", False)
            else:
                self.motion_recognizer.reset()
                self.intent_engine.process(None, [])

            # Optionally encode video frame for UI stream (every frame or downsampled)
            frame_base64 = None
            if self.include_video_stream:
                try:
                    # Resize slightly for ultra-fast JPEG encoding over WebSockets
                    small_frame = cv2.resize(frame, (480, 360), interpolation=cv2.INTER_LINEAR)
                    _, buf = cv2.imencode(".jpg", small_frame, [cv2.IMWRITE_JPEG_QUALITY, 55])
                    frame_base64 = base64.b64encode(buf).decode("utf-8")
                except Exception:
                    frame_base64 = None

            # Assemble telemetry package
            telemetry = {
                "type": "telemetry",
                "timestamp": time.time(),
                "camera_connected": connected,
                "fps": round(fps, 1),
                "hand_detected": len(hands) > 0,
                "hands_count": len(hands),
                "hands": [h.to_dict() for h in hands],
                "mode": self.intent_engine.active_mode,
                "gesture": active_gesture.name if active_gesture else (custom_ml[0] if custom_ml else "NONE"),
                "confidence": round(float(active_gesture.confidence if active_gesture else (custom_ml[1] if custom_ml else 0.0)) * 100, 1),
                "category": active_gesture.category if active_gesture else "static",
                "action": action_label,
                "laser_pos": laser_coords,
                "spotlight": spotlight_on,
                "volume": self.intent_engine.media_ctrl.get_volume(),
                "brightness": self.intent_engine.sys_ctrl.get_brightness(),
                "training": training_info,
                "image": frame_base64
            }

            self.latest_telemetry = telemetry

            # Broadcast to subscribers
            for listener in list(self.telemetry_listeners):
                try:
                    listener(telemetry)
                except Exception as e:
                    logger.debug("Error broadcasting to telemetry listener: %s", e)

            # Maintain smooth frame rate
            elapsed = time.time() - start_t
            sleep_time = max(0.001, frame_interval - elapsed)
            time.sleep(sleep_time)


airos_engine = AirOSEngine()
