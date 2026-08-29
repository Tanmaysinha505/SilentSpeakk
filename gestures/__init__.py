"""
AirOS Gestures Package
"""
from gestures.default_gestures import DEFAULT_MODE_ACTIONS, MODE_DESCRIPTIONS
from gestures.custom_gestures import custom_registry, CustomGestureRegistry
from gestures.gesture_training import gesture_trainer, GestureTrainer

__all__ = [
    "DEFAULT_MODE_ACTIONS",
    "MODE_DESCRIPTIONS",
    "custom_registry",
    "CustomGestureRegistry",
    "gesture_trainer",
    "GestureTrainer"
]
