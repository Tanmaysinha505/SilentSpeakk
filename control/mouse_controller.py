"""
AirOS Mouse Controller
High-performance, ultra-smooth mouse cursor control, 4-corner calibration mapping,
adaptive EMA jitter filtering, click debouncing, and drag-and-drop support.
"""
import time
import math
import ctypes
import pyautogui
import logging
from typing import Tuple, Dict, Any, Optional

logger = logging.getLogger("AirOS.MouseController")

# Disable PyAutoGUI fail-safe pause for real-time cursor control
pyautogui.PAUSE = 0
pyautogui.FAILSAFE = False


class MouseController:
    def __init__(self, smoothing: float = 0.65, sensitivity_x: float = 1.4, sensitivity_y: float = 1.4):
        self.smoothing = smoothing
        self.sensitivity_x = sensitivity_x
        self.sensitivity_y = sensitivity_y

        # Screen dimensions
        self.screen_w, self.screen_h = pyautogui.size()

        # Windows User32 handles for ultra-fast cursor placement
        self.user32 = ctypes.windll.user32

        # State tracking
        self.current_x = float(self.screen_w // 2)
        self.current_y = float(self.screen_h // 2)
        self.velocity_x = 0.0
        self.velocity_y = 0.0

        # Pinch & Click State Machine
        self.is_pinching = False
        self.is_right_pinching = False
        self.is_dragging = False
        self.pinch_start_time = 0.0
        self.last_click_time = 0.0
        self.click_cooldown = 0.35  # seconds

        # 4-Corner Calibration bounds (normalized coords)
        self.calibrated = False
        self.calib_min_x = 0.15
        self.calib_max_x = 0.85
        self.calib_min_y = 0.15
        self.calib_max_y = 0.85

    def set_calibration(self, top_left: Tuple[float, float], top_right: Tuple[float, float],
                        bottom_right: Tuple[float, float], bottom_left: Tuple[float, float]):
        """Sets the 4-corner active region for mapping hand coordinates to screen."""
        self.calib_min_x = max(0.01, min(top_left[0], bottom_left[0]))
        self.calib_max_x = min(0.99, max(top_right[0], bottom_right[0]))
        self.calib_min_y = max(0.01, min(top_left[1], top_right[1]))
        self.calib_max_y = min(0.99, max(bottom_left[1], bottom_right[1]))
        self.calibrated = True
        logger.info("Updated mouse calibration: X=[%.2f, %.2f], Y=[%.2f, %.2f]",
                    self.calib_min_x, self.calib_max_x, self.calib_min_y, self.calib_max_y)

    def map_to_screen(self, norm_x: float, norm_y: float) -> Tuple[int, int]:
        """Maps normalized webcam coordinates inside active area to full screen pixel coordinates."""
        # Normalize relative to calibrated active area
        clamped_x = max(self.calib_min_x, min(self.calib_max_x, norm_x))
        clamped_y = max(self.calib_min_y, min(self.calib_max_y, norm_y))

        rel_x = (clamped_x - self.calib_min_x) / (self.calib_max_x - self.calib_min_x)
        rel_y = (clamped_y - self.calib_min_y) / (self.calib_max_y - self.calib_min_y)

        # Center-based sensitivity multiplier
        cx = rel_x - 0.5
        cy = rel_y - 0.5
        adj_x = 0.5 + cx * self.sensitivity_x
        adj_y = 0.5 + cy * self.sensitivity_y

        target_x = max(0, min(self.screen_w - 1, int(adj_x * self.screen_w)))
        target_y = max(0, min(self.screen_h - 1, int(adj_y * self.screen_h)))

        return (target_x, target_y)

    def move_to(self, norm_x: float, norm_y: float) -> Tuple[int, int]:
        """
        Smoothly moves the OS cursor using an adaptive Exponential Moving Average filter.
        Eliminates micro-jitter when holding still, while keeping fast response during motion.
        """
        raw_target_x, raw_target_y = self.map_to_screen(norm_x, norm_y)

        dist = math.hypot(raw_target_x - self.current_x, raw_target_y - self.current_y)

        # Adaptive alpha: fast motion gets high alpha, slow jitter gets heavy smoothing
        if dist < 4.0:
            # Deadzone - hold steady to prevent unwanted jitter
            alpha = 0.05
        elif dist < 30.0:
            alpha = max(0.15, 1.0 - self.smoothing)
        else:
            alpha = min(0.85, (1.0 - self.smoothing) * 1.6)

        self.current_x = self.current_x + alpha * (raw_target_x - self.current_x)
        self.current_y = self.current_y + alpha * (raw_target_y - self.current_y)

        px = int(self.current_x)
        py = int(self.current_y)

        try:
            hDesk = self.user32.OpenInputDesktop(0, False, 0x01FF)
            if hDesk:
                self.user32.SetThreadDesktop(hDesk)
            self.user32.SetCursorPos(px, py)
            abs_x = int(px * 65535 / (self.screen_w - 1)) if self.screen_w > 1 else 0
            abs_y = int(py * 65535 / (self.screen_h - 1)) if self.screen_h > 1 else 0
            self.user32.mouse_event(0x8001, abs_x, abs_y, 0, 0)
        except Exception:
            pyautogui.moveTo(px, py)

        return (px, py)

    def left_click(self) -> bool:
        """Executes a single left mouse click with debouncing."""
        now = time.time()
        if (now - self.last_click_time) < self.click_cooldown:
            return False

        try:
            pyautogui.click(button="left")
            self.last_click_time = now
            logger.debug("Left click executed at (%d, %d)", int(self.current_x), int(self.current_y))
            return True
        except Exception as e:
            logger.error("Left click failed: %s", e)
            return False

    def right_click(self) -> bool:
        """Executes a right mouse click with debouncing."""
        now = time.time()
        if (now - self.last_click_time) < self.click_cooldown:
            return False

        try:
            pyautogui.click(button="right")
            self.last_click_time = now
            logger.debug("Right click executed at (%d, %d)", int(self.current_x), int(self.current_y))
            return True
        except Exception as e:
            logger.error("Right click failed: %s", e)
            return False

    def double_click(self) -> bool:
        """Executes a double left mouse click."""
        try:
            pyautogui.doubleClick()
            self.last_click_time = time.time()
            return True
        except Exception as e:
            logger.error("Double click failed: %s", e)
            return False

    def start_drag(self):
        """Holds down the left mouse button for dragging."""
        if not self.is_dragging:
            pyautogui.mouseDown(button="left")
            self.is_dragging = True
            logger.debug("Mouse drag engaged")

    def end_drag(self):
        """Releases the left mouse button after dragging."""
        if self.is_dragging:
            pyautogui.mouseUp(button="left")
            self.is_dragging = False
            logger.debug("Mouse drag released")

    def scroll(self, clicks: int):
        """Scrolls up (positive) or down (negative)."""
        try:
            pyautogui.scroll(clicks)
        except Exception as e:
            logger.error("Mouse scroll failed: %s", e)
