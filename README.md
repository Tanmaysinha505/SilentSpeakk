# AirOS — Touchless Gesture-Controlled Computer Interface 🚀

> **AirOS turns your standard webcam into a high-precision, touchless computer interaction layer.**

AirOS enables complete mouse navigation, click debouncing, media control, browser switching, presentation laser pointing, and custom AI-trained gesture automation using natural hand movements captured through a local webcam.

---

## 🌟 Key Features

1. **Precision Air Mouse & Smart Filtering**:
   - Cursor tracks index fingertip with adaptive Exponential Moving Average (EMA) smoothing to eliminate camera jitter while preserving fast responsiveness.
   - 4-Corner Active Reach Calibration: ergonomically maps your comfortable physical hand reach to the entire screen.
2. **Robust Safety & Debouncing**:
   - Multi-state debouncing state machine (`IDLE` -> `ENGAGED` -> `TRIGGERED` -> `COOLDOWN`) prevents duplicate clicks and rapid multi-firing.
3. **Multi-Mode Interaction**:
   - 🖱️ **Cursor Mode**: Air mouse, pinch click, two-finger pinch right-click, scroll up/down, zoom in/out.
   - 🎵 **Media Mode**: Open palm play/pause, swipe next/prev track, rotate hand clockwise/counter-clockwise for continuous master volume control (+/- 5%), fist to mute.
   - 📽️ **Presentation Mode**: Swipe next/prev slide, index pointing virtual laser pointer HUD, circular gesture spotlight highlight.
   - 🌐 **Browser Mode**: Swipe right/left to switch tabs (`Ctrl+Tab`, `Ctrl+Shift+Tab`), 3 fingers up for new tab (`Ctrl+T`), 4 fingers down to close tab (`Ctrl+W`), circular gesture to refresh (`Ctrl+R`).
   - ⚡ **Custom Mode**: User-defined shortcuts (e.g. Rock-On to launch Spotify, Peace sign for screenshot, Thumb Up to lock computer).
   - 🧠 **Training Mode**: "Teach AirOS" interactive AI studio.
4. **Teach AirOS — On-Device Custom Gesture Training**:
   - Collects 63-dimensional translation- and scale-invariant normalized 3D hand landmark vectors.
   - Trains a local Scikit-Learn Random Forest / KNN classifier directly on your machine in seconds.
   - Reports live validation accuracy (e.g. 96.5%) and binds newly learned poses to applications, hotkeys, or shell scripts.
5. **Hackathon Demo Mode**:
   - Built-in 7-step guided interactive walkthrough with celebration cues, live gesture verification, and manual step advance for seamless live stage presentations.
6. **100% On-Device Privacy**:
   - All computer vision, landmark extraction, and ML training run locally on CPU/GPU. No video frames or biometric data leave the device.

---

## 🏗️ Architecture

```text
AirOS/
│
├── vision/
│   ├── camera_stream.py       # High-FPS threaded camera capture & device enumeration
│   ├── hand_detector.py       # MediaPipe Tasks HandLandmarker (21 3D landmarks)
│   ├── landmark_processor.py  # Kinematics, angles, finger extension & normalization
│   ├── gesture_recognizer.py  # Rule-based static gesture classification with confidence
│   └── motion_recognizer.py   # Multi-frame dynamic motion tracker (swipes, rotations, waves, circles)
│
├── control/
│   ├── mouse_controller.py    # Air mouse smoothing, 4-corner calibration & clicks
│   ├── keyboard_controller.py # Keystroke emulation & browser/zoom/presentation shortcuts
│   ├── media_controller.py    # Windows pycaw master volume & media key dispatch
│   ├── window_controller.py   # Window snapping, minimize, task view & Alt+Tab
│   └── system_controller.py   # Display brightness, screenshots & app launching
│
├── gestures/
│   ├── default_gestures.py    # Mode gesture specs & action mappings
│   ├── custom_gestures.py     # JSON persistence for custom gesture bindings
│   └── gesture_training.py    # Scikit-learn Classifier training & inference
│
├── core/
│   ├── config.py              # Persistent JSON configuration manager
│   ├── intent_engine.py       # Debouncing state machine & mode dispatcher
│   └── airos_engine.py        # Real-time background orchestrator thread
│
├── ui/
│   ├── server.py              # FastAPI server, REST routes & WebSocket broadcaster
│   └── static/
│       ├── index.html         # Futuristic dark glassmorphism dashboard
│       ├── css/styles.css     # Cyberpunk UI design system & high-contrast theme
│       └── js/
│           ├── visualizer.js  # 21-point skeleton & laser pointer canvas renderer
│           ├── calibration.js # 4-corner interactive calibration wizard
│           ├── training.js    # Teach AirOS recording studio interface
│           ├── demo.js        # 7-step guided presentation demo tour
│           └── app.js         # Main WebSocket manager & HUD controller
│
├── main.py                    # Application launcher
├── run.bat                    # Windows one-click starter
├── hand_landmarker.task       # MediaPipe official model
└── requirements.txt           # Dependency manifest
```

