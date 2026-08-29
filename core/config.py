"""
AirOS Configuration Manager
Handles loading, updating, and persisting user settings, calibration bounds, and safety parameters.
"""
import os
import json
import logging
from typing import Dict, Any

logger = logging.getLogger("AirOS.Config")

DEFAULT_CONFIG: Dict[str, Any] = {
    "camera": {
        "device_index": 0,
        "width": 640,
        "height": 480,
        "fps": 30,
        "mirror": True
    },
    "mouse": {
        "enabled": True,
        "sensitivity_x": 1.4,
        "sensitivity_y": 1.4,
        "smoothing_factor": 0.65,  # 0.0 (no smoothing) to 0.95 (heavy smoothing)
        "click_cooldown_ms": 350,
        "pinch_threshold": 0.048,   # Normalized distance threshold for thumb+index pinch
        "right_pinch_threshold": 0.052, # Thumb+middle pinch
        "deadzone_radius": 3.0,     # Pixels to ignore jitter when holding still
        "acceleration": 1.2
    },
    "calibration": {
        "calibrated": False,
        "top_left": [0.15, 0.15],
        "top_right": [0.85, 0.15],
        "bottom_right": [0.85, 0.85],
        "bottom_left": [0.15, 0.85]
    },
    "recognition": {
        "confidence_threshold": 0.70,
        "gesture_cooldown_ms": 600,
        "motion_history_len": 24,
        "swipe_min_velocity": 0.015,
        "rotation_angle_threshold": 25.0,
        "circle_min_points": 8
    },
    "modes": {
        "active_mode": "CURSOR",  # CURSOR, MEDIA, PRESENTATION, BROWSER, CUSTOM, TRAINING
        "auto_laser_in_presentation": True
    },
    "appearance": {
        "theme": "dark",
        "show_landmarks": True,
        "show_hud": True,
        "hud_opacity": 0.9,
        "landmark_color": "#00f0ff",
        "skeleton_color": "#a855f7"
    },
    "accessibility": {
        "enabled": False,
        "slow_gestures": False,
        "gesture_tolerance_multiplier": 1.3,
        "audio_feedback": True,
        "high_contrast": False
    },
    "custom_actions": {}
}

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "airos_config.json")


class ConfigManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ConfigManager, cls).__new__(cls)
            cls._instance._config = DEFAULT_CONFIG.copy()
            cls._instance.load()
        return cls._instance

    def load(self) -> Dict[str, Any]:
        """Loads configuration from JSON file, falling back to defaults for missing keys."""
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                    self._deep_update(self._config, saved)
                logger.info("Loaded configuration from %s", CONFIG_PATH)
            except Exception as e:
                logger.error("Failed to load config: %s. Using defaults.", e)
        else:
            self.save()
        return self._config

    def save(self) -> bool:
        """Persists current configuration to JSON file."""
        try:
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(self._config, f, indent=2)
            logger.info("Saved configuration to %s", CONFIG_PATH)
            return True
        except Exception as e:
            logger.error("Failed to save config: %s", e)
            return False

    def get(self, key: str, default: Any = None) -> Any:
        """Gets a configuration section or value."""
        return self._config.get(key, default)

    def set(self, key: str, value: Any, auto_save: bool = True) -> None:
        """Sets a configuration section or value."""
        self._config[key] = value
        if auto_save:
            self.save()

    def update_section(self, section: str, values: Dict[str, Any], auto_save: bool = True) -> Dict[str, Any]:
        """Updates a nested dictionary section."""
        if section not in self._config:
            self._config[section] = {}
        self._config[section].update(values)
        if auto_save:
            self.save()
        return self._config[section]

    def _deep_update(self, target: dict, source: dict):
        for k, v in source.items():
            if isinstance(v, dict) and k in target and isinstance(target[k], dict):
                self._deep_update(target[k], v)
            else:
                target[k] = v

    @property
    def config(self) -> Dict[str, Any]:
        return self._config


config_mgr = ConfigManager()
