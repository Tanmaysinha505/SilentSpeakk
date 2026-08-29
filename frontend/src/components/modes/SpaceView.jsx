import React from 'react';
import { Rocket, Shield, Zap, Anchor, Radio, CheckSquare, Check, GraduationCap } from 'lucide-react';
import { useAgent44Store } from '../../store/useAgent44Store';

const SPACE_COMMANDS = [
  { gesture: 'THUMB_UP', label: 'Oxygen & Suit: 100% Nominal', icon: Shield, desc: 'Telemetry status confirmed to Mission Control' },
  { gesture: 'INDEX_POINT', label: 'Fire RCS Thruster Burst', icon: Zap, desc: 'Zero-G attitude control pulse (0.5s)' },
  { gesture: 'CLOSED_FIST', label: 'Hold Station / Tether Lock', icon: Anchor, desc: 'Magnetic boots & EVA tether locked' },
  { gesture: 'OPEN_PALM', label: 'Airlock Outer Hatch Secure', icon: CheckSquare, desc: 'Verifies habitat airlock pressure seal' },
  { gesture: 'ROCK_ON', label: 'Emergency Beacon Ping', icon: Radio, desc: 'High-gain emergency frequency handshake' },
];

export function SpaceView({ onOpenLearner }) {
  const tracking = useAgent44Store((s) => s.tracking);
  const addToast = useAgent44Store((s) => s.addToast);

  return (
    <div className="mode-view-overlay space-overlay">
      <div className="mode-view-card">
        <div className="mode-view-header">
          <div className="title-row">
            <Rocket size={22} className="text-purple" />
            <div>
              <h2 className="mode-view-title">Space Mode — Astronaut EVA Telemetry</h2>
              <p className="mode-view-desc">
                Zero-G helmet HUD. Execute non-verbal telemetry and propulsion commands.
              </p>
            </div>
          </div>

          <button
            className="mode-teach-btn"
            onClick={onOpenLearner}
            title="Teach gesture in Space mode"
          >
            <GraduationCap size={14} />
            <span>Teach</span>
          </button>
        </div>

        {/* Space Telemetry Stats Strip */}
        <div className="space-telemetry-banner">
          <div className="space-stat">
            <span className="stat-label">SUIT STATUS</span>
            <span className="stat-val text-emerald">NOMINAL</span>
          </div>
          <div className="space-stat">
            <span className="stat-label">OXYGEN RESERVE</span>
            <span className="stat-val text-cyan">98.4%</span>
          </div>
          <div className="space-stat">
            <span className="stat-label">EVA TETHER</span>
            <span className="stat-val text-purple">LOCKED</span>
          </div>
        </div>

        <div className="mode-gesture-grid">
          {SPACE_COMMANDS.map((item) => {
            const Icon = item.icon;
            const isMatch = tracking.confirmedGesture === item.gesture;

            return (
              <div
                key={item.gesture}
                className={`mode-action-card space-card ${isMatch ? 'active-triggered' : ''}`}
                onClick={() => addToast(`EVA Command: ${item.label}`, 'info')}
              >
                <div className="action-card-top">
                  <div className="action-icon-box">
                    <Icon size={18} className="text-purple" />
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
