"""
AirOS System Controller
Handles screen brightness, screenshots, workstation locking, and application launching.
"""
import os
import time
import ctypes
import subprocess
import logging
from datetime import datetime
logger = logging.getLogger("AirOS.SystemController")

# Silence noisy EDID parsing warnings from screen_brightness_control
logging.getLogger("screen_brightness_control").setLevel(logging.ERROR)
logging.getLogger("screen_brightness_control.windows").setLevel(logging.ERROR)


class SystemController:
    _cached_brightness: int = 70
    _last_brightness_check: float = 0.0

    @classmethod
    def get_brightness(cls) -> int:
        """Returns primary display brightness (0 - 100) with 5-second caching."""
        now = time.time()
        # Only query hardware every 5 seconds to avoid WMI/EDID polling overhead
        if (now - cls._last_brightness_check) < 5.0:
            return cls._cached_brightness

        cls._last_brightness_check = now
        try:
            import screen_brightness_control as sbc
            val = sbc.get_brightness()
            if isinstance(val, list) and len(val) > 0:
                cls._cached_brightness = int(val[0])
            elif isinstance(val, int):
                cls._cached_brightness = val
        except Exception:
            pass
        return cls._cached_brightness

    @classmethod
    def set_brightness(cls, percentage: int) -> int:
        """Sets screen brightness (0 - 100)."""
        clamped = max(0, min(100, percentage))
        cls._cached_brightness = clamped
        cls._last_brightness_check = time.time()
        try:
            import screen_brightness_control as sbc
            sbc.set_brightness(clamped)
            logger.info("Set display brightness to %d%%", clamped)
            return clamped
        except Exception as e:
            logger.debug("Brightness control unavailable: %s", e)
            return clamped

    @staticmethod
    def brightness_up(step: int = 10) -> int:
        """Increases screen brightness."""
        curr = SystemController.get_brightness()
        return SystemController.set_brightness(curr + step)

    @staticmethod
    def brightness_down(step: int = 10) -> int:
        """Decreases screen brightness."""
        curr = SystemController.get_brightness()
        return SystemController.set_brightness(curr - step)

    @staticmethod
    def take_screenshot() -> Optional[str]:
        """Captures full screen and saves to user Pictures folder."""
        try:
            import pyautogui
            user_pictures = os.path.join(os.path.expanduser("~"), "Pictures", "AirOS_Screenshots")
            os.makedirs(user_pictures, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"AirOS_Shot_{timestamp}.png"
            full_path = os.path.join(user_pictures, filename)

            screenshot = pyautogui.screenshot()
            screenshot.save(full_path)
            logger.info("Saved screenshot to: %s", full_path)
            return full_path
        except Exception as e:
            logger.error("Screenshot failed: %s", e)
            return None

    @staticmethod
    def lock_computer():
        """Locks the Windows workstation."""
        try:
            ctypes.windll.user32.LockWorkStation()
            logger.info("Workstation locked successfully")
        except Exception as e:
            logger.error("Failed to lock workstation: %s", e)

    @staticmethod
    def launch_app(app_target: str):
        """
        Launches an application by keyword or executable path.
        Supported keywords: 'spotify', 'terminal', 'powershell', 'chrome', 'edge', 'notepad', 'calc', 'vscode'.
        """
        target_lower = app_target.lower().strip()
        try:
            if target_lower == "spotify":
                subprocess.Popen(["cmd", "/c", "start", "spotify:"])
            elif target_lower in ["terminal", "cmd"]:
                subprocess.Popen(["cmd", "/c", "start", "wt.exe"], shell=False) or subprocess.Popen(["cmd.exe"])
            elif target_lower == "powershell":
                subprocess.Popen(["powershell.exe"])
            elif target_lower in ["chrome", "browser"]:
                subprocess.Popen(["cmd", "/c", "start", "chrome"]) or subprocess.Popen(["cmd", "/c", "start", "msedge"])
            elif target_lower == "edge":
                subprocess.Popen(["cmd", "/c", "start", "msedge"])
            elif target_lower == "notepad":
                subprocess.Popen(["notepad.exe"])
            elif target_lower in ["calc", "calculator"]:
                subprocess.Popen(["calc.exe"])
            elif target_lower in ["vscode", "code"]:
                subprocess.Popen(["cmd", "/c", "code"])
            else:
                # Direct command execution
                subprocess.Popen(app_target, shell=True)
            logger.info("Launched application: %s", app_target)
        except Exception as e:
            logger.error("Failed to launch application '%s': %s", app_target, e)
