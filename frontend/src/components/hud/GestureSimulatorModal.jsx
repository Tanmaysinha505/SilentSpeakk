import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Hand,
  CircleDot,
  ArrowUp,
  ArrowDown,
  ThumbsUp,
  ThumbsDown,
  Tv,
  DoorOpen,
  DoorClosed,
  Code2,
  Check
} from 'lucide-react';
import { gestureBridge } from '../../services/gestureBridge';
import { GESTURE_DEFINITIONS } from '../../services/gestureMapper';

const GESTURE_ICONS = {
  Hand,
  CircleDot,
  ArrowUp,
  ArrowDown,
  ThumbsUp,
  ThumbsDown,
  Tv,
  DoorOpen,
  DoorClosed,
  Sparkles
};

export function GestureSimulatorModal({ isOpen, onClose }) {
  const [selectedConfidence, setSelectedConfidence] = useState(97.5);
  const [lastInjected, setLastInjected] = useState(null);

  if (!isOpen) return null;

  const handleSimulate = (gestureId) => {
    setLastInjected(gestureId);
    gestureBridge.simulateGesture(gestureId, Number(selectedConfidence));
    setTimeout(() => setLastInjected(null), 1500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Sparkles size={18} className="text-cyan" />
            <h3 id="modal-title" className="modal-title">
              MediaPipe Gesture Recognition Simulator
            </h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close Modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-desc">
            Test and preview how the computer vision pipeline and MediaPipe HandLandmarker
            dispatches commands into the 3D Smart Room Command State System.
          </p>

          {/* Confidence Slider Control */}
          <div className="sim-control-group">
            <div className="sim-label-row">
              <label htmlFor="sim-conf-range" className="sim-label">
                Simulated Vision Confidence Level:
              </label>
              <span className="sim-val">{selectedConfidence}%</span>
            </div>
            <input
              id="sim-conf-range"
              type="range"
              min="50"
              max="100"
              step="0.5"
              value={selectedConfidence}
              onChange={(e) => setSelectedConfidence(e.target.value)}
              className="sim-slider"
            />
            <div className="sim-slider-marks">
              <span>50% (Weak)</span>
              <span>75% (Threshold)</span>
              <span>100% (High Certainty)</span>
            </div>
          </div>

          {/* Grid of Gestures */}
          <div className="sim-grid">
            {Object.values(GESTURE_DEFINITIONS).map((def) => {
              const Icon = GESTURE_ICONS[def.icon] || Hand;
              const isJustTriggered = lastInjected === def.id;

              return (
                <button
                  key={def.id}
                  className={`sim-gesture-btn ${isJustTriggered ? 'triggered' : ''}`}
                  onClick={() => handleSimulate(def.id)}
                  title={`Simulate ${def.label} -> ${def.intent}`}
                >
                  <div className="sim-btn-icon-wrapper">
                    {isJustTriggered ? (
                      <Check size={22} className="text-emerald" />
                    ) : (
                      <Icon size={22} className="text-cyan" />
                    )}
                  </div>
                  <div className="sim-btn-text">
                    <div className="sim-btn-name">{def.label}</div>
                    <div className="sim-btn-intent">{def.intent}</div>
                    <div className="sim-btn-target">→ {def.target}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Developer Architecture Guide */}
          <div className="architecture-box">
            <div className="arch-header">
              <Code2 size={15} className="text-purple" />
              <span>MediaPipe Integration Pipeline Architecture</span>
            </div>
            <pre className="arch-code">
{`// MediaPipe Hands Detection Bridge:
import { gestureBridge } from './services/gestureBridge';

// In your MediaPipe onResults / landmark callback:
const results = handLandmarker.detectForVideo(videoElement, performance.now());
if (results.gestures.length > 0) {
  const topGesture = results.gestures[0][0];
  // Ingests recognized gesture with confidence into global room store
  gestureBridge.processDetectedGesture(
    topGesture.categoryName, // e.g. "OPEN_PALM", "POINT_UP"
    topGesture.score * 100,  // confidence percentage
    "MediaPipe Hands"
  );
}`}
            </pre>
          </div>
        </div>

        <div className="modal-footer">
          <button className="hud-btn" onClick={onClose}>
            Done Testing
          </button>
        </div>
      </div>
    </div>
  );
}
