import React from 'react';
import {
  Activity,
  Radio,
  Eye,
  EyeOff,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw
} from 'lucide-react';
import { useAgent44Store } from '../../store/useAgent44Store';

export function TopBar({ onOpenSimulator }) {
  const activeMode = useAgent44Store((s) => s.activeMode);
  const tracking = useAgent44Store((s) => s.tracking);
  const toggleLandmarks = useAgent44Store((s) => s.toggleLandmarks);
  const dispatchRoomCommand = useAgent44Store((s) => s.dispatchRoomCommand);
  const addToast = useAgent44Store((s) => s.addToast);

  return (
    <header className="agent44-topbar">
      {/* 1. Agent 44 Brand & Logo */}
      <div className="topbar-brand">
        <div className="brand-orb">
          <Activity size={18} className="text-cyan animate-pulse" />
        </div>
        <div className="brand-text">
          <h1 className="brand-name">
            AGENT <span>44</span>
          </h1>
          <span className="brand-caption">CONTEXT-AWARE AI GESTURE SYSTEM</span>
        </div>
      </div>

      {/* 2. Current Mode Indicator (Highlighted) */}
      <div className="topbar-mode-badge" role="status" aria-label="Current Mode">
        <span className="mode-label-prefix">CURRENT MODE:</span>
        <span className="mode-name-active">{activeMode.replace(/_/g, ' ')}</span>
      </div>

      {/* 3. Camera & Tracking Status */}
      <div className="topbar-status-group">
        <div className={`status-pill ${tracking.cameraActive ? 'online' : 'connecting'}`}>
          <Radio size={13} className={tracking.cameraActive ? 'text-emerald animate-pulse' : 'text-amber'} />
          <span>{tracking.cameraActive ? 'VISION ENGINE ACTIVE' : 'INITIALIZING VISION...'}</span>
        </div>

        {/* Landmarks Toggle */}
        <button
          className="topbar-icon-btn"
          onClick={toggleLandmarks}
          title={tracking.showLandmarks ? 'Hide Hand Mesh' : 'Show Hand Mesh'}
          aria-label="Toggle Hand Landmarks Mesh"
        >
          {tracking.showLandmarks ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>

        {/* Quick Simulator Modal Trigger */}
        <button
          className="topbar-action-btn"
          onClick={onOpenSimulator}
          title="Open MediaPipe Gesture Simulator"
          aria-label="Open Gesture Simulator"
        >
          <Sparkles size={14} />
          <span>Simulate</span>
        </button>

        {/* Quick Reset Button if in Room Control */}
        {activeMode === 'ROOM_CONTROL' && (
          <button
            className="topbar-icon-btn"
            onClick={() => dispatchRoomCommand('PARTY_MODE')}
            title="Party Mode Lighting"
            aria-label="Toggle Party Mode"
          >
            <Sparkles size={15} className="text-purple" />
          </button>
        )}
      </div>
    </header>
  );
}
