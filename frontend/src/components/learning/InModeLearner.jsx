import React, { useState } from 'react';
import { Sparkles, Plus, GraduationCap, X, Check, Layers, FolderPlus } from 'lucide-react';
import { useAgent44Store } from '../../store/useAgent44Store';

const GESTURE_OPTIONS = [
  'OPEN_PALM',
  'CLOSED_FIST',
  'INDEX_POINT',
  'POINT_CHEST',
  'POINT_HEAD',
  'THUMB_UP',
  'THUMB_DOWN',
  'VICTORY',
  'ROCK_ON',
  'OK_SIGN',
  'THREE_FINGERS'
];

export function InModeLearner({ isOpen, onClose }) {
  const activeMode = useAgent44Store((s) => s.activeMode);
  const addToast = useAgent44Store((s) => s.addToast);
  const setActiveMode = useAgent44Store((s) => s.setActiveMode);

  const [activeTab, setActiveTab] = useState('LEARN_GESTURE'); // 'LEARN_GESTURE' | 'CREATE_MODE'

  // Gesture Learning Form State
  const [selectedGesture, setSelectedGesture] = useState('OPEN_PALM');
  const [actionLabel, setActionLabel] = useState('');
  const [spokenPhrase, setSpokenPhrase] = useState('');

  // Mode Creation Form State
  const [newModeName, setNewModeName] = useState('');
  const [newModeDesc, setNewModeDesc] = useState('');
  const [newModeBadge, setNewModeBadge] = useState('CUSTOM');

  if (!isOpen) return null;

  const handleTeachGesture = (e) => {
    e.preventDefault();
    if (!actionLabel) return;

    // Persist learned mapping into localStorage for the active mode
    const key = `agent44_custom_${activeMode}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const newEntry = {
      gesture: selectedGesture,
      action: actionLabel,
      spoken: spokenPhrase || actionLabel,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify([...existing, newEntry]));

    addToast(`Learned in ${activeMode}: ${selectedGesture} → "${actionLabel}"`, 'success');
    setActionLabel('');
    setSpokenPhrase('');
    onClose();
  };

  const handleCreateMode = (e) => {
    e.preventDefault();
    if (!newModeName) return;

    const modeId = newModeName.toUpperCase().replace(/\s+/g, '_');
    const customModes = JSON.parse(localStorage.getItem('agent44_user_modes') || '[]');
    const newMode = {
      id: modeId,
      name: newModeName.toUpperCase(),
      desc: newModeDesc || 'User defined custom gesture operational mode',
      badge: newModeBadge.toUpperCase() || 'CUSTOM',
      color: '#f59e0b'
    };

    localStorage.setItem('agent44_user_modes', JSON.stringify([...customModes, newMode]));

    addToast(`New Mode Created: ${newMode.name}`, 'success');
    setActiveMode(modeId);
    setNewModeName('');
    setNewModeDesc('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container in-mode-learner-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="title-row">
            <GraduationCap size={20} className="text-cyan" />
            <h2 className="modal-title">AI LEARNING STUDIO — [{activeMode.replace(/_/g, ' ')}]</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="learner-tabs-row">
          <button
            className={`learner-tab-btn ${activeTab === 'LEARN_GESTURE' ? 'active' : ''}`}
            onClick={() => setActiveTab('LEARN_GESTURE')}
          >
            <Sparkles size={14} />
            <span>Teach Gesture in {activeMode.replace(/_/g, ' ')}</span>
          </button>
          <button
            className={`learner-tab-btn ${activeTab === 'CREATE_MODE' ? 'active' : ''}`}
            onClick={() => setActiveTab('CREATE_MODE')}
          >
            <FolderPlus size={14} />
            <span>+ Create Entirely New Mode</span>
          </button>
        </div>

        {activeTab === 'LEARN_GESTURE' ? (
          /* Form 1: Teach gesture for this mode */
          <form onSubmit={handleTeachGesture} className="learner-form">
            <p className="learner-desc">
              Assign an intuitive human hand gesture to an immediate action or spoken phrase within{' '}
              <strong>{activeMode.replace(/_/g, ' ')}</strong> mode.
            </p>

            <div className="form-field">
              <label className="field-label">SELECT HAND GESTURE:</label>
              <select
                className="hud-select"
                value={selectedGesture}
                onChange={(e) => setSelectedGesture(e.target.value)}
              >
                {GESTURE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="field-label">INTENT / ACTION NAME:</label>
              <input
                type="text"
                className="hud-input"
                placeholder="e.g. Request Blanket, Night Dim, Quiet Alert..."
                value={actionLabel}
                onChange={(e) => setActionLabel(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label className="field-label">SPOKEN PHRASE (AGENT 44 VOICE):</label>
              <input
                type="text"
                className="hud-input"
                placeholder="e.g. 'Patient requests an extra warm blanket.'"
                value={spokenPhrase}
                onChange={(e) => setSpokenPhrase(e.target.value)}
              />
            </div>

            <div className="modal-footer">
              <button type="submit" className="hud-btn hud-btn-sim">
                <Check size={14} /> Save & Teach Agent 44
              </button>
            </div>
          </form>
        ) : (
          /* Form 2: Create brand new operational mode */
          <form onSubmit={handleCreateMode} className="learner-form">
            <p className="learner-desc">
              Create a custom operational context (e.g. Classroom, Drone Control, Gaming, Home Theater)
              with dedicated gesture shortcuts.
            </p>

            <div className="form-field">
              <label className="field-label">NEW MODE NAME:</label>
              <input
                type="text"
                className="hud-input"
                placeholder="e.g. CLASSROOM, DRONE CONTROL, GAMING..."
                value={newModeName}
                onChange={(e) => setNewModeName(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label className="field-label">BADGE TAG:</label>
              <input
                type="text"
                className="hud-input"
                placeholder="e.g. EDUCATION, UAV, ENTERTAINMENT..."
                value={newModeBadge}
                onChange={(e) => setNewModeBadge(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="field-label">SHORT DESCRIPTION:</label>
              <input
                type="text"
                className="hud-input"
                placeholder="e.g. Touchless hand gesture controls for presentation slides..."
                value={newModeDesc}
                onChange={(e) => setNewModeDesc(e.target.value)}
              />
            </div>

            <div className="modal-footer">
              <button type="submit" className="hud-btn hud-btn-sim">
                <Plus size={14} /> Register New Mode
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
