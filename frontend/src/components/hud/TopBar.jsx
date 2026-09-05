import React from 'react';
import {
  Activity,
  Radio,
  Eye,
  EyeOff,
  Sparkles,
  Cpu,
  ShieldCheck,
  User,
  LogOut
} from 'lucide-react';
import { useAgent44Store } from '../../store/useAgent44Store';
import { useAuthStore } from '../../store/useAuthStore';
import { VoiceControlBtn } from '../voice/VoiceControlBtn';

export function TopBar({ onOpenSimulator }) {
  const activeMode = useAgent44Store((s) => s.activeMode);
  const tracking = useAgent44Store((s) => s.tracking);
  const toggleLandmarks = useAgent44Store((s) => s.toggleLandmarks);
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);

  const isAdmin = currentUser?.role === 'admin';

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
          <span className="brand-caption">CONTEXT-AWARE SMART ROOM & DIGITAL TWIN</span>
        </div>
      </div>

      {/* 2. Active Mode Indicator */}
      <div className="topbar-mode-badge" role="status" aria-label="Current Mode">
        <span className="mode-label-prefix">MODE:</span>
        <span className="mode-name-active">{activeMode.replace(/_/g, ' ')}</span>
      </div>

      {/* 3. Hardware & Vision Telemetry Status + User Profile */}
      <div className="topbar-status-group">
        <div
          className="status-pill presence-active"
          title="Physical ESP32 Hardware: Light, Buzzer, Servo Door & DHT11"
        >
          <Cpu size={13} className="text-emerald animate-pulse" />
          <span>ESP32 HARDWARE CONNECTED</span>
        </div>

        <div className={`status-pill ${tracking.cameraActive ? 'online' : 'connecting'}`}>
          <Radio size={13} className={tracking.cameraActive ? 'text-emerald animate-pulse' : 'text-amber'} />
          <span>{tracking.cameraActive ? 'VISION ACTIVE' : 'INITIALIZING...'}</span>
        </div>

        {/* Lightweight Event-Driven Voice Control */}
        <VoiceControlBtn />

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

        {/* User Role Badge & Logout */}
        {currentUser && (
          <div className="topbar-user-section">
            <div
              className={`topbar-user-badge ${isAdmin ? 'admin' : 'guest'}`}
              title={isAdmin ? 'Logged in as Admin (Full Hardware Access)' : 'Logged in as Guest (Simulation Only)'}
            >
              {isAdmin ? (
                <ShieldCheck size={13} className="text-emerald" />
              ) : (
                <User size={13} className="text-cyan" />
              )}
              <span className="user-role-text">
                {isAdmin ? 'ADMIN: tanmay' : 'GUEST: guest'}
              </span>
            </div>

            <button
              className="topbar-icon-btn logout-btn"
              onClick={logout}
              title="Logout from Agent 44"
              aria-label="Logout"
            >
              <LogOut size={14} className="text-rose" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
