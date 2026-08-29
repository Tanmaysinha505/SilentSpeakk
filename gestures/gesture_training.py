"""
AirOS Custom Gesture Training Engine ("Teach AirOS")
Records normalized landmark feature datasets, trains lightweight Scikit-Learn classifiers,
computes validation accuracy metrics, and runs real-time inference on custom user-taught gestures.
"""
import os
import json
import joblib
import logging
import numpy as np
from typing import List, Dict, Tuple, Optional, Any
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from vision.hand_detector import Landmark
from vision.landmark_processor import LandmarkProcessor

logger = logging.getLogger("AirOS.GestureTraining")

DATASET_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "custom_dataset.json")
MODEL_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "custom_gesture_model.joblib")


class GestureTrainer:
    def __init__(self):
        self.dataset: Dict[str, List[List[float]]] = {}
        self.model = None
        self.classes: List[str] = []
        self.accuracy: float = 0.0
        self.is_trained: bool = False

        # Current recording session state
        self.active_recording_name: Optional[str] = None
        self.recorded_samples_count: int = 0
        self.target_samples: int = 15

        self.load_dataset()
        self.load_model()

    def load_dataset(self):
        """Loads existing training dataset from disk."""
        if os.path.exists(DATASET_FILE):
            try:
                with open(DATASET_FILE, "r", encoding="utf-8") as f:
                    self.dataset = json.load(f)
                logger.info("Loaded custom dataset with %d gesture classes.", len(self.dataset))
            except Exception as e:
                logger.error("Failed to load dataset: %s", e)
                self.dataset = {}
        else:
            self.dataset = {}

    def save_dataset(self) -> bool:
        """Saves custom dataset to disk."""
        try:
            with open(DATASET_FILE, "w", encoding="utf-8") as f:
                json.dump(self.dataset, f, indent=2)
            return True
        except Exception as e:
            logger.error("Failed to save dataset: %s", e)
            return False

    def load_model(self) -> bool:
        """Loads trained classifier model from disk."""
        if os.path.exists(MODEL_FILE):
            try:
                data = joblib.load(MODEL_FILE)
                self.model = data.get("model")
                self.classes = data.get("classes", [])
                self.accuracy = data.get("accuracy", 0.0)
                self.is_trained = True
                logger.info("Loaded custom gesture model with classes: %s (Accuracy: %.1f%%)",
                            self.classes, self.accuracy * 100)
                return True
            except Exception as e:
                logger.error("Failed to load custom gesture model: %s", e)
                self.model = None
                self.is_trained = False
        return False

    def start_recording(self, gesture_name: str, target_samples: int = 15):
        """Prepares a new recording session for a gesture."""
        self.active_recording_name = gesture_name.strip().upper()
        self.target_samples = target_samples
        if self.active_recording_name not in self.dataset:
            self.dataset[self.active_recording_name] = []
        self.recorded_samples_count = len(self.dataset[self.active_recording_name])
        logger.info("Started recording gesture '%s' (Target: %d samples)", self.active_recording_name, target_samples)

    def record_frame(self, landmarks: List[Landmark]) -> Tuple[bool, int, int]:
        """
        Extracts 63-D normalized features from current hand frame and records sample.
        Returns: (is_finished, current_count, target_count)
        """
        if not self.active_recording_name or len(landmarks) < 21:
            return (False, 0, self.target_samples)

        features = LandmarkProcessor.get_normalized_features(landmarks)
        # Avoid duplicate frames by checking variance against last recorded sample
        current_samples = self.dataset[self.active_recording_name]
        if current_samples:
            last_sample = np.array(current_samples[-1], dtype=np.float32)
            diff = np.linalg.norm(features - last_sample)
            if diff < 0.05:  # Too similar to previous sample, wait for slight movement variation
                return (len(current_samples) >= self.target_samples, len(current_samples), self.target_samples)

        current_samples.append(features.tolist())
        self.recorded_samples_count = len(current_samples)
        self.save_dataset()

        is_finished = self.recorded_samples_count >= self.target_samples
        if is_finished:
            logger.info("Finished recording %d samples for '%s'", self.target_samples, self.active_recording_name)
            self.active_recording_name = None

        return (is_finished, self.recorded_samples_count, self.target_samples)

    def cancel_recording(self):
        """Cancels current recording session."""
        self.active_recording_name = None

    def delete_gesture_data(self, gesture_name: str) -> bool:
        """Removes recorded data for a gesture."""
        name = gesture_name.strip().upper()
        if name in self.dataset:
            del self.dataset[name]
            self.save_dataset()
            # Retrain or clear model if needed
            if len(self.dataset) >= 2:
                self.train_model()
            else:
                self.model = None
                self.is_trained = False
                if os.path.exists(MODEL_FILE):
                    os.remove(MODEL_FILE)
            return True
        return False

    def train_model(self) -> Dict[str, Any]:
        """
        Trains a Random Forest classifier on the dataset.
        Requires at least 2 distinct classes with >= 5 samples each.
        """
        valid_classes = {k: v for k, v in self.dataset.items() if len(v) >= 5}
        if len(valid_classes) < 2:
            return {
                "success": False,
                "error": f"Need at least 2 distinct gestures with >= 5 samples each to train. Found {len(valid_classes)}."
            }

        X = []
        y = []
        for label, samples in valid_classes.items():
            for s in samples:
                X.append(s)
                y.append(label)

        X = np.array(X, dtype=np.float32)
        y = np.array(y)

        # Stratified train/test split
        try:
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
        except Exception:
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

        clf = RandomForestClassifier(n_estimators=60, max_depth=12, random_state=42)
        clf.fit(X_train, y_train)

        preds = clf.predict(X_test)
        acc = float(accuracy_score(y_test, preds))

        # Re-fit on full dataset for maximum accuracy in deployment
        clf.fit(X, y)

        self.model = clf
        self.classes = list(clf.classes_)
        self.accuracy = acc
        self.is_trained = True

        # Save model package
        try:
            joblib.dump({
                "model": self.model,
                "classes": self.classes,
                "accuracy": self.accuracy
            }, MODEL_FILE)
            logger.info("Trained model successfully with %.1f%% accuracy on classes: %s",
                        self.accuracy * 100, self.classes)
            return {
                "success": True,
                "accuracy": round(self.accuracy * 100, 1),
                "classes": self.classes,
                "total_samples": len(X)
            }
        except Exception as e:
            logger.error("Failed to save trained model: %s", e)
            return {"success": False, "error": str(e)}

    def predict(self, landmarks: List[Landmark], min_confidence: float = 0.75) -> Optional[Tuple[str, float]]:
        """
        Runs ML prediction on a hand frame.
        Returns (predicted_class_name, confidence_probability) if confidence >= threshold.
        """
        if not self.is_trained or self.model is None or len(landmarks) < 21:
            return None

        features = LandmarkProcessor.get_normalized_features(landmarks).reshape(1, -1)
        try:
            probs = self.model.predict_proba(features)[0]
            best_idx = np.argmax(probs)
            confidence = float(probs[best_idx])

            if confidence >= min_confidence:
                return (str(self.classes[best_idx]), confidence)
        except Exception as e:
            logger.debug("Prediction error: %s", e)

        return None


gesture_trainer = GestureTrainer()
