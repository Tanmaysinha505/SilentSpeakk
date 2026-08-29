import React from 'react';
import {
  Hand,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Activity,
  Zap
} from 'lucide-react';
import { useAgent44Store } from '../../store/useAgent44Store';

export function GestureStatusPanel() {
  const tracking = useAgent44Store((s) => s.tracking);
  const activeMode = useAgent44Store((s) => s.activeMode);

  const displayGesture =
    tracking.status === 'CONFIRMED'
      ? tracking.confirmedGesture
      : tracking.rawGesture !== 'NONE'
      ? tracking.rawGesture
      : 'NONE';

  const statusColor =
    tracking.status === 'CONFIRMED'
      ? 'var(--neon-emerald)'
      : tracking.status === 'STABILIZING'
      ? 'var(--neon-cyan)'
      : 'var(--neon-amber)';

  const StatusIcon =
    tracking.status === 'CONFIRMED'
      ? CheckCircle2
      : tracking.status === 'STABILIZING'
      ? Clock
      : Search;

  return (
    <aside className="hud-card gesture-status-card" aria-labelledby="status-panel-title">
      <div className="status-card-header">
        <div className="title-row">
          <Activity size={15} className="text-cyan" />
          <h2 id="status-panel-title" className="card-title">
            NEURAL GESTURE STATUS
          </h2>
        </div>
        <span className="source-pill">{tracking.source}</span>
      </div>

      {/* 1. Detected Gesture */}
      <div className="status-metric-group">
        <div className="metric-label">DETECTED GESTURE</div>
        <div className="gesture-display-name">
          <Hand size={20} className="text-cyan" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
          {displayGesture.replace(/_/g, ' ')}
        </div>
      </div>

      {/* 2. State Machine Status (Searching / Stabilizing / Confirmed) */}
      <div className="status-metric-group">
        <div className="metric-label">STABILITY ENGINE STATE</div>
        <div className="state-badge-row">
          <div className="stability-badge" style={{ borderColor: statusColor, color: statusColor }}>
            <StatusIcon size={14} className={tracking.status === 'STABILIZING' ? 'animate-spin' : ''} />
            <span>{tracking.status}</span>
          </div>
          <span className="fps-indicator">{tracking.fps} FPS</span>
        </div>
      </div>

      {/* 3. Confidence Level */}
      <div className="status-metric-group">
        <div className="metric-label-row">
          <span className="metric-label">CONFIDENCE RATING</span>
          <span className="confidence-numeric" style={{ color: statusColor }}>
            {tracking.confidence}%
          </span>
        </div>
        <div className="confidence-track" role="progressbar" aria-valuenow={tracking.confidence} aria-valuemin="0" aria-valuemax="100">
          <div
            className="confidence-fill"
            style={{
              width: `${Math.min(100, Math.max(0, tracking.confidence))}%`,
              backgroundColor: statusColor,
              boxShadow: `0 0 12px ${statusColor}`
            }}
          />
        </div>
      </div>

      {/* 4. Interpreted Intent */}
      <div className="status-metric-group intent-group">
        <div className="metric-label">INTERPRETED INTENT [{activeMode.replace(/_/g, ' ')}]</div>
        <div className="intent-box">
          <Zap size={14} className="text-cyan" />
          <span className="intent-text">{tracking.intent}</span>
        </div>
      </div>
    </aside>
  );
}
