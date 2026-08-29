import React, { useState } from 'react';
import { Sliders, Plus, Sparkles, Check } from 'lucide-react';
import { useAgent44Store } from '../../store/useAgent44Store';

export function CustomLearningView() {
  const [gestureName, setGestureName] = useState('');
  const [actionLabel, setActionLabel] = useState('');
  const [customList, setCustomList] = useState([
    { gesture: 'ROCK_ON', action: 'Launch Media Player', active: true },
    { gesture: 'TWO_FINGERS', action: 'Take Screenshot', active: true },
    { gesture: 'OK_SIGN', action: 'Toggle Ambient Mood Lighting', active: true },
  ]);
  const addToast = useAgent44Store((s) => s.addToast);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!gestureName || !actionLabel) return;
    setCustomList([...customList, { gesture: gestureName.toUpperCase(), action: actionLabel, active: true }]);
    addToast(`Mapped ${gestureName.toUpperCase()} to "${actionLabel}"`, 'success');
    setGestureName('');
    setActionLabel('');
  };

  return (
    <div className="mode-view-overlay custom-overlay">
      <div className="mode-view-card">
        <div className="mode-view-header">
          <Sliders size={20} className="text-amber" />
          <div>
            <h2 className="mode-view-title">Custom Learning Mode — User Defined Triggers</h2>
            <p className="mode-view-desc">
              Assign personalized actions, smart room triggers, or application launches to supported hand gestures.
            </p>
          </div>
        </div>

        {/* Input form */}
        <form onSubmit={handleAdd} className="custom-input-form">
          <input
            type="text"
            className="hud-input"
            placeholder="Gesture Name (e.g. PEACE, FIST)"
            value={gestureName}
            onChange={(e) => setGestureName(e.target.value)}
          />
          <input
            type="text"
            className="hud-input"
            placeholder="Trigger Action (e.g. Dim Lights, Open App)"
            value={actionLabel}
            onChange={(e) => setActionLabel(e.target.value)}
          />
          <button type="submit" className="hud-btn hud-btn-sim">
            <Plus size={14} /> Map Gesture
          </button>
        </form>

        {/* Mapped list */}
        <div className="custom-mappings-list">
          {customList.map((item, idx) => (
            <div key={idx} className="custom-mapping-row">
              <span className="gesture-tag">{item.gesture}</span>
              <span className="mapping-arrow">→</span>
              <span className="mapping-action">{item.action}</span>
              <span className="mapping-badge">ACTIVE</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
