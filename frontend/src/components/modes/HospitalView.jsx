import React from 'react';
import { HeartPulse, Droplet, AlertCircle, Bell, Siren, Check, GraduationCap } from 'lucide-react';
import { useAgent44Store } from '../../store/useAgent44Store';

const HOSPITAL_COMMANDS = [
  { gesture: 'OPEN_PALM', label: 'Need Drinking Water', icon: Droplet, severity: 'normal', desc: 'Requests attendant for hydration assistance' },
  { gesture: 'CLOSED_FIST', label: 'Acute Pain Alert', icon: AlertCircle, severity: 'warning', desc: 'Alerts nurse of pain / discomfort' },
  { gesture: 'POINT_CHEST', label: 'Pointing to Chest', icon: HeartPulse, severity: 'urgent', desc: 'Identifies chest / cardiac discomfort' },
  { gesture: 'POINT_HEAD', label: 'Pointing to Head', icon: AlertCircle, severity: 'warning', desc: 'Identifies headache or migraine' },
  { gesture: 'INDEX_POINT', label: 'Call Nurse to Bed', icon: Bell, severity: 'urgent', desc: 'Direct patient call bell to station' },
  { gesture: 'ROCK_ON', label: 'CODE BLUE EMERGENCY', icon: Siren, severity: 'critical', desc: 'Critical alert dispatched to medical team' },
];

export function HospitalView({ onOpenLearner }) {
  const tracking = useAgent44Store((s) => s.tracking);
  const addToast = useAgent44Store((s) => s.addToast);
  const speakText = useAgent44Store((s) => s.speakText);

  const handleManual = (item) => {
    const msg = `Patient Trigger: ${item.label}`;
    addToast(msg, item.severity === 'critical' ? 'error' : item.severity === 'urgent' ? 'warning' : 'info');
    speakText(item.label);
  };

  return (
    <div className="mode-view-overlay hospital-overlay">
      <div className="mode-view-card">
        <div className="mode-view-header">
          <div className="title-row">
            <HeartPulse size={22} className="text-rose animate-pulse" />
            <div>
              <h2 className="mode-view-title">Hospital & Patient Care Mode</h2>
              <p className="mode-view-desc">
                Touchless bedside signaling for critical patient needs and nurse alarms.
              </p>
            </div>
          </div>

          <button
            className="mode-teach-btn"
            onClick={onOpenLearner}
            title="Teach gesture in Hospital mode"
          >
            <GraduationCap size={14} />
            <span>Teach</span>
          </button>
        </div>

        <div className="mode-gesture-grid">
          {HOSPITAL_COMMANDS.map((item) => {
            const Icon = item.icon;
            const isMatch = tracking.confirmedGesture === item.gesture;

            return (
              <div
                key={item.gesture}
                className={`mode-action-card hospital-card ${item.severity} ${isMatch ? 'active-triggered' : ''}`}
                onClick={() => handleManual(item)}
              >
                <div className="action-card-top">
                  <div className="action-icon-box">
                    <Icon size={18} />
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
