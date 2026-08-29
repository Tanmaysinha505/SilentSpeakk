"""
AirOS MediaPipe Hand Detector
Integrates MediaPipe Tasks HandLandmarker to detect hands and extract 21 3D landmarks in real time.
"""
import os
import cv2
import logging
import urllib.request
import numpy as np
import mediapipe as mp
from typing import List, Dict, Optional, Any, NamedTuple

logger = logging.getLogger("AirOS.HandDetector")

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
DEFAULT_MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "hand_landmarker.task")


class Landmark(NamedTuple):
    x: float
    y: float
    z: float


class HandResult:
    def __init__(self, landmarks: List[Landmark], handedness: str, score: float, world_landmarks: Optional[List[Landmark]] = None):
        self.landmarks: List[Landmark] = landmarks
        self.handedness: str = handedness  # "Left" or "Right"
        self.score: float = score
        self.world_landmarks: List[Landmark] = world_landmarks or landmarks

    def to_dict(self) -> Dict[str, Any]:
        return {
            "handedness": self.handedness,
            "score": float(self.score),
            "landmarks": [{"x": float(lm.x), "y": float(lm.y), "z": float(lm.z)} for lm in self.landmarks]
        }


class HandDetector:
    def __init__(self, model_path: Optional[str] = None, max_hands: int = 2, min_confidence: float = 0.6):
        self.model_path = model_path or DEFAULT_MODEL_PATH
        self.max_hands = max_hands
        self.min_confidence = min_confidence
        self.landmarker = None
        self._ensure_model_file()
        self._init_detector()

    def _ensure_model_file(self) -> None:
        """Downloads the model file if it does not already exist."""
        if not os.path.exists(self.model_path):
            logger.info("Downloading MediaPipe hand_landmarker.task to %s...", self.model_path)
            try:
                urllib.request.urlretrieve(MODEL_URL, self.model_path)
                logger.info("Downloaded hand_landmarker.task successfully.")
            except Exception as e:
                logger.error("Failed to download hand_landmarker.task: %s", e)

    def _init_detector(self) -> None:
        """Initializes the MediaPipe Tasks HandLandmarker."""
        try:
            from mediapipe.tasks.python import vision, BaseOptions
            options = vision.HandLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=self.model_path),
                running_mode=vision.RunningMode.IMAGE,
                num_hands=self.max_hands,
                min_hand_detection_confidence=self.min_confidence,
                min_hand_presence_confidence=self.min_confidence,
                min_tracking_confidence=self.min_confidence
            )
            self.landmarker = vision.HandLandmarker.create_from_options(options)
            logger.info("MediaPipe HandLandmarker initialized successfully.")
        except Exception as e:
            logger.error("Error creating HandLandmarker: %s", e)
            self.landmarker = None

    def detect(self, bgr_frame: np.ndarray) -> List[HandResult]:
        """Runs hand detection on an OpenCV BGR frame and returns detected hands with landmarks."""
        if self.landmarker is None or bgr_frame is None:
            return []

        try:
            # Convert OpenCV BGR frame to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            detection_result = self.landmarker.detect(mp_image)

            hands: List[HandResult] = []
            if detection_result and detection_result.hand_landmarks:
                for idx, hand_lms in enumerate(detection_result.hand_landmarks):
                    # Extract 21 landmarks
                    landmarks = [Landmark(x=lm.x, y=lm.y, z=lm.z) for lm in hand_lms]

                    # Extract handedness and confidence score
                    handedness = "Right"
                    score = 0.95
                    if detection_result.handedness and idx < len(detection_result.handedness):
                        categories = detection_result.handedness[idx]
                        if categories:
                            handedness = categories[0].category_name
                            score = categories[0].score

                    # Extract world landmarks if available
                    world_lms = None
                    if detection_result.hand_world_landmarks and idx < len(detection_result.hand_world_landmarks):
                        world_lms = [Landmark(x=wlm.x, y=wlm.y, z=wlm.z) for wlm in detection_result.hand_world_landmarks[idx]]

                    hands.append(HandResult(
                        landmarks=landmarks,
                        handedness=handedness,
                        score=score,
                        world_landmarks=world_lms
                    ))

            return hands
        except Exception as e:
            logger.debug("Exception during hand detection: %s", e)
            return []
