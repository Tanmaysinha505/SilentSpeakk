"""
AirOS Static Gesture Recognizer
Classifies hand landmark poses into distinct static gestures with confidence estimation.
"""
import math
from typing import List, Dict, Optional, Tuple, NamedTuple
from vision.hand_detector import Landmark
from vision.landmark_processor import (
    LandmarkProcessor,
    WRIST, THUMB_TIP, THUMB_IP, THUMB_MCP,
    INDEX_TIP, INDEX_PIP, INDEX_MCP,
    MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP,
    RING_TIP, RING_PIP, RING_MCP,
    PINKY_TIP, PINKY_PIP, PINKY_MCP
)


class RecognizedGesture(NamedTuple):
    name: str
    confidence: float
    category: str  # "static" or "motion"
    meta: Dict[str, any]


class GestureRecognizer:
    def __init__(self, pinch_threshold: float = 0.052, right_pinch_threshold: float = 0.056):
        self.pinch_threshold = pinch_threshold
        self.right_pinch_threshold = right_pinch_threshold

    def recognize(self, landmarks: List[Landmark], handedness: str = "Right") -> Optional[RecognizedGesture]:
        """Analyzes 21 hand landmarks and returns recognized static gesture or None."""
        if len(landmarks) < 21:
            return None

        ext = LandmarkProcessor.get_extended_fingers(landmarks, handedness)
        thumb_ext = ext["thumb"]
        index_ext = ext["index"]
        middle_ext = ext["middle"]
        ring_ext = ext["ring"]
        pinky_ext = ext["pinky"]

        wrist = landmarks[WRIST]
        thumb_tip = landmarks[THUMB_TIP]
        index_tip = landmarks[INDEX_TIP]
        middle_tip = landmarks[MIDDLE_TIP]
        ring_tip = landmarks[RING_TIP]
        pinky_tip = landmarks[PINKY_TIP]

        # Normalized distances for pinching
        thumb_index_dist = LandmarkProcessor.get_pinch_distance(landmarks, THUMB_TIP, INDEX_TIP)
        thumb_middle_dist = LandmarkProcessor.get_pinch_distance(landmarks, THUMB_TIP, MIDDLE_TIP)
        index_middle_dist = LandmarkProcessor.get_pinch_distance(landmarks, INDEX_TIP, MIDDLE_TIP)

        # 1. CLOSED FIST / THUMB UP / THUMB DOWN (All 4 fingers Index, Middle, Ring, Pinky curled)
        if not index_ext and not middle_ext and not ring_ext and not pinky_ext:
            if thumb_ext:
                if thumb_tip.y < landmarks[THUMB_IP].y < wrist.y:
                    return RecognizedGesture("THUMB_UP", 0.94, "static", {})
                elif thumb_tip.y > landmarks[THUMB_IP].y > wrist.y:
                    return RecognizedGesture("THUMB_DOWN", 0.94, "static", {})
            return RecognizedGesture("CLOSED_FIST", 0.95, "static", {})

        # 2. OK SIGN (Thumb + Index pinched, Middle, Ring, Pinky extended)
        if thumb_index_dist < self.pinch_threshold and middle_ext and ring_ext and pinky_ext:
            conf = max(0.75, 1.0 - (thumb_index_dist / self.pinch_threshold) * 0.3)
            return RecognizedGesture("OK_SIGN", conf, "static", {"dist": thumb_index_dist})

        # 3. TWO-FINGER PINCH / RIGHT CLICK (Thumb + Middle pinch)
        if (thumb_middle_dist < self.right_pinch_threshold or (thumb_index_dist < self.pinch_threshold and thumb_middle_dist < self.right_pinch_threshold)) and not ring_ext and not pinky_ext:
            conf = max(0.80, 1.0 - (thumb_middle_dist / self.right_pinch_threshold) * 0.3)
            return RecognizedGesture("TWO_FINGER_PINCH", conf, "static", {"dist": thumb_middle_dist})

        # 4. PINCH / LEFT CLICK (Thumb + Index pinch, while Index is engaging thumb)
        if thumb_index_dist < self.pinch_threshold and not ring_ext and not pinky_ext:
            conf = max(0.80, 1.0 - (thumb_index_dist / self.pinch_threshold) * 0.3)
            return RecognizedGesture("PINCH", conf, "static", {"dist": thumb_index_dist})

        # 5. OPEN PALM (All 5 fingers open and extended)
        if thumb_ext and index_ext and middle_ext and ring_ext and pinky_ext:
            return RecognizedGesture("OPEN_PALM", 0.96, "static", {})

        # 6. THUMB UP / THUMB DOWN (when thumb is strongly extended and other 4 fingers are curled)
        if not index_ext and not middle_ext and not ring_ext and not pinky_ext and thumb_ext:
            if thumb_tip.y < landmarks[THUMB_IP].y:
                return RecognizedGesture("THUMB_UP", 0.94, "static", {})
            elif thumb_tip.y > landmarks[THUMB_IP].y:
                return RecognizedGesture("THUMB_DOWN", 0.94, "static", {})

        # 7. ROCK ON (Index and Pinky extended, Middle and Ring curled)
        if index_ext and pinky_ext and not middle_ext and not ring_ext:
            return RecognizedGesture("ROCK_ON", 0.93, "static", {})

        # 8. TWO FINGERS / PEACE (Index and Middle extended, Ring and Pinky curled)
        if index_ext and middle_ext and not ring_ext and not pinky_ext:
            return RecognizedGesture("TWO_FINGERS", 0.92, "static", {
                "distance": index_middle_dist,
                "center_x": (index_tip.x + middle_tip.x) / 2.0,
                "center_y": (index_tip.y + middle_tip.y) / 2.0
            })

        # 9. THREE FINGERS (Index, Middle, Ring extended, Pinky curled)
        if index_ext and middle_ext and ring_ext and not pinky_ext:
            return RecognizedGesture("THREE_FINGERS", 0.91, "static", {})

        # 10. FOUR FINGERS (Index, Middle, Ring, Pinky extended, Thumb curled)
        if index_ext and middle_ext and ring_ext and pinky_ext and not thumb_ext:
            return RecognizedGesture("FOUR_FINGERS", 0.91, "static", {})

        # 11. INDEX POINT / CURSOR MOVE (Index extended, Middle, Ring, Pinky curled)
        if index_ext and not middle_ext and not ring_ext and not pinky_ext:
            # Thumb can be either tucked or relaxed
            return RecognizedGesture("INDEX_POINT", 0.95, "static", {
                "cursor_x": index_tip.x,
                "cursor_y": index_tip.y
            })

        return None
