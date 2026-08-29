import React from 'react';
import {
  Hand,
  ArrowUp,
  ArrowDown,
  ThumbsUp,
  ThumbsDown,
  CircleDot,
  Tv,
  Sparkles,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { useCommandStore } from '../../store/useCommandStore';

const GESTURE_ICONS = {
  OPEN_PALM: Hand,
  FIST: CircleDot,
  POINT_UP: ArrowUp,
  POINT_DOWN: ArrowDown,
  THUMBS_UP: ThumbsUp,
  THUMBS_DOWN: ThumbsDown,
  VICTORY: Tv,
  ROCK_ON: Sparkles,
  DEFAULT: Zap
};

export function GestureCard() {
  const telemetry = useCommandStore((s) => s.telemetry);

  const IconComponent = GESTURE_ICONS[telemetry.gesture] || GESTURE_ICONS.DEFAULT;
  const conf = Math.min(100, Math.max(0, telemetry.confidence || 0));

  // Determine confidence color ramp
  const confColor =
    conf >= 85 ? 'var(--neon-emerald)' : conf >= 70 ? 'var(--neon-cyan)' : 'var(--neon-amber)';

  return (
    <section className="hud-card gesture-card" aria-labelledby="gesture-heading">
      <div className="card-header">
        <div className="badge-live">
          <span className="ping-dot"></span>
          <span>CV VISION TELEMETRY</span>
        </div>
        <span className="source-tag">{telemetry.source}</span>
      </div>

      <div className="gesture-main-body">
        {/* Left: Gesture Icon Emblem */}
        <div className="gesture-icon-orb">
          <IconComponent size={28} className="gesture-svg" />
        </div>

        {/* Right: Gesture & Intent Info */}
        <div className="gesture-details">
          <div className="hud-metric-label" id="gesture-heading">
            CURRENT GESTURE DETECTED
          </div>
          <div className="gesture-name-display">
            {telemetry.gesture.replace(/_/g, ' ')}
          </div>

          <div className="intent-badge-row">
            <span className="intent-prefix">INTERPRETED INTENT:</span>
            <span className="intent-badge">{telemetry.intent}</span>
          </div>

          {telemetry.target && (
            <div className="target-row">
              <span className="target-label">Target Entity:</span>
              <span className="target-val">{telemetry.target}</span>
            </div>
          )}
        </div>
      </div>

      {/* Confidence Meter */}
      <div className="confidence-container">
        <div className="confidence-header">
          <span className="conf-label">
            <ShieldCheck size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            DETECTION CONFIDENCE
          </span>
          <span className="conf-value" style={{ color: confColor }}>
            {conf.toFixed(1)}%
          </span>
        </div>

        <div className="confidence-track" role="progressbar" aria-valuenow={conf} aria-valuemin="0" aria-valuemax="100">
          <div
            className="confidence-fill"
            style={{
              width: `${conf}%`,
              background: `linear-gradient(90deg, #00f3ff, ${confColor})`,
              boxShadow: `0 0 10px ${confColor}`
            }}
          />
        </div>
      </div>
    </section>
  );
}
