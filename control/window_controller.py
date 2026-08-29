"""
AirOS Window Controller
Manages window switching, minimizing, snapping, and desktop display.
"""
import pyautogui
import logging

logger = logging.getLogger("AirOS.WindowController")


class WindowController:
    @staticmethod
    def show_desktop():
        """Minimizes all windows and shows desktop (Win+D)."""
        pyautogui.hotkey("win", "d")
        logger.info("Show desktop triggered")

    @staticmethod
    def task_view():
        """Opens Windows Task View (Win+Tab)."""
        pyautogui.hotkey("win", "tab")
        logger.info("Task view triggered")

    @staticmethod
    def switch_app():
        """Switches between active applications (Alt+Tab)."""
        pyautogui.hotkey("alt", "tab")
        logger.info("Switch app triggered")

    @staticmethod
    def snap_left():
        """Snaps active window to left half of screen (Win+Left)."""
        pyautogui.hotkey("win", "left")

    @staticmethod
    def snap_right():
        """Snaps active window to right half of screen (Win+Right)."""
        pyautogui.hotkey("win", "right")

    @staticmethod
    def maximize_window():
        """Maximizes active window (Win+Up)."""
        pyautogui.hotkey("win", "up")

    @staticmethod
    def minimize_window():
        """Minimizes active window (Win+Down)."""
        pyautogui.hotkey("win", "down")
