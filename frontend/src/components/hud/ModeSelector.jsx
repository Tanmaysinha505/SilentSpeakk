import React, { useState, useEffect } from 'react';
import {
  Home,
  BookOpen,
  HeartPulse,
  MessageSquare,
  Rocket,
  Sliders,
  Sparkles,
  PlusCircle,
  GraduationCap,
  Monitor
} from 'lucide-react';
import { useAgent44Store } from '../../store/useAgent44Store';

const DEFAULT_MODES = [
  {
    id: 'ROOM_CONTROL',
    name: 'ROOM CONTROL',
    icon: Home,
    badge: '3D SMART ROOM',
    desc: 'Interactive Three.js Room (Light, Fan, Door, TV)',
    color: '#00f3ff'
  },
  {
    id: 'DESKTOP',
    name: 'DESKTOP OS',
    icon: Monitor,
    badge: 'MOUSE & OS',
    desc: 'Touchless index cursor, Win+D, left/right clicks',
    color: '#06b6d4'
  },
  {
    id: 'CLASSROOM',
    name: 'CLASSROOM',
    icon: GraduationCap,
    badge: 'INTROVERT AID',
    desc: 'Silent doubt signaling & teacher HUD',
    color: '#eab308'
  },
  {
    id: 'LIBRARY',
    name: 'LIBRARY',
    icon: BookOpen,
    badge: 'SILENT',
    desc: 'Quiet study desk gesture requests & assistance',
    color: '#38bdf8'
  },
  {
    id: 'HOSPITAL',
    name: 'HOSPITAL',
    icon: HeartPulse,
    badge: 'CARE & ER',
    desc: 'Patient water, pain alert & emergency nurse call',
    color: '#f43f5e'
  },
  {
    id: 'COMMUNICATION',
    name: 'COMMUNICATION',
    icon: MessageSquare,
    badge: 'TTS SPEECH',
    desc: 'Gesture to text display and spoken audio voice',
    color: '#10b981'
  },
  {
    id: 'SPACE',
    name: 'SPACE EVA',
    icon: Rocket,
    badge: 'ZERO-G',
    desc: 'Astronaut telemetry, thrusters & airlock checks',
    color: '#a855f7'
  },
  {
    id: 'CUSTOM',
    name: 'CUSTOM LEARN',
    icon: Sliders,
    badge: 'AI STUDIO',
    desc: 'Assign personalized shortcuts to hand poses',
    color: '#f59e0b'
  }
];

export function ModeSelector({ onOpenLearner }) {
  const activeMode = useAgent44Store((s) => s.activeMode);
  const setActiveMode = useAgent44Store((s) => s.setActiveMode);
  const [allModes, setAllModes] = useState(DEFAULT_MODES);

  useEffect(() => {
    try {
      const userModes = JSON.parse(localStorage.getItem('agent44_user_modes') || '[]');
      if (userModes.length > 0) {
        const formatted = userModes.map((um) => ({
          ...um,
          icon: Sliders
        }));
        setAllModes([...DEFAULT_MODES, ...formatted]);
      }
    } catch (e) {}
  }, [activeMode]);

  return (
    <nav className="mode-selector-dock" aria-label="Interaction Modes">
      <div className="dock-top-bar">
        <div className="dock-label">
          <Sparkles size={14} className="text-cyan" />
          <span>INTERACTION MODES</span>
        </div>

        {/* Global Teach Gesture / Create Mode Button in every mode */}
        <button
          className="dock-teach-btn"
          onClick={onOpenLearner}
          title="Teach gesture in current mode or create new mode"
        >
          <GraduationCap size={13} />
          <span>Teach / New Mode</span>
        </button>
      </div>

      <div className="mode-cards-strip">
        {allModes.map((m) => {
          const Icon = m.icon;
          const isActive = activeMode === m.id;

          return (
            <button
              key={m.id}
              className={`mode-dock-card ${isActive ? 'active' : ''} ${m.id === 'ROOM_CONTROL' ? 'room-card' : ''}`}
              onClick={() => setActiveMode(m.id)}
              aria-pressed={isActive}
              title={`Switch to ${m.name} Mode`}
            >
              <div className="card-top-row">
                <div className="card-icon-box" style={{ color: m.color }}>
                  <Icon size={18} />
                </div>
                <span className="card-badge" style={{ borderColor: `${m.color}55`, color: m.color }}>
                  {m.badge}
                </span>
              </div>

              <div className="card-text-block">
                <div className="card-mode-name">{m.name}</div>
                <div className="card-mode-desc">{m.desc}</div>
              </div>

              {isActive && <div className="card-active-indicator" style={{ background: m.color }} />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