---

## 🚀 Quick Start (Windows 11)

### 1. Prerequisites
Ensure you have Python 3.10+ installed.

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run AirOS
Simply double-click `run.bat` or run:
```bash
python main.py
```
This boots the computer vision engine, starts the FastAPI server, and opens your default browser at `http://127.0.0.1:8000`.

---

## ✋ Gesture Quick Reference

| Mode | Gesture | Action |
| :--- | :--- | :--- |
| **CURSOR** | `INDEX_POINT` | Move Mouse Cursor |
| **CURSOR** | `PINCH` | Left Click (Debounced) |
| **CURSOR** | `TWO_FINGER_PINCH` | Right Click |
| **CURSOR** | `SWIPE_UP` / `DOWN` | Scroll Page Up / Down |
| **CURSOR** | `TWO_FINGERS` Spread / Pinch | Zoom In / Zoom Out |
| **MEDIA** | `OPEN_PALM` | Play / Pause |
| **MEDIA** | `SWIPE_RIGHT` / `LEFT` | Next / Previous Track |
| **MEDIA** | `ROTATE_CLOCKWISE` | Volume +5% |
| **MEDIA** | `ROTATE_COUNTER_CLOCKWISE` | Volume -5% |
| **MEDIA** | `CLOSED_FIST` | Mute / Unmute |
| **PRESENTATION**| `SWIPE_RIGHT` / `LEFT` | Next / Previous Slide |
| **PRESENTATION**| `INDEX_POINT` | Virtual Laser Pointer |
| **PRESENTATION**| `CIRCULAR_MOTION` | Spotlight Highlight Area |
| **BROWSER** | `SWIPE_RIGHT` / `LEFT` | Next / Previous Tab (`Ctrl+Tab`) |
| **BROWSER** | `THREE_FINGERS` | New Tab (`Ctrl+T`) |
| **BROWSER** | `FOUR_FINGERS` | Close Tab (`Ctrl+W`) |
| **BROWSER** | `CIRCULAR_MOTION` | Refresh Page (`Ctrl+R`) |
| **CUSTOM** | `ROCK_ON` | Launch Spotify |
| **CUSTOM** | `TWO_FINGERS` | Take Screenshot (Saved to Pictures) |
| **CUSTOM** | `THUMB_UP` | Lock Computer |

---

## 🧠 How "Teach AirOS" Works

1. Open the **Teach AirOS — AI Studio** card on the dashboard.
2. Enter a gesture name (e.g. `MAGIC_WAND` or `VICTORY`).
3. Click **Record** and perform the hand pose in front of the camera. The system records 15 normalized landmark frames.
4. Repeat for another gesture or baseline pose.
5. Click **Train AI Model**. A Random Forest classifier is trained instantly and outputs cross-validation accuracy.
6. The system begins detecting your newly taught gesture in real time!

---

## 🏆 Hackathon Presentation Tips
1. Click the **Demo Tour** button in the top navbar.
2. The interactive 7-step guide will walk the judges through cursor motion, pinch clicking, tab swipe, hand rotation volume, laser pointer, and ML training.
3. Each successful gesture auto-advances the step with audio feedback and verification badges.
