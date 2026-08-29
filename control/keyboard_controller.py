"""
AirOS Keyboard Controller
Dispatches keyboard shortcuts, browser actions, zoom commands, and presentation hotkeys.
"""
import pyautogui
import logging
from typing import List

logger = logging.getLogger("AirOS.KeyboardController")


class KeyboardController:
    @staticmethod
    def hotkey(*keys: str):
        """Executes a key combination (e.g. 'ctrl', 't')."""
        try:
            pyautogui.hotkey(*keys)
            logger.info("Executed hotkey: %s", "+".join(keys))
        except Exception as e:
            logger.error("Hotkey failed: %s", e)

    @staticmethod
    def press(key: str):
        """Presses a single key (e.g. 'enter', 'esc', 'space', 'right')."""
        try:
            pyautogui.press(key)
            logger.info("Pressed key: %s", key)
        except Exception as e:
            logger.error("Key press failed: %s", e)

    # --- Browser Shortcuts ---
    @staticmethod
    def next_tab():
        """Switches to the next browser tab (Ctrl+Tab)."""
        pyautogui.hotkey("ctrl", "tab")

    @staticmethod
    def prev_tab():
        """Switches to the previous browser tab (Ctrl+Shift+Tab)."""
        pyautogui.hotkey("ctrl", "shift", "tab")

    @staticmethod
    def new_tab():
        """Opens a new browser tab (Ctrl+T)."""
        pyautogui.hotkey("ctrl", "t")

    @staticmethod
    def close_tab():
        """Closes the current browser tab (Ctrl+W)."""
        pyautogui.hotkey("ctrl", "w")

    @staticmethod
    def refresh_page():
        """Refreshes the current page (Ctrl+R or F5)."""
        pyautogui.press("f5")

    # --- Presentation Shortcuts ---
    @staticmethod
    def next_slide():
        """Advances to the next presentation slide (Right arrow / Space)."""
        pyautogui.press("right")

    @staticmethod
    def prev_slide():
        """Goes back to the previous presentation slide (Left arrow)."""
        pyautogui.press("left")

    @staticmethod
    def start_presentation():
        """Starts slideshow (F5)."""
        pyautogui.press("f5")

    @staticmethod
    def exit_presentation():
        """Exits slideshow (Escape)."""
        pyautogui.press("esc")

    # --- Zoom Shortcuts ---
    @staticmethod
    def zoom_in():
        """Zooms in (Ctrl + Plus)."""
        pyautogui.hotkey("ctrl", "+")

    @staticmethod
    def zoom_out():
        """Zooms out (Ctrl + Minus)."""
        pyautogui.hotkey("ctrl", "-")

    @staticmethod
    def zoom_reset():
        """Resets zoom (Ctrl + 0)."""
        pyautogui.hotkey("ctrl", "0")
