"""
AirOS Dynamic Motion Recognizer
Tracks hand landmark trajectories over time to recognize dynamic motions:
Swipes, Hand Rotations, Circular gestures, and Waves.
"""
import time
import math
from collections import deque
from typing import List, Optional, Tuple, Dict
from vision.hand_detector import Landmark
from vision.landmark_processor import LandmarkProcessor, WRIST, MIDDLE_MCP, INDEX_TIP
from vision.gesture_recognizer import RecognizedGesture


class MotionRecognizer:
    def __init__(self, history_len: int = 24, min_swipe_speed: float = 0.012, min_rotation_deg: float = 28.0):
        self.history_len = history_len
        self.min_swipe_speed = min_swipe_speed
        self.min_rotation_deg = min_rotation_deg

        # Trajectory history buffers: (time, palm_x, palm_y, hand_angle, index_x, index_y, is_open)
        self.history = deque(maxlen=history_len)

        # Cooldown management
        self.last_motion_time = 0.0
        self.cooldown_sec = 0.65  # Minimum time between dynamic gesture triggers

    def reset(self):
        """Clears trajectory history."""
        self.history.clear()

    def update(self, landmarks: List[Landmark], handedness: str = "Right") -> Optional[RecognizedGesture]:
        """Appends current landmark frame to history and checks for dynamic motion gestures."""
        now = time.time()
        if len(landmarks) < 21:
            self.history.clear()
            return None

        palm = LandmarkProcessor.get_palm_center(landmarks)
        angle = LandmarkProcessor.get_hand_angle(landmarks)
        index_tip = landmarks[INDEX_TIP]
        ext = LandmarkProcessor.get_extended_fingers(landmarks, handedness)
        is_open = ext["index"] and ext["middle"] and ext["ring"]

        self.history.append((now, palm.x, palm.y, angle, index_tip.x, index_tip.y, is_open))

        # Check cooldown
        if (now - self.last_motion_time) < self.cooldown_sec:
            return None

        # Need at least 8 frames to assess dynamic gestures
        if len(self.history) < 8:
            return None

        # 1. Check for Wave Gesture
        wave = self._check_wave()
        if wave:
            self.last_motion_time = now
            self.history.clear()
            return wave

        # 2. Check for Circular Gesture
        circle = self._check_circle()
        if circle:
            self.last_motion_time = now
            self.history.clear()
            return circle

        # 3. Check for Hand Rotation (Clockwise / Counter-Clockwise)
        rotation = self._check_rotation()
        if rotation:
            self.last_motion_time = now
            self.history.clear()
            return rotation

        # 4. Check for Swipes (Left, Right, Up, Down)
        swipe = self._check_swipe()
        if swipe:
            self.last_motion_time = now
            self.history.clear()
            return swipe

        return None

    def _check_swipe(self) -> Optional[RecognizedGesture]:
        """Calculates trajectory displacement and velocity over the recent window."""
        t_start, x_start, y_start, _, _, _, _ = self.history[0]
        t_end, x_end, y_end, _, _, _, _ = self.history[-1]

        dt = t_end - t_start
        if dt < 0.12 or dt > 0.65:
            return None

        dx = x_end - x_start
        dy = y_end - y_start

        speed_x = abs(dx) / dt
        speed_y = abs(dy) / dt

        # Horizontal Swipe
        if speed_x > self.min_swipe_speed and abs(dx) > 0.14 and speed_x > speed_y * 1.5:
            # Verify monotonic directional movement in recent frames
            xs = [item[1] for item in self.history]
            diffs = [xs[i+1] - xs[i] for i in range(len(xs)-1)]
            positive_ratio = sum(1 for d in diffs if d > 0) / len(diffs)

            if dx > 0 and positive_ratio > 0.60:
                conf = min(0.98, 0.75 + speed_x * 4.0)
                return RecognizedGesture("SWIPE_RIGHT", conf, "motion", {"velocity": speed_x, "distance": dx})
            elif dx < 0 and (1.0 - positive_ratio) > 0.60:
                conf = min(0.98, 0.75 + speed_x * 4.0)
                return RecognizedGesture("SWIPE_LEFT", conf, "motion", {"velocity": speed_x, "distance": dx})

        # Vertical Swipe
        if speed_y > self.min_swipe_speed and abs(dy) > 0.14 and speed_y > speed_x * 1.5:
            ys = [item[2] for item in self.history]
            diffs = [ys[i+1] - ys[i] for i in range(len(ys)-1)]
            positive_ratio = sum(1 for d in diffs if d > 0) / len(diffs)

            # In image coords, dy < 0 is upward
            if dy < 0 and (1.0 - positive_ratio) > 0.60:
                conf = min(0.98, 0.75 + speed_y * 4.0)
                return RecognizedGesture("SWIPE_UP", conf, "motion", {"velocity": speed_y, "distance": dy})
            elif dy > 0 and positive_ratio > 0.60:
                conf = min(0.98, 0.75 + speed_y * 4.0)
                return RecognizedGesture("SWIPE_DOWN", conf, "motion", {"velocity": speed_y, "distance": dy})

        return None

    def _check_rotation(self) -> Optional[RecognizedGesture]:
        """Detects rotational movement of the hand wrist-to-palm vector."""
        angles = [item[3] for item in self.history]
        if len(angles) < 10:
            return None

        # Unwrap angles to handle +/- 180 discontinuity
        unwrapped = [angles[0]]
        for i in range(1, len(angles)):
            da = angles[i] - angles[i-1]
            if da > 180:
                da -= 360
            elif da < -180:
                da += 360
            unwrapped.append(unwrapped[-1] + da)

        total_rotation = unwrapped[-1] - unwrapped[0]
        t_start = self.history[0][0]
        t_end = self.history[-1][0]
        dt = t_end - t_start

        if dt > 0.8:
            return None

        if total_rotation > self.min_rotation_deg:
            conf = min(0.95, 0.70 + (total_rotation / 90.0) * 0.25)
            return RecognizedGesture("ROTATE_CLOCKWISE", conf, "motion", {"degrees": total_rotation})
        elif total_rotation < -self.min_rotation_deg:
            conf = min(0.95, 0.70 + (abs(total_rotation) / 90.0) * 0.25)
            return RecognizedGesture("ROTATE_COUNTER_CLOCKWISE", conf, "motion", {"degrees": total_rotation})

        return None

    def _check_circle(self) -> Optional[RecognizedGesture]:
        """Detects circular drawing motion using index fingertip or palm path."""
        if len(self.history) < 14:
            return None

        pts = [(item[4], item[5]) for item in self.history]  # Index tip trajectory
        mean_x = sum(p[0] for p in pts) / len(pts)
        mean_y = sum(p[1] for p in pts) / len(pts)

        # Compute radial distance variance (circle has relatively constant radius)
        radii = [math.sqrt((p[0] - mean_x)**2 + (p[1] - mean_y)**2) for p in pts]
        avg_radius = sum(radii) / len(radii)

        if avg_radius < 0.04 or avg_radius > 0.35:
            return None

        # Compute total winding angle around mean point
        winding_angle = 0.0
        for i in range(len(pts) - 1):
            p1 = pts[i]
            p2 = pts[i+1]
            a1 = math.atan2(p1[1] - mean_y, p1[0] - mean_x)
            a2 = math.atan2(p2[1] - mean_y, p2[0] - mean_x)
            da = a2 - a1
            if da > math.pi:
                da -= 2 * math.pi
            elif da < -math.pi:
                da += 2 * math.pi
            winding_angle += da

        # Full or nearly full circle (> 280 degrees = ~4.9 rad)
        if abs(winding_angle) >= 4.7:
            direction = "clockwise" if winding_angle > 0 else "counter_clockwise"
            return RecognizedGesture("CIRCULAR_MOTION", 0.90, "motion", {"direction": direction, "radius": avg_radius})

        return None

    def _check_wave(self) -> Optional[RecognizedGesture]:
        """Detects waving gesture (side-to-side oscillation of open hand)."""
        if len(self.history) < 14:
            return None

        # Must have hand open during wave
        open_count = sum(1 for item in self.history if item[6])
        if open_count / len(self.history) < 0.60:
            return None

        xs = [item[1] for item in self.history]
        # Count directional reversals in X
        reversals = 0
        current_dir = 0  # +1 for right, -1 for left

        for i in range(1, len(xs)):
            dx = xs[i] - xs[i-1]
            if abs(dx) > 0.008:
                new_dir = 1 if dx > 0 else -1
                if current_dir != 0 and new_dir != current_dir:
                    reversals += 1
                current_dir = new_dir

        if reversals >= 3:
            return RecognizedGesture("WAVE", 0.92, "motion", {"reversals": reversals})

        return None
