import React from 'react';
import { BookOpen, VolumeX, Smile, LogOut, Check, GraduationCap, Zap, MapPin, AlertTriangle } from 'lucide-react';
import { useAgent44Store } from '../../store/useAgent44Store';

const LIBRARY_COMMANDS = [
  { gesture: 'OPEN_PALM', label: 'Please Be Quiet (Shh)', icon: VolumeX, desc: 'Quietly alerts nearby noisy tables to lower voices' },
  { gesture: 'INDEX_POINT', label: 'Need Book Shelf Guidance', icon: MapPin, desc: 'Librarian desk sends aisle & shelf section map' },
  { gesture: 'POINT_CHEST', label: 'Need Laptop Charger / Adapter', icon: Zap, desc: 'Requests library circulation desk for power cable' },
  { gesture: 'CLOSED_FIST', label: 'Noise Disturbance Report', icon: AlertTriangle, desc: 'Silently alerts library proctor to quiet zone disruption' },
  { gesture: 'THUMB_UP', label: 'Silent Thank You!', icon: Smile, desc: 'Acknowledges librarian without breaking quiet zone' },
];

export function LibraryView({ onOpenLearner }) {
  const tracking = useAgent44Store((s) => s.tracking);
  const addToast = useAgent44Store((s) => s.addToast);
  const speakText = useAgent44Store((s) => s.speakText);

  const handleLibraryAction = (item) => {
    addToast(`Library Alert: ${item.label}`, 'info');
    speakText(item.label);
  };

  return (
    <div className="mode-view-overlay library-overlay">
      <div className="mode-view-card">
        <div className="mode-view-header">
          <div className="title-row">
            <BookOpen size={20} className="text-cyan" />
            <div>
              <h2 className="mode-view-title">Library Mode — Silent Study Support</h2>
              <p className="mode-view-desc">
                Introvert-friendly silent requests. Get help, chargers, and report noise without speaking.
              </p>
            </div>
          </div>

          <button
            className="mode-teach-btn"
            onClick={onOpenLearner}
            title="Teach gesture in Library mode"
          >
            <GraduationCap size={14} />
            <span>Teach</span>
          </button>
        </div>

        <div className="mode-gesture-grid">
          {LIBRARY_COMMANDS.map((item) => {
            const Icon = item.icon;
            const isMatch = tracking.confirmedGesture === item.gesture;

            return (
              <div
                key={item.gesture}
                className={`mode-action-card ${isMatch ? 'active-triggered' : ''}`}
                onClick={() => handleLibraryAction(item)}
              >
                <div className="action-card-top">
                  <div className="action-icon-box">
                    <Icon size={18} className="text-cyan" />
                  </div>
                  <span className="gesture-tag">{item.gesture.replace(/_/g, ' ')}</span>
                </div>
                <div className="action-card-title">{item.label}</div>
                <div className="action-card-desc">{item.desc}</div>
                {isMatch && (
                  <div className="action-active-badge">
                    <Check size={12} /> CONFIRMED
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
