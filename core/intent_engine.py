"""
AirOS Intent Engine
Safety state machine, gesture debouncing, temporal confirmation, mode routing,
and computer action dispatcher.
"""
import time
import logging
from collections import deque
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple

from core.config import config_mgr
from vision.hand_detector import Landmark
from vision.gesture_recognizer import RecognizedGesture
from vision.landmark_processor import INDEX_TIP, THUMB_TIP, MIDDLE_TIP
from control.mouse_controller import MouseController
from control.keyboard_controller import KeyboardController
from control.media_controller import MediaController
from control.window_controller import WindowController
from control.system_controller import SystemController
from gestures.default_gestures import DEFAULT_MODE_ACTIONS
from gestures.custom_gestures import custom_registry
from gestures.gesture_training import gesture_trainer

logger = logging.getLogger("AirOS.IntentEngine")


class IntentEngine:
    def __init__(self):
        self.mouse_ctrl = MouseController()
        self.kb_ctrl = KeyboardController()
        self.media_ctrl = MediaController()
        self.win_ctrl = WindowController()
        self.sys_ctrl = SystemController()

        # State tracking for debouncing
        self.active_mode = "CURSOR"
        self.last_action_time: Dict[str, float] = {}
        self.last_gesture_name: Optional[str] = None
        self.consecutive_frames: int = 0
        self.is_pinched_down = False
        self.is_right_pinched_down = False

        # Virtual Laser Pointer for presentation mode
        self.laser_pos: Optional[Tuple[float, float]] = None
        self.spotlight_active = False

        # Event History Log (max 100 items)
        self.history = deque(maxlen=100)

        # Sync calibration from config
        self._load_calibration()

    def _load_calibration(self):
        calib = config_mgr.get("calibration", {})
        if calib.get("calibrated"):
            self.mouse_ctrl.set_calibration(
                top_left=calib.get("top_left", [0.15, 0.15]),
                top_right=calib.get("top_right", [0.85, 0.15]),
                bottom_right=calib.get("bottom_right", [0.85, 0.85]),
                bottom_left=calib.get("bottom_left", [0.15, 0.85])
            )

    def set_mode(self, mode_name: str) -> str:
        """Switches active operating mode."""
        clean_mode = mode_name.upper()
        if clean_mode in DEFAULT_MODE_ACTIONS or clean_mode in ["CUSTOM", "TRAINING"]:
            self.active_mode = clean_mode
            config_mgr.update_section("modes", {"active_mode": clean_mode})
            logger.info("Active mode switched to: %s", self.active_mode)
            self._log_event("MODE_SWITCH", f"Switched to {clean_mode} Mode", 1.0)
        return self.active_mode

    def _log_event(self, gesture: str, action: str, confidence: float):
        """Appends an event to the UI history log."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.history.appendleft({
            "id": f"evt_{int(time.time()*1000)}",
            "time": timestamp,
            "gesture": gesture,
            "action": action,
            "confidence": int(round(confidence * 100)),
            "mode": self.active_mode
        })

    def clear_history(self):
        """Clears the event log."""
        self.history.clear()

    def get_history(self) -> List[Dict[str, Any]]:
        """Returns recent event logs."""
        return list(self.history)

    def _can_trigger(self, action_key: str, cooldown_sec: float) -> bool:
        """Enforces action-specific cooldowns."""
        now = time.time()
        last_t = self.last_action_time.get(action_key, 0.0)
        if (now - last_t) >= cooldown_sec:
            self.last_action_time[action_key] = now
            return True
        return False

    def process(self, gesture: Optional[RecognizedGesture], landmarks: List[Landmark],
                custom_ml_gesture: Optional[Tuple[str, float]] = None) -> Optional[Dict[str, Any]]:
        """
        Main intent processing method.
        Evaluates detected gesture against current mode, performs safety checks,
        dispatches computer actions, and returns telemetry info for the UI.
        """
        now = time.time()
        result_telemetry = {
            "mode": self.active_mode,
            "gesture": gesture.name if gesture else "NONE",
            "confidence": gesture.confidence if gesture else 0.0,
            "action": "IDLE",
            "laser_pos": None,
            "spotlight": False
        }

        # 1. Custom Gesture ML Match (if active or in CUSTOM mode)
        if custom_ml_gesture and self.active_mode in ["CUSTOM", "CURSOR"]:
            ml_name, ml_conf = custom_ml_gesture
            if ml_conf >= config_mgr.get("recognition", {}).get("confidence_threshold", 0.70):
                action_info = self._execute_custom_gesture(ml_name, ml_conf)
                if action_info:
                    result_telemetry["gesture"] = ml_name
                    result_telemetry["confidence"] = ml_conf
                    result_telemetry["action"] = action_info
                    return result_telemetry

        if not gesture or len(landmarks) < 21:
            # Release any active drags or pinches
            if self.is_pinched_down:
                self.is_pinched_down = False
                self.mouse_ctrl.end_drag()
            self.last_gesture_name = None
            self.consecutive_frames = 0
            return result_telemetry

        # Temporal Confirmation Filter for static poses
        if gesture.name == self.last_gesture_name:
            self.consecutive_frames += 1
        else:
            self.last_gesture_name = gesture.name
            self.consecutive_frames = 1

        # Check confidence threshold
        min_conf = config_mgr.get("recognition", {}).get("confidence_threshold", 0.70)
        if config_mgr.get("accessibility", {}).get("enabled"):
            min_conf *= 0.85  # Greater tolerance in accessibility mode

        if gesture.confidence < min_conf:
            return result_telemetry

        g_name = gesture.name
        g_conf = gesture.confidence

        # ==========================================
        # 1. CURSOR MODE
        # ==========================================
        if self.active_mode == "CURSOR":
            if g_name == "INDEX_POINT":
                index_tip = landmarks[INDEX_TIP]
                # Smoothly move mouse cursor
                px, py = self.mouse_ctrl.move_to(index_tip.x, index_tip.y)
                result_telemetry["action"] = f"Move Cursor ({px}, {py})"

            elif g_name == "PINCH":
                # Single Left Click with state lock (prevents multi-click on hold)
                if not self.is_pinched_down:
                    if self._can_trigger("left_click", 0.35):
                        self.mouse_ctrl.left_click()
                        self.is_pinched_down = True
                        self._log_event("PINCH", "LEFT CLICK", g_conf)
                        result_telemetry["action"] = "LEFT CLICK"
            else:
                # Released pinch
                if self.is_pinched_down:
                    self.is_pinched_down = False

            if g_name == "TWO_FINGER_PINCH":
                if not self.is_right_pinched_down:
                    if self._can_trigger("right_click", 0.40):
                        self.mouse_ctrl.right_click()
                        self.is_right_pinched_down = True
                        self._log_event("TWO_FINGER_PINCH", "RIGHT CLICK", g_conf)
                        result_telemetry["action"] = "RIGHT CLICK"
            else:
                self.is_right_pinched_down = False

            if g_name == "SWIPE_UP":
                if self._can_trigger("scroll_up", 0.20):
                    self.mouse_ctrl.scroll(4)
                    result_telemetry["action"] = "SCROLL UP"
            elif g_name == "SWIPE_DOWN":
                if self._can_trigger("scroll_down", 0.20):
                    self.mouse_ctrl.scroll(-4)
                    result_telemetry["action"] = "SCROLL DOWN"

            elif g_name == "TWO_FINGERS":
                # Zoom mode
                dist = gesture.meta.get("distance", 0.05)
                if self._can_trigger("zoom", 0.30):
                    if dist > 0.08:
                        self.kb_ctrl.zoom_in()
                        result_telemetry["action"] = "ZOOM IN"
                        self._log_event("TWO_FINGERS", "ZOOM IN", g_conf)
                    elif dist < 0.04:
                        self.kb_ctrl.zoom_out()
                        result_telemetry["action"] = "ZOOM OUT"
                        self._log_event("TWO_FINGERS", "ZOOM OUT", g_conf)

            elif g_name == "THUMB_UP" and self.consecutive_frames >= 2:
                if self._can_trigger("thumb_up", 0.60):
                    self.kb_ctrl.press("enter")
                    self._log_event("THUMB_UP", "ENTER / CONFIRM", g_conf)
                    result_telemetry["action"] = "ENTER / CONFIRM"

            elif g_name == "THUMB_DOWN" and self.consecutive_frames >= 2:
                if self._can_trigger("thumb_down", 0.60):
                    self.kb_ctrl.press("esc")
                    self._log_event("THUMB_DOWN", "ESCAPE / REJECT", g_conf)
                    result_telemetry["action"] = "ESCAPE / REJECT"

            elif g_name == "CLOSED_FIST" and self.consecutive_frames >= 2:
                if self._can_trigger("cancel", 0.60):
                    self.win_ctrl.show_desktop()
                    self._log_event("CLOSED_FIST", "SHOW DESKTOP", g_conf)
                    result_telemetry["action"] = "SHOW DESKTOP"

        # ==========================================
        # 2. MEDIA MODE
        # ==========================================
        elif self.active_mode == "MEDIA":
            if g_name == "OPEN_PALM" and self.consecutive_frames >= 2:
                if self._can_trigger("media_play", 0.70):
                    self.media_ctrl.play_pause()
                    self._log_event("OPEN_PALM", "PLAY / PAUSE", g_conf)
                    result_telemetry["action"] = "PLAY / PAUSE"

            elif g_name == "SWIPE_RIGHT":
                if self._can_trigger("media_next", 0.60):
                    self.media_ctrl.next_track()
                    self._log_event("SWIPE_RIGHT", "NEXT TRACK", g_conf)
                    result_telemetry["action"] = "NEXT TRACK"

            elif g_name == "SWIPE_LEFT":
                if self._can_trigger("media_prev", 0.60):
                    self.media_ctrl.prev_track()
                    self._log_event("SWIPE_LEFT", "PREV TRACK", g_conf)
                    result_telemetry["action"] = "PREVIOUS TRACK"

            elif g_name == "ROTATE_CLOCKWISE":
                if self._can_trigger("vol_up", 0.12):
                    vol = self.media_ctrl.volume_up(5)
                    self._log_event("ROTATE_CLOCKWISE", f"VOLUME +5% ({vol}%)", g_conf)
                    result_telemetry["action"] = f"VOLUME +5% ({vol}%)"

            elif g_name == "ROTATE_COUNTER_CLOCKWISE":
                if self._can_trigger("vol_down", 0.12):
                    vol = self.media_ctrl.volume_down(5)
                    self._log_event("ROTATE_COUNTER_CLOCKWISE", f"VOLUME -5% ({vol}%)", g_conf)
                    result_telemetry["action"] = f"VOLUME -5% ({vol}%)"

            elif g_name == "CLOSED_FIST" and self.consecutive_frames >= 2:
                if self._can_trigger("mute", 0.70):
                    muted = self.media_ctrl.toggle_mute()
                    act_label = "MUTED" if muted else "UNMUTED"
                    self._log_event("CLOSED_FIST", act_label, g_conf)
                    result_telemetry["action"] = act_label

        # ==========================================
        # 3. PRESENTATION MODE
        # ==========================================
        elif self.active_mode == "PRESENTATION":
            if g_name == "SWIPE_RIGHT":
                if self._can_trigger("pres_next", 0.50):
                    self.kb_ctrl.next_slide()
                    self._log_event("SWIPE_RIGHT", "NEXT SLIDE", g_conf)
                    result_telemetry["action"] = "NEXT SLIDE"

            elif g_name == "SWIPE_LEFT":
                if self._can_trigger("pres_prev", 0.50):
                    self.kb_ctrl.prev_slide()
                    self._log_event("SWIPE_LEFT", "PREV SLIDE", g_conf)
                    result_telemetry["action"] = "PREV SLIDE"

            elif g_name == "INDEX_POINT":
                index_tip = landmarks[INDEX_TIP]
                self.laser_pos = (index_tip.x, index_tip.y)
                result_telemetry["laser_pos"] = self.laser_pos
                result_telemetry["action"] = "LASER POINTER"

            elif g_name == "CIRCULAR_MOTION":
                self.spotlight_active = True
                result_telemetry["spotlight"] = True
                result_telemetry["action"] = "SPOTLIGHT HIGHLIGHT"
                self._log_event("CIRCULAR_MOTION", "SPOTLIGHT HIGHLIGHT", g_conf)

            elif g_name == "OPEN_PALM" and self.consecutive_frames >= 2:
                if self._can_trigger("pres_pause", 0.80):
                    self.kb_ctrl.press("b")  # Black screen toggle in PowerPoint / Google Slides
                    self._log_event("OPEN_PALM", "PAUSE / BLACK SCREEN", g_conf)
                    result_telemetry["action"] = "PAUSE / BLACK SCREEN"

            elif g_name == "THUMB_UP" and self.consecutive_frames >= 2:
                if self._can_trigger("pres_start", 0.80):
                    self.kb_ctrl.start_presentation()
                    self._log_event("THUMB_UP", "START PRESENTATION", g_conf)
                    result_telemetry["action"] = "START PRESENTATION"

        # ==========================================
        # 4. BROWSER MODE
        # ==========================================
        elif self.active_mode == "BROWSER":
            if g_name == "SWIPE_RIGHT":
                if self._can_trigger("tab_next", 0.50):
                    self.kb_ctrl.next_tab()
                    self._log_event("SWIPE_RIGHT", "NEXT TAB (Ctrl+Tab)", g_conf)
                    result_telemetry["action"] = "NEXT TAB"

            elif g_name == "SWIPE_LEFT":
                if self._can_trigger("tab_prev", 0.50):
                    self.kb_ctrl.prev_tab()
                    self._log_event("SWIPE_LEFT", "PREV TAB (Ctrl+Shift+Tab)", g_conf)
                    result_telemetry["action"] = "PREV TAB"

            elif g_name in ["THREE_FINGERS", "SWIPE_UP"]:
                if self._can_trigger("new_tab", 0.60):
                    self.kb_ctrl.new_tab()
                    self._log_event(g_name, "NEW TAB (Ctrl+T)", g_conf)
                    result_telemetry["action"] = "NEW TAB"

            elif g_name in ["FOUR_FINGERS", "SWIPE_DOWN"]:
                if self._can_trigger("close_tab", 0.60):
                    self.kb_ctrl.close_tab()
                    self._log_event(g_name, "CLOSE TAB (Ctrl+W)", g_conf)
                    result_telemetry["action"] = "CLOSE TAB"

            elif g_name == "CIRCULAR_MOTION":
                if self._can_trigger("refresh", 0.80):
                    self.kb_ctrl.refresh_page()
                    self._log_event("CIRCULAR_MOTION", "REFRESH (Ctrl+R)", g_conf)
                    result_telemetry["action"] = "REFRESH"

        # ==========================================
        # 5. ROOM CONTROL MODE (3D Smart Room)
        # ==========================================
        elif self.active_mode == "ROOM_CONTROL":
            if g_name == "OPEN_PALM" and self._can_trigger("rc_light_on", 0.70):
                self._log_event("OPEN_PALM", "LIGHT_ON", g_conf)
                result_telemetry["action"] = "LIGHT_ON"
            elif g_name == "CLOSED_FIST" and self._can_trigger("rc_light_off", 0.70):
                self._log_event("CLOSED_FIST", "LIGHT_OFF", g_conf)
                result_telemetry["action"] = "LIGHT_OFF"
            elif g_name == "INDEX_POINT" and self._can_trigger("rc_fan_on", 0.70):
                self._log_event("INDEX_POINT", "FAN_ON", g_conf)
                result_telemetry["action"] = "FAN_ON"
            elif g_name == "POINT_DOWN" and self._can_trigger("rc_fan_off", 0.70):
                self._log_event("POINT_DOWN", "FAN_OFF", g_conf)
                result_telemetry["action"] = "FAN_OFF"
            elif g_name == "THUMB_UP" and self._can_trigger("rc_door_open", 0.70):
                self._log_event("THUMB_UP", "DOOR_OPEN", g_conf)
                result_telemetry["action"] = "DOOR_OPEN"
            elif g_name == "THUMB_DOWN" and self._can_trigger("rc_door_close", 0.70):
                self._log_event("THUMB_DOWN", "DOOR_CLOSE", g_conf)
                result_telemetry["action"] = "DOOR_CLOSE"
            elif g_name == "VICTORY" and self._can_trigger("rc_tv_toggle", 0.70):
                self._log_event("VICTORY", "TV_TOGGLE", g_conf)
                result_telemetry["action"] = "TV_TOGGLE"
            elif g_name == "ROCK_ON" and self._can_trigger("rc_party", 0.80):
                self._log_event("ROCK_ON", "PARTY_MODE", g_conf)
                result_telemetry["action"] = "PARTY_MODE"

        # ==========================================
        # 6. LIBRARY MODE (Silent Communication)
        # ==========================================
        elif self.active_mode == "LIBRARY":
            if g_name == "OPEN_PALM" and self._can_trigger("lib_quiet", 0.80):
                self._log_event("OPEN_PALM", "PLEASE BE QUIET (SHH)", g_conf)
                result_telemetry["action"] = "PLEASE BE QUIET (SHH)"
            elif g_name == "INDEX_POINT" and self._can_trigger("lib_book", 0.80):
                self._log_event("INDEX_POINT", "NEED BOOK ASSISTANCE", g_conf)
                result_telemetry["action"] = "NEED BOOK ASSISTANCE"
            elif g_name == "THUMB_UP" and self._can_trigger("lib_thanks", 0.80):
                self._log_event("THUMB_UP", "THANK YOU", g_conf)
                result_telemetry["action"] = "THANK YOU"
            elif g_name == "CLOSED_FIST" and self._can_trigger("lib_leaving", 0.80):
                self._log_event("CLOSED_FIST", "LEAVING STUDY DESK", g_conf)
                result_telemetry["action"] = "LEAVING STUDY DESK"

        # ==========================================
        # 7. HOSPITAL MODE (Patient Care)
        # ==========================================
        elif self.active_mode == "HOSPITAL":
            if g_name == "OPEN_PALM" and self._can_trigger("hosp_water", 0.80):
                self._log_event("OPEN_PALM", "NEED DRINKING WATER", g_conf)
                result_telemetry["action"] = "NEED DRINKING WATER"
            elif g_name == "CLOSED_FIST" and self._can_trigger("hosp_pain", 0.80):
                self._log_event("CLOSED_FIST", "PAIN ALERT", g_conf)
                result_telemetry["action"] = "PAIN ALERT"
            elif g_name == "INDEX_POINT" and self._can_trigger("hosp_nurse", 0.80):
                self._log_event("INDEX_POINT", "CALL NURSE ASSISTANCE", g_conf)
                result_telemetry["action"] = "CALL NURSE ASSISTANCE"
            elif g_name == "ROCK_ON" and self._can_trigger("hosp_emergency", 1.00):
                self._log_event("ROCK_ON", "EMERGENCY ALARM", g_conf)
                result_telemetry["action"] = "EMERGENCY ALARM"

        # ==========================================
        # 8. COMMUNICATION MODE (Speech & Sign)
        # ==========================================
        elif self.active_mode == "COMMUNICATION":
            if g_name == "OPEN_PALM" and self._can_trigger("comm_hello", 0.80):
                self._log_event("OPEN_PALM", "HELLO / GREETINGS", g_conf)
                result_telemetry["action"] = "HELLO / GREETINGS"
            elif g_name == "THUMB_UP" and self._can_trigger("comm_yes", 0.80):
                self._log_event("THUMB_UP", "YES / I AGREE", g_conf)
                result_telemetry["action"] = "YES / I AGREE"
            elif g_name == "THUMB_DOWN" and self._can_trigger("comm_no", 0.80):
                self._log_event("THUMB_DOWN", "NO / I DISAGREE", g_conf)
                result_telemetry["action"] = "NO / I DISAGREE"
            elif g_name == "INDEX_POINT" and self._can_trigger("comm_want", 0.80):
                self._log_event("INDEX_POINT", "I WANT THIS", g_conf)
                result_telemetry["action"] = "I WANT THIS"
            elif g_name == "OK_SIGN" and self._can_trigger("comm_ok", 0.80):
                self._log_event("OK_SIGN", "UNDERSTOOD / OK", g_conf)
                result_telemetry["action"] = "UNDERSTOOD / OK"

        # ==========================================
        # 9. SPACE MODE (Astronaut Telemetry)
        # ==========================================
        elif self.active_mode == "SPACE":
            if g_name == "THUMB_UP" and self._can_trigger("sp_ox", 0.80):
                self._log_event("THUMB_UP", "OXYGEN NOMINAL", g_conf)
                result_telemetry["action"] = "OXYGEN NOMINAL"
            elif g_name == "INDEX_POINT" and self._can_trigger("sp_thrust", 0.80):
                self._log_event("INDEX_POINT", "FIRE RCS THRUSTER", g_conf)
                result_telemetry["action"] = "FIRE RCS THRUSTER"
            elif g_name == "CLOSED_FIST" and self._can_trigger("sp_hold", 0.80):
                self._log_event("CLOSED_FIST", "HOLD STATION", g_conf)
                result_telemetry["action"] = "HOLD STATION"
            elif g_name == "OPEN_PALM" and self._can_trigger("sp_airlock", 0.80):
                self._log_event("OPEN_PALM", "AIRLOCK SECURE", g_conf)
                result_telemetry["action"] = "AIRLOCK SECURE"
            elif g_name == "WAVE" and self._can_trigger("sp_radio", 0.80):
                self._log_event("WAVE", "RADIO COMMS PING", g_conf)
                result_telemetry["action"] = "RADIO COMMS PING"

        # ==========================================
        # 10. CUSTOM MODE
        # ==========================================
        elif self.active_mode == "CUSTOM":
            act = self._execute_custom_gesture(g_name, g_conf)
            if act:
                result_telemetry["action"] = act

        return result_telemetry

    def _execute_custom_gesture(self, gesture_name: str, confidence: float) -> Optional[str]:
        """Looks up user-defined custom mapping and triggers corresponding automation."""
        mapping = custom_registry.find_action_for_gesture(gesture_name)
        if not mapping:
            return None

        action_id = mapping.get("id", gesture_name)
        if not self._can_trigger(action_id, 0.80):
            return None

        act_type = mapping.get("action_type")
        target = mapping.get("target", "")
        name = mapping.get("name", gesture_name)

        if act_type == "app":
            self.sys_ctrl.launch_app(target)
            self._log_event(gesture_name, f"LAUNCH {target.upper()}", confidence)
            return f"LAUNCH {target.upper()}"
        elif act_type == "system":
            if target == "screenshot":
                saved = self.sys_ctrl.take_screenshot()
                self._log_event(gesture_name, "SCREENSHOT CAPTURED", confidence)
                return "SCREENSHOT CAPTURED"
            elif target == "lock":
                self.sys_ctrl.lock_computer()
                self._log_event(gesture_name, "LOCK COMPUTER", confidence)
                return "LOCK COMPUTER"
            elif target == "desktop":
                self.win_ctrl.show_desktop()
                self._log_event(gesture_name, "SHOW DESKTOP", confidence)
                return "SHOW DESKTOP"
        elif act_type == "hotkey":
            keys = [k.strip() for k in target.split("+")]
            self.kb_ctrl.hotkey(*keys)
            self._log_event(gesture_name, f"HOTKEY {target}", confidence)
            return f"HOTKEY {target}"

        return None
