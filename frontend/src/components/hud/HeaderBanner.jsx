import React from 'react';
import {
  Activity,
  Volume2,
  VolumeX,
  Contrast,
  RotateCcw,
  Sparkles,
  Radio
} from 'lucide-react';
import { useCommandStore } from '../../store/useCommandStore';

export function HeaderBanner({ onOpenSimulator }) {
  const telemetry = useCommandStore((s) => s.telemetry);
  const accessibility = useCommandStore((s) => s.accessibility);
  const partyMode = useCommandStore((s) => s.partyMode);
  const toggleAudio = useCommandStore((s) => s.toggleAudioFeedback);
  const toggleContrast = useCommandStore((s) => s.toggleHighContrast);
  const dispatchCommand = useCommandStore((s) => s.dispatchCommand);

  return (
    <header className="hud-header">
      <div className="hud-brand">
        <div className="brand-badge-pulse">
          <Activity size={18} className="text-cyan animate-pulse" />
        </div>
        <div>
          <h1 className="brand-title">
            AirOS <span>SMART ROOM 3D</span>
          </h1>
          <p className="brand-subtitle">
            REACT THREE FIBER // GESTURE COMMAND TELEMETRY
          </p>
        </div>
      </div>

      <div className="hud-header-center">
        <div className={`status-pill ${telemetry.connectedToBackend ? 'connected' : 'standalone'}`}>
          <Radio size={14} className={telemetry.connectedToBackend ? 'animate-pulse text-emerald' : 'text-cyan'} />
          <span>
            {telemetry.connectedToBackend
              ? 'AIR OS WEBCAM CONNECTED'
              : 'VISION ENGINE: STANDBY'}
          </span>
        </div>

        <button
          className="hud-btn hud-btn-sim"
          onClick={onOpenSimulator}
          title="Open MediaPipe Gesture Simulator & Tester"
          aria-label="Open Gesture Simulator"
        >
          <Sparkles size={14} />
          <span>Simulate Gestures</span>
        </button>
      </div>

      <div className="hud-header-actions">
        {/* Party Mode Quick Button */}
        <button
          className={`hud-icon-btn ${partyMode ? 'active-party' : ''}`}
          onClick={() => dispatchCommand('PARTY_MODE')}
          title="Toggle Party Lighting Mode"
          aria-label="Toggle Party Mode"
        >
          <Sparkles size={16} />
        </button>

        {/* Audio Toggle */}
        <button
          className={`hud-icon-btn ${accessibility.audioEnabled ? 'active' : ''}`}
          onClick={toggleAudio}
          title={accessibility.audioEnabled ? 'Mute Audio Feedback' : 'Enable Audio Feedback'}
          aria-label="Toggle Sound Effects"
        >
          {accessibility.audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        {/* High Contrast Mode Toggle */}
        <button
          className={`hud-icon-btn ${accessibility.highContrast ? 'active' : ''}`}
          onClick={toggleContrast}
          title="Toggle Accessibility High Contrast Mode"
          aria-label="Toggle High Contrast"
        >
          <Contrast size={16} />
        </button>

        {/* Reset Room Button */}
        <button
          className="hud-icon-btn"
          onClick={() => dispatchCommand('RESET_ROOM')}
          title="Reset Room to Default State"
          aria-label="Reset Room"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </header>
  );
}
