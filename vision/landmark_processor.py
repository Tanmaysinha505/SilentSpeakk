"""
AirOS Landmark Processor
Performs geometric calculations, kinematic analysis, finger extension checks,
and scale/translation invariant normalization on 21 hand landmarks.
"""
import math
import numpy as np
from typing import List, Dict, Tuple, Any
from vision.hand_detector import Landmark

# Standard MediaPipe Hand Landmark Indices
WRIST = 0
THUMB_CMC = 1
THUMB_MCP = 2
THUMB_IP = 3
THUMB_TIP = 4

INDEX_MCP = 5
INDEX_PIP = 6
INDEX_DIP = 7
INDEX_TIP = 8

MIDDLE_MCP = 9
MIDDLE_PIP = 10
MIDDLE_DIP = 11
MIDDLE_TIP = 12

RING_MCP = 13
RING_PIP = 14
RING_DIP = 15
RING_TIP = 16

PINKY_MCP = 17
PINKY_PIP = 18
PINKY_DIP = 19
PINKY_TIP = 20

FINGER_TIPS = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP]
FINGER_PIPS = [THUMB_IP, INDEX_PIP, MIDDLE_PIP, RING_PIP, PINKY_PIP]
FINGER_MCPS = [THUMB_MCP, INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP]


class LandmarkProcessor:
    @staticmethod
    def euclidean_distance(p1: Landmark, p2: Landmark, use_z: bool = False) -> float:
        """Computes Euclidean distance between two landmarks in normalized space."""
        dx = p1.x - p2.x
        dy = p1.y - p2.y
        if use_z:
            dz = p1.z - p2.z
            return math.sqrt(dx * dx + dy * dy + dz * dz)
        return math.sqrt(dx * dx + dy * dy)

    @staticmethod
    def get_extended_fingers(landmarks: List[Landmark], handedness: str = "Right") -> Dict[str, bool]:
        """
        Determines which fingers are extended (open) vs curled (closed).
        Uses geometric distance from wrist and joint alignment for robustness against arbitrary hand orientations.
        """
        if len(landmarks) < 21:
            return {"thumb": False, "index": False, "middle": False, "ring": False, "pinky": False}

        wrist = landmarks[WRIST]
        palm_size = LandmarkProcessor.euclidean_distance(wrist, landmarks[MIDDLE_MCP])
        if palm_size < 1e-4:
            palm_size = 1.0

        # For 4 main fingers (Index, Middle, Ring, Pinky):
        # A finger is extended if TIP distance from wrist is significantly greater than PIP distance from wrist
        index_ext = LandmarkProcessor.euclidean_distance(wrist, landmarks[INDEX_TIP]) > \
                    LandmarkProcessor.euclidean_distance(wrist, landmarks[INDEX_PIP]) * 1.15

        middle_ext = LandmarkProcessor.euclidean_distance(wrist, landmarks[MIDDLE_TIP]) > \
                     LandmarkProcessor.euclidean_distance(wrist, landmarks[MIDDLE_PIP]) * 1.15

        ring_ext = LandmarkProcessor.euclidean_distance(wrist, landmarks[RING_TIP]) > \
                   LandmarkProcessor.euclidean_distance(wrist, landmarks[RING_PIP]) * 1.15

        pinky_ext = LandmarkProcessor.euclidean_distance(wrist, landmarks[PINKY_TIP]) > \
                    LandmarkProcessor.euclidean_distance(wrist, landmarks[PINKY_PIP]) * 1.15

        # For Thumb:
        # Check distance between thumb tip and pinky MCP / index MCP compared to thumb IP
        thumb_tip_dist = LandmarkProcessor.euclidean_distance(landmarks[THUMB_TIP], landmarks[PINKY_MCP])
        thumb_ip_dist = LandmarkProcessor.euclidean_distance(landmarks[THUMB_IP], landmarks[PINKY_MCP])
        thumb_ext = thumb_tip_dist > thumb_ip_dist * 1.12

        return {
            "thumb": bool(thumb_ext),
            "index": bool(index_ext),
            "middle": bool(middle_ext),
            "ring": bool(ring_ext),
            "pinky": bool(pinky_ext)
        }

    @staticmethod
    def get_palm_center(landmarks: List[Landmark]) -> Landmark:
        """Calculates center of the palm from wrist and MCP joints."""
        if len(landmarks) < 21:
            return Landmark(0.5, 0.5, 0.0)

        pts = [landmarks[WRIST], landmarks[INDEX_MCP], landmarks[MIDDLE_MCP], landmarks[RING_MCP], landmarks[PINKY_MCP]]
        avg_x = sum(p.x for p in pts) / len(pts)
        avg_y = sum(p.y for p in pts) / len(pts)
        avg_z = sum(p.z for p in pts) / len(pts)
        return Landmark(x=avg_x, y=avg_y, z=avg_z)

    @staticmethod
    def get_hand_angle(landmarks: List[Landmark]) -> float:
        """
        Calculates hand rotation angle in degrees (-180 to 180) based on vector from wrist to middle MCP.
        0 deg is pointing straight up.
        """
        if len(landmarks) < 21:
            return 0.0

        dx = landmarks[MIDDLE_MCP].x - landmarks[WRIST].x
        dy = landmarks[MIDDLE_MCP].y - landmarks[WRIST].y
        # Note: image Y is inverted (0 at top)
        angle_rad = math.atan2(dx, -dy)
        return math.degrees(angle_rad)

    @staticmethod
    def get_pinch_distance(landmarks: List[Landmark], finger1_tip: int = THUMB_TIP, finger2_tip: int = INDEX_TIP) -> float:
        """Calculates normalized distance between two fingertip landmarks."""
        if len(landmarks) < 21:
            return 1.0
        return LandmarkProcessor.euclidean_distance(landmarks[finger1_tip], landmarks[finger2_tip])

    @staticmethod
    def get_normalized_features(landmarks: List[Landmark]) -> np.ndarray:
        """
        Converts 21 landmarks into a 63-dimensional normalized feature vector:
        1. Translates coordinates so Wrist is at (0, 0, 0).
        2. Scales coordinates by the distance from Wrist to Middle MCP (scale-invariant).
        """
        if len(landmarks) < 21:
            return np.zeros(63, dtype=np.float32)

        wrist = landmarks[WRIST]
        # Scaling reference: distance from wrist to middle MCP
        scale = LandmarkProcessor.euclidean_distance(wrist, landmarks[MIDDLE_MCP], use_z=True)
        if scale < 1e-4:
            scale = 1.0

        features = []
        for lm in landmarks:
            norm_x = (lm.x - wrist.x) / scale
            norm_y = (lm.y - wrist.y) / scale
            norm_z = (lm.z - wrist.z) / scale
            features.extend([norm_x, norm_y, norm_z])

        return np.array(features, dtype=np.float32)

    @staticmethod
    def get_bounding_box(landmarks: List[Landmark], frame_w: int, frame_h: int) -> Tuple[int, int, int, int]:
        """Calculates pixel bounding box (x_min, y_min, x_max, y_max) with padding."""
        if len(landmarks) < 21:
            return (0, 0, frame_w, frame_h)

        xs = [int(lm.x * frame_w) for lm in landmarks]
        ys = [int(lm.y * frame_h) for lm in landmarks]

        pad_x = int(frame_w * 0.04)
        pad_y = int(frame_h * 0.04)

        x_min = max(0, min(xs) - pad_x)
        y_min = max(0, min(ys) - pad_y)
        x_max = min(frame_w, max(xs) + pad_x)
        y_max = min(frame_h, max(ys) + pad_y)

        return (x_min, y_min, x_max, y_max)
