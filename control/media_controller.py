"""
AirOS Media Controller
Controls system audio volume, mute toggle, and media playback (Play/Pause, Next, Prev)
using pycaw on Windows with native media key fallbacks.
"""
import pyautogui
import logging
from typing import Optional

logger = logging.getLogger("AirOS.MediaController")


class MediaController:
    def __init__(self):
        self._volume_endpoint = None
        self._init_pycaw()

    def _init_pycaw(self):
        """Initializes pycaw audio endpoint for precise volume control."""
        try:
            from pycaw.pycaw import AudioUtilities
            speakers = AudioUtilities.GetSpeakers()
            if speakers:
                self._volume_endpoint = speakers.EndpointVolume
                logger.info("Initialized pycaw master volume control endpoint.")
        except Exception as e:
            logger.warning("pycaw initialization failed (%s). Using fallback media keys.", e)
            self._volume_endpoint = None

    def get_volume(self) -> int:
        """Returns current master volume as an integer percentage (0 - 100)."""
        if self._volume_endpoint:
            try:
                scalar = self._volume_endpoint.GetMasterVolumeLevelScalar()
                return int(round(scalar * 100))
            except Exception:
                pass
        return 50

    def set_volume(self, percentage: int) -> int:
        """Sets master volume percentage (0 - 100)."""
        clamped = max(0, min(100, percentage))
        if self._volume_endpoint:
            try:
                self._volume_endpoint.SetMasterVolumeLevelScalar(clamped / 100.0, None)
                logger.info("Set master volume to %d%%", clamped)
                return clamped
            except Exception as e:
                logger.error("Failed to set volume scalar: %s", e)
        return clamped

    def volume_up(self, step: int = 5) -> int:
        """Increases volume by step percentage."""
        if self._volume_endpoint:
            current = self.get_volume()
            return self.set_volume(current + step)
        else:
            pyautogui.press("volumeup")
            return 0

    def volume_down(self, step: int = 5) -> int:
        """Decreases volume by step percentage."""
        if self._volume_endpoint:
            current = self.get_volume()
            return self.set_volume(current - step)
        else:
            pyautogui.press("volumedown")
            return 0

    def toggle_mute(self) -> bool:
        """Toggles audio mute state."""
        if self._volume_endpoint:
            try:
                muted = bool(self._volume_endpoint.GetMute())
                new_state = not muted
                self._volume_endpoint.SetMute(new_state, None)
                logger.info("Toggled mute: %s", new_state)
                return new_state
            except Exception:
                pass
        pyautogui.press("volumemute")
        return False

    # --- Media Playback ---
    @staticmethod
    def play_pause():
        """Toggles media play/pause."""
        pyautogui.press("playpause")
        logger.info("Media Play/Pause triggered")

    @staticmethod
    def next_track():
        """Skips to next media track."""
        pyautogui.press("nexttrack")
        logger.info("Next Track triggered")

    @staticmethod
    def prev_track():
        """Goes to previous media track."""
        pyautogui.press("prevtrack")
        logger.info("Previous Track triggered")
