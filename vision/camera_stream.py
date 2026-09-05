"""
AirOS Threaded Camera Stream
Provides high-FPS, low-latency threaded frame capture from the webcam,
device enumeration, auto-recovery, and synthetic frame generation for testing.
"""
import cv2
import time
import threading
import numpy as np
import logging
from typing import Optional, Tuple, List, Dict, Any
from core.config import config_mgr

logger = logging.getLogger("AirOS.CameraStream")


class CameraStream:
    def __init__(self, device_index: int = 0, width: int = 640, height: int = 480, fps: int = 30, mirror: bool = True):
        self.device_index = device_index
        self.width = width
        self.height = height
        self.target_fps = fps
        self.mirror = mirror

        self.cap: Optional[cv2.VideoCapture] = None
        self.current_frame: Optional[np.ndarray] = None
        self.raw_frame: Optional[np.ndarray] = None
        self.frame_time: float = 0.0
        self.fps: float = 0.0

        self._running: bool = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._connected: bool = False
        self._frame_count: int = 0
        self._fps_timer: float = time.time()
        self._last_error: Optional[str] = None
        self._is_synthetic: bool = False

    def start(self) -> bool:
        """Starts the background capture thread."""
        if self._running:
            return True

        self._running = True
        self._thread = threading.Thread(target=self._capture_loop, name="CameraCaptureThread", daemon=True)
        self._thread.start()
        logger.info("CameraStream thread started for device %d", self.device_index)
        return True

    def stop(self) -> None:
        """Stops the camera stream and releases resources."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
        self._release_capture()
        logger.info("CameraStream stopped")

    def _open_capture(self) -> bool:
        """Attempts to open the video capture device."""
        if not config_mgr.get("camera", {}).get("enabled", True):
            self._connected = False
            return False

        try:
            # On Windows, cv2.CAP_DSHOW provides fast initialization and reliable resolution setting
            self.cap = cv2.VideoCapture(self.device_index, cv2.CAP_DSHOW)
            if not self.cap or not self.cap.isOpened():
                # Fallback to default backend
                self.cap = cv2.VideoCapture(self.device_index)

            if self.cap and self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                self.cap.set(cv2.CAP_PROP_FPS, self.target_fps)
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize internal latency buffer
                self._connected = True
                self._is_synthetic = False
                self._last_error = None
                logger.info("Successfully opened webcam index %d (%dx%d)", self.device_index, self.width, self.height)
                return True
            else:
                raise RuntimeError(f"Cannot open camera index {self.device_index}")
        except Exception as e:
            self._connected = False
            self._last_error = str(e)
            logger.warning("Camera open failed: %s. Enabling synthetic standby frame generator.", e)
            self._is_synthetic = True
            return False

    def _release_capture(self) -> None:
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        self._connected = False

    def _capture_loop(self) -> None:
        """Thread loop continuously reading latest frames."""
        self._open_capture()
        failed_reads = 0

        while self._running:
            if self._connected and self.cap and self.cap.isOpened():
                ret, frame = self.cap.read()
                if ret and frame is not None:
                    failed_reads = 0
                    if self.mirror:
                        frame = cv2.flip(frame, 1)  # Mirror horizontally for natural interaction

                    with self._lock:
                        self.raw_frame = frame
                        self.current_frame = frame.copy()
                        self.frame_time = time.time()
                        self._frame_count += 1

                    # Compute rolling FPS
                    now = time.time()
                    elapsed = now - self._fps_timer
                    if elapsed >= 1.0:
                        self.fps = self._frame_count / elapsed
                        self._frame_count = 0
                        self._fps_timer = now
                else:
                    failed_reads += 1
                    time.sleep(0.05)
                    if failed_reads >= 10:
                        logger.warning("Multiple failed frame reads from camera device. Reconnecting...")
                        self._release_capture()
                        time.sleep(0.5)
                        self._open_capture()
                        failed_reads = 0
            else:
                # Standby synthetic frame generation if camera is disconnected or unavailable
                frame = self._generate_synthetic_frame()
                with self._lock:
                    self.current_frame = frame
                    self.frame_time = time.time()
                    self.fps = 30.0

                # Periodically attempt reconnect if hardware camera is enabled in config
                time.sleep(0.033)
                if config_mgr.get("camera", {}).get("enabled", True) and int(time.time()) % 3 == 0 and not self._connected:
                    self._open_capture()

    def _generate_synthetic_frame(self) -> np.ndarray:
        """Generates a calm standby frame when webcam is managed by browser."""
        img = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        img[:, :] = (18, 14, 10) # Smooth solid dark background

        cv2.putText(img, "AirOS Engine Active", (self.width // 2 - 130, self.height // 2 - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 240, 255), 2, cv2.LINE_AA)
        cv2.putText(img, "Webcam Active in Browser (60 FPS MediaPipe)", (self.width // 2 - 200, self.height // 2 + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180, 180, 180), 1, cv2.LINE_AA)
        return img

    def get_frame(self) -> Tuple[bool, Optional[np.ndarray], float]:
        """Returns (is_connected, latest_bgr_frame, current_fps)."""
        with self._lock:
            if self.current_frame is not None:
                return (self._connected and not self._is_synthetic, self.current_frame.copy(), self.fps)
            return (False, None, 0.0)

    def change_device(self, new_index: int) -> bool:
        """Switches to another camera device index."""
        logger.info("Switching camera to index %d", new_index)
        self.device_index = new_index
        self._release_capture()
        return self._open_capture()

    @staticmethod
    def list_available_cameras(max_tested: int = 4) -> List[Dict[str, Any]]:
        """Scans for available video capture devices."""
        available = []
        for i in range(max_tested):
            try:
                temp_cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
                if not temp_cap or not temp_cap.isOpened():
                    temp_cap = cv2.VideoCapture(i)
                if temp_cap and temp_cap.isOpened():
                    w = int(temp_cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                    h = int(temp_cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                    available.append({
                        "index": i,
                        "name": f"Camera {i} ({w}x{h})",
                        "width": w,
                        "height": h
                    })
                    temp_cap.release()
            except Exception:
                pass
        return available if available else [{"index": 0, "name": "Default Webcam (Auto)", "width": 640, "height": 480}]
