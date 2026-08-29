"""
AirOS FastAPI Web & WebSocket Server
Serves the Glassmorphism Desktop Dashboard, REST management APIs, and 30-60 FPS real-time telemetry WebSocket stream.
"""
import os
import asyncio
import logging
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import time
import ctypes
import pyautogui

from core.config import config_mgr
from core.airos_engine import airos_engine
from vision.camera_stream import CameraStream
from gestures.custom_gestures import custom_registry
from gestures.gesture_training import gesture_trainer

logger = logging.getLogger("AirOS.Server")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app = FastAPI(title="AirOS Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def generate_mjpeg_frames():
    """Generates continuous MJPEG video stream frames for /video_feed."""
    while True:
        try:
            connected, frame, _ = airos_engine.camera.get_frame()
            if frame is not None:
                ret, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
                if ret:
                    yield (b"--frame\r\n"
                           b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")
        except Exception:
            pass
        time.sleep(0.033)


@app.get("/video_feed")
async def video_feed():
    """MJPEG webcam video feed for standard img tags."""
    return StreamingResponse(
        generate_mjpeg_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


# --- Data Models ---
class ModeRequest(BaseModel):
    mode: str


class CameraSelectRequest(BaseModel):
    index: int


class ConfigUpdateRequest(BaseModel):
    section: str
    values: Dict[str, Any]


class CalibrationRequest(BaseModel):
    top_left: List[float]
    top_right: List[float]
    bottom_right: List[float]
    bottom_left: List[float]


class CustomGestureRequest(BaseModel):
    id: str
    name: str
    gesture: str
    action_type: str
    target: str
    description: Optional[str] = ""


class TrainingStartRequest(BaseModel):
    gesture_name: str
    samples: int = 15


class ActionExecuteRequest(BaseModel):
    action: str
    target: Optional[str] = ""


# --- WebSocket Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("Client connected to telemetry stream. Total active: %d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("Client disconnected. Total active: %d", len(self.active_connections))

    def broadcast_sync(self, message: Dict[str, Any]):
        """Called from the CV thread to broadcast telemetry to WebSocket clients."""
        if not self.active_connections or not self._loop:
            return

        async def _send_all():
            for connection in list(self.active_connections):
                try:
                    await connection.send_json(message)
                except Exception:
                    self.disconnect(connection)

        asyncio.run_coroutine_threadsafe(_send_all(), self._loop)


ws_manager = ConnectionManager()


@app.on_event("startup")
async def startup_event():
    loop = asyncio.get_running_loop()
    ws_manager.set_loop(loop)
    airos_engine.add_telemetry_listener(ws_manager.broadcast_sync)
    airos_engine.start()
    logger.info("AirOS Engine started and WebSocket broadcaster connected.")


@app.on_event("shutdown")
async def shutdown_event():
    airos_engine.stop()


# --- Static Routes ---
@app.get("/")
async def get_index():
    dist_index = os.path.join(STATIC_DIR, "dist", "index.html")
    if os.path.exists(dist_index):
        return FileResponse(dist_index)
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse({"status": "Agent 44 UI Loading..."})


# --- REST API Endpoints ---
@app.get("/api/status")
async def get_status():
    return {
        "status": "online",
        "mode": airos_engine.intent_engine.active_mode,
        "fps": airos_engine.camera.fps,
        "camera_connected": airos_engine.camera._connected,
        "calibrated": config_mgr.get("calibration", {}).get("calibrated", False),
        "is_model_trained": gesture_trainer.is_trained,
        "trained_classes": gesture_trainer.classes,
        "model_accuracy": round(gesture_trainer.accuracy * 100, 1)
    }


@app.post("/api/mode")
async def set_mode(req: ModeRequest):
    new_mode = airos_engine.intent_engine.set_mode(req.mode)
    return {"success": True, "active_mode": new_mode}


@app.get("/api/cameras")
async def list_cameras():
    cams = CameraStream.list_available_cameras()
    return {"cameras": cams, "current_index": airos_engine.camera.device_index}


@app.post("/api/camera/select")
async def select_camera(req: CameraSelectRequest):
    success = airos_engine.camera.change_device(req.index)
    if success:
        config_mgr.update_section("camera", {"device_index": req.index})
    return {"success": success, "current_index": req.index}


@app.get("/api/config")
async def get_config():
    return config_mgr.config


@app.post("/api/config")
async def update_config(req: ConfigUpdateRequest):
    updated = config_mgr.update_section(req.section, req.values)
    # Apply live changes
    if req.section == "mouse":
        airos_engine.intent_engine.mouse_ctrl.smoothing = float(req.values.get("smoothing_factor", 0.65))
        airos_engine.intent_engine.mouse_ctrl.sensitivity_x = float(req.values.get("sensitivity_x", 1.4))
        airos_engine.intent_engine.mouse_ctrl.sensitivity_y = float(req.values.get("sensitivity_y", 1.4))
    return {"success": True, "section": req.section, "values": updated}


@app.post("/api/calibration")
async def set_calibration(req: CalibrationRequest):
    calib_data = {
        "calibrated": True,
        "top_left": req.top_left,
        "top_right": req.top_right,
        "bottom_right": req.bottom_right,
        "bottom_left": req.bottom_left
    }
    config_mgr.set("calibration", calib_data)
    airos_engine.intent_engine.mouse_ctrl.set_calibration(
        top_left=tuple(req.top_left),
        top_right=tuple(req.top_right),
        bottom_right=tuple(req.bottom_right),
        bottom_left=tuple(req.bottom_left)
    )
    return {"success": True, "calibration": calib_data}


@app.get("/api/history")
async def get_history():
    return {"history": airos_engine.intent_engine.get_history()}


@app.post("/api/history/clear")
async def clear_history():
    airos_engine.intent_engine.clear_history()
    return {"success": True}


@app.get("/api/custom-gestures")
async def get_custom_gestures():
    return {"gestures": custom_registry.get_all()}


@app.post("/api/custom-gestures")
async def add_custom_gesture(req: CustomGestureRequest):
    item = custom_registry.add_or_update(
        gesture_id=req.id,
        name=req.name,
        gesture_name=req.gesture,
        action_type=req.action_type,
        target=req.target,
        description=req.description or ""
    )
    return {"success": True, "gesture": item}


@app.delete("/api/custom-gestures/{gesture_id}")
async def delete_custom_gesture(gesture_id: str):
    res = custom_registry.delete(gesture_id)
    return {"success": res}


@app.post("/api/training/start")
async def start_training(req: TrainingStartRequest):
    airos_engine.intent_engine.set_mode("TRAINING")
    gesture_trainer.start_recording(req.gesture_name, req.samples)
    return {"success": True, "gesture_name": req.gesture_name, "target_samples": req.samples}


@app.post("/api/training/cancel")
async def cancel_training():
    gesture_trainer.cancel_recording()
    return {"success": True}


@app.post("/api/training/train")
async def train_model():
    result = gesture_trainer.train_model()
    return result


@app.get("/api/training/dataset")
async def get_training_dataset():
    summary = {k: len(v) for k, v in gesture_trainer.dataset.items()}
    return {
        "classes": summary,
        "total_classes": len(summary),
        "is_trained": gesture_trainer.is_trained,
        "model_accuracy": round(gesture_trainer.accuracy * 100, 1),
        "active_classes": gesture_trainer.classes
    }


@app.delete("/api/training/gesture/{name}")
async def delete_training_gesture(name: str):
    res = gesture_trainer.delete_gesture_data(name)
    return {"success": res}


@app.post("/api/action/execute")
async def execute_action(req: ActionExecuteRequest):
    """Allows manual testing of actions from UI / Demo mode."""
    action = req.action
    target = req.target
    intent = airos_engine.intent_engine

    if action == "left_click":
        intent.mouse_ctrl.left_click()
    elif action == "right_click":
        intent.mouse_ctrl.right_click()
    elif action == "media_play_pause":
        intent.media_ctrl.play_pause()
    elif action == "media_next":
        intent.media_ctrl.next_track()
    elif action == "media_prev":
        intent.media_ctrl.prev_track()
    elif action == "volume_up":
        intent.media_ctrl.volume_up(5)
    elif action == "volume_down":
        intent.media_ctrl.volume_down(5)
    elif action == "next_tab":
        intent.kb_ctrl.next_tab()
    elif action == "prev_tab":
        intent.kb_ctrl.prev_tab()
    elif action == "next_slide":
        intent.kb_ctrl.next_slide()
    elif action == "prev_slide":
        intent.kb_ctrl.prev_slide()
    elif action == "screenshot":
        intent.sys_ctrl.take_screenshot()
    elif action == "show_desktop":
        intent.win_ctrl.show_desktop()
    elif action == "launch_app":
        intent.sys_ctrl.launch_app(target or "spotify")

    return {"success": True, "action": action}


# --- Native OS & PyAutoGUI Hardware Control Endpoints ---
class CursorMoveRequest(BaseModel):
    x: Optional[int] = None
    y: Optional[int] = None
    norm_x: Optional[float] = None
    norm_y: Optional[float] = None

class ClickRequest(BaseModel):
    button: str = "left"

class HotkeyRequest(BaseModel):
    keys: List[str]


@app.get("/api/status")
async def get_api_status():
    """Heartbeat endpoint for frontend to check if real OS PyAutoGUI control is available."""
    return {"status": "online", "pyautogui": True, "os": "windows"}


@app.post("/api/control/move")
async def control_move(req: CursorMoveRequest):
    """Physically moves the real Windows operating system cursor using SetCursorPos / PyAutoGUI."""
    try:
        if req.x is not None and req.y is not None:
            ctypes.windll.user32.SetCursorPos(int(req.x), int(req.y))
        elif req.norm_x is not None and req.norm_y is not None:
            screen_w, screen_h = pyautogui.size()
            target_x = max(0, min(screen_w - 1, int(req.norm_x * screen_w)))
            target_y = max(0, min(screen_h - 1, int(req.norm_y * screen_h)))
            ctypes.windll.user32.SetCursorPos(target_x, target_y)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/control/click")
async def control_click(req: ClickRequest):
    """Executes a real physical Windows left or right click."""
    try:
        if req.button == "right":
            airos_engine.intent_engine.mouse_ctrl.right_click()
        else:
            airos_engine.intent_engine.mouse_ctrl.left_click()
        return {"success": True, "button": req.button}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/control/hotkey")
async def control_hotkey(req: HotkeyRequest):
    """Dispatches native Windows hotkeys (Win+D, Alt+Tab, etc.)."""
    try:
        pyautogui.hotkey(*req.keys)
        return {"success": True, "keys": req.keys}
    except Exception as e:
        return {"success": False, "error": str(e)}


# --- WebSocket Telemetry Stream ---
@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Handle incoming client commands via WebSocket if any
            data = await websocket.receive_json()
            if data.get("command") == "set_mode":
                airos_engine.intent_engine.set_mode(data.get("mode", "CURSOR"))
            elif data.get("command") == "toggle_landmarks":
                show = data.get("show", True)
                config_mgr.update_section("appearance", {"show_landmarks": show})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.debug("WebSocket exception: %s", e)
        ws_manager.disconnect(websocket)


# Mount static assets directory
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
