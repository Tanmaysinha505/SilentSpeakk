"""
AirOS Default Gestures & Mode Mappings
Maps static and dynamic gestures to actions across different operational modes.
"""
from typing import Dict, Any, List

MODE_DESCRIPTIONS = {
    "ROOM_CONTROL": "Virtual 3D Smart Room: Control Ceiling Light, Fan, Door, and Television.",
    "LIBRARY": "Silent gesture-based communication in study & quiet environments.",
    "HOSPITAL": "Patient assistance for water, pain alert, nurse call, and emergency.",
    "COMMUNICATION": "Deaf & speech impaired communication with live text and speech synthesis.",
    "SPACE": "Astronaut EVA simulation telemetry and zero-G commands.",
    "CUSTOM": "Execute user-defined custom gestures and automation shortcuts.",
    "CURSOR": "Air mouse cursor control, click, right click, scroll, and drag.",
    "MEDIA": "Control playback (Play/Pause, Next/Prev) and rotate hand for volume.",
    "PRESENTATION": "Slide navigation, virtual laser pointer, spotlight highlight, and hold.",
    "BROWSER": "Browser navigation: tab cycling, new tab, close tab, and page refresh.",
    "TRAINING": "Teach Agent 44 new gestures and collect landmark training samples."
}

DEFAULT_MODE_ACTIONS: Dict[str, Dict[str, Dict[str, Any]]] = {
    "ROOM_CONTROL": {
        "OPEN_PALM": {"action": "LIGHT_ON", "label": "Ceiling Light ON", "icon": "lightbulb"},
        "CLOSED_FIST": {"action": "LIGHT_OFF", "label": "Ceiling Light OFF", "icon": "lightbulb-off"},
        "INDEX_POINT": {"action": "FAN_ON", "label": "Ceiling Fan ON", "icon": "fan"},
        "POINT_DOWN": {"action": "FAN_OFF", "label": "Ceiling Fan OFF", "icon": "fan-off"},
        "THUMB_UP": {"action": "DOOR_OPEN", "label": "Smart Door OPEN", "icon": "door-open"},
        "THUMB_DOWN": {"action": "DOOR_CLOSE", "label": "Smart Door CLOSE", "icon": "door-closed"},
        "VICTORY": {"action": "TV_TOGGLE", "label": "Smart OLED TV Power", "icon": "tv"},
        "ROCK_ON": {"action": "PARTY_MODE", "label": "Party Lighting Mode", "icon": "sparkles"}
    },
    "LIBRARY": {
        "OPEN_PALM": {"action": "library_quiet", "label": "Please Be Quiet (Shh)", "icon": "volume-x"},
        "INDEX_POINT": {"action": "library_book", "label": "Need Book Assistance", "icon": "book"},
        "THUMB_UP": {"action": "library_thanks", "label": "Thank You", "icon": "smile"},
        "CLOSED_FIST": {"action": "library_leaving", "label": "Leaving Study Desk", "icon": "log-out"}
    },
    "HOSPITAL": {
        "OPEN_PALM": {"action": "hospital_water", "label": "Need Drinking Water", "icon": "droplet"},
        "CLOSED_FIST": {"action": "hospital_pain", "label": "Pain Alert / Severe Discomfort", "icon": "alert-circle"},
        "INDEX_POINT": {"action": "hospital_nurse", "label": "Call Nurse Assistance", "icon": "bell"},
        "ROCK_ON": {"action": "hospital_emergency", "label": "CODE BLUE: Emergency Alarm", "icon": "siren"}
    },
    "COMMUNICATION": {
        "OPEN_PALM": {"action": "comm_hello", "label": "Hello / Greetings", "icon": "hand"},
        "THUMB_UP": {"action": "comm_yes", "label": "Yes / I Agree", "icon": "check"},
        "THUMB_DOWN": {"action": "comm_no", "label": "No / I Disagree", "icon": "x"},
        "INDEX_POINT": {"action": "comm_want", "label": "I Want / Need This", "icon": "help-circle"},
        "OK_SIGN": {"action": "comm_understand", "label": "Understood / OK", "icon": "check-circle"}
    },
    "SPACE": {
        "THUMB_UP": {"action": "space_oxygen", "label": "Oxygen & Suit Nominal", "icon": "shield"},
        "INDEX_POINT": {"action": "space_thruster", "label": "Fire RCS Thrusters", "icon": "zap"},
        "CLOSED_FIST": {"action": "space_hold", "label": "Hold Station / Tether Lock", "icon": "anchor"},
        "OPEN_PALM": {"action": "space_airlock", "label": "Airlock Sealed & Pressurized", "icon": "check-square"},
        "WAVE": {"action": "space_radio", "label": "Radio Comms Ping", "icon": "radio"}
    },
    "CURSOR": {
        "INDEX_POINT": {"action": "cursor_move", "label": "Move Cursor", "icon": "cursor"},
        "PINCH": {"action": "left_click", "label": "Left Click", "icon": "click"},
        "TWO_FINGER_PINCH": {"action": "right_click", "label": "Right Click", "icon": "right-click"},
        "SWIPE_UP": {"action": "scroll_up", "label": "Scroll Up", "icon": "scroll-up"},
        "SWIPE_DOWN": {"action": "scroll_down", "label": "Scroll Down", "icon": "scroll-down"},
        "TWO_FINGERS": {"action": "zoom_in", "label": "Zoom In", "icon": "zoom"},
        "THUMB_UP": {"action": "confirm", "label": "Enter / Confirm", "icon": "check"},
        "THUMB_DOWN": {"action": "reject", "label": "Escape / Reject", "icon": "x"},
        "CLOSED_FIST": {"action": "cancel", "label": "Cancel / Stop", "icon": "stop"}
    },
    "MEDIA": {
        "OPEN_PALM": {"action": "media_play_pause", "label": "Play / Pause", "icon": "play-pause"},
        "SWIPE_RIGHT": {"action": "media_next", "label": "Next Track", "icon": "next"},
        "SWIPE_LEFT": {"action": "media_prev", "label": "Previous Track", "icon": "prev"},
        "ROTATE_CLOCKWISE": {"action": "volume_up", "label": "Volume +5%", "icon": "volume-up"},
        "ROTATE_COUNTER_CLOCKWISE": {"action": "volume_down", "label": "Volume -5%", "icon": "volume-down"},
        "CLOSED_FIST": {"action": "volume_mute", "label": "Mute / Unmute", "icon": "mute"}
    },
    "PRESENTATION": {
        "SWIPE_RIGHT": {"action": "pres_next", "label": "Next Slide", "icon": "next-slide"},
        "SWIPE_LEFT": {"action": "pres_prev", "label": "Previous Slide", "icon": "prev-slide"},
        "INDEX_POINT": {"action": "laser_pointer", "label": "Laser Pointer", "icon": "laser"},
        "CIRCULAR_MOTION": {"action": "spotlight_highlight", "label": "Highlight Area", "icon": "circle"},
        "OPEN_PALM": {"action": "pres_pause", "label": "Pause / Black Screen", "icon": "pause"},
        "THUMB_UP": {"action": "pres_start", "label": "Start Slideshow", "icon": "slideshow"}
    },
    "BROWSER": {
        "SWIPE_RIGHT": {"action": "browser_next_tab", "label": "Next Tab (Ctrl+Tab)", "icon": "tab-next"},
        "SWIPE_LEFT": {"action": "browser_prev_tab", "label": "Previous Tab (Ctrl+Shift+Tab)", "icon": "tab-prev"},
        "THREE_FINGERS": {"action": "browser_new_tab", "label": "New Tab (Ctrl+T)", "icon": "new-tab"},
        "FOUR_FINGERS": {"action": "browser_close_tab", "label": "Close Tab (Ctrl+W)", "icon": "close-tab"},
        "CIRCULAR_MOTION": {"action": "browser_refresh", "label": "Refresh (Ctrl+R)", "icon": "refresh"}
    },
    "CUSTOM": {
        "ROCK_ON": {"action": "launch_app", "target": "spotify", "label": "Open Spotify", "icon": "music"},
        "TWO_FINGERS": {"action": "screenshot", "label": "Take Screenshot", "icon": "camera"},
        "OK_SIGN": {"action": "show_desktop", "label": "Show Desktop", "icon": "desktop"},
        "WAVE": {"action": "toggle_hud", "label": "Show/Hide HUD", "icon": "hud"}
    }
}
