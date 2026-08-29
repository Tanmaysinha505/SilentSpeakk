"""
AirOS Custom Gestures Registry
Stores and manages user-defined custom gestures and mapped actions.
"""
import os
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("AirOS.CustomGestures")

STORAGE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "custom_gestures.json")

DEFAULT_CUSTOM_MAPPINGS = [
    {
        "id": "custom_spotify",
        "name": "Rock-On -> Open Spotify",
        "gesture": "ROCK_ON",
        "action_type": "app",
        "target": "spotify",
        "description": "Opens Spotify music player"
    },
    {
        "id": "custom_screenshot",
        "name": "Peace -> Take Screenshot",
        "gesture": "TWO_FINGERS",
        "action_type": "system",
        "target": "screenshot",
        "description": "Saves full screen screenshot"
    },
    {
        "id": "custom_lock",
        "name": "Thumb Up -> Lock Workstation",
        "gesture": "THUMB_UP",
        "action_type": "system",
        "target": "lock",
        "description": "Instantly locks computer"
    },
    {
        "id": "custom_terminal",
        "name": "Three Fingers -> Open Terminal",
        "gesture": "THREE_FINGERS",
        "action_type": "app",
        "target": "terminal",
        "description": "Launches Windows Terminal / PowerShell"
    }
]


class CustomGestureRegistry:
    def __init__(self):
        self.mappings: List[Dict[str, Any]] = []
        self.load()

    def load(self):
        """Loads custom gestures from disk."""
        if os.path.exists(STORAGE_PATH):
            try:
                with open(STORAGE_PATH, "r", encoding="utf-8") as f:
                    self.mappings = json.load(f)
                logger.info("Loaded %d custom gesture mappings.", len(self.mappings))
            except Exception as e:
                logger.error("Failed to load custom gestures: %s", e)
                self.mappings = DEFAULT_CUSTOM_MAPPINGS.copy()
        else:
            self.mappings = DEFAULT_CUSTOM_MAPPINGS.copy()
            self.save()

    def save(self) -> bool:
        """Saves custom gestures to disk."""
        try:
            with open(STORAGE_PATH, "w", encoding="utf-8") as f:
                json.dump(self.mappings, f, indent=2)
            return True
        except Exception as e:
            logger.error("Failed to save custom gestures: %s", e)
            return False

    def get_all(self) -> List[Dict[str, Any]]:
        return self.mappings

    def add_or_update(self, gesture_id: str, name: str, gesture_name: str, action_type: str, target: str, description: str = "") -> Dict[str, Any]:
        """Adds or updates a custom gesture mapping."""
        for item in self.mappings:
            if item.get("id") == gesture_id:
                item.update({
                    "name": name,
                    "gesture": gesture_name,
                    "action_type": action_type,
                    "target": target,
                    "description": description
                })
                self.save()
                return item

        new_item = {
            "id": gesture_id,
            "name": name,
            "gesture": gesture_name,
            "action_type": action_type,
            "target": target,
            "description": description
        }
        self.mappings.append(new_item)
        self.save()
        return new_item

    def delete(self, gesture_id: str) -> bool:
        """Deletes a custom gesture mapping."""
        orig_len = len(self.mappings)
        self.mappings = [m for m in self.mappings if m.get("id") != gesture_id]
        if len(self.mappings) < orig_len:
            self.save()
            return True
        return False

    def find_action_for_gesture(self, gesture_name: str) -> Optional[Dict[str, Any]]:
        """Finds custom action bound to the given gesture name."""
        for item in self.mappings:
            if item.get("gesture") == gesture_name:
                return item
        return None


custom_registry = CustomGestureRegistry()
