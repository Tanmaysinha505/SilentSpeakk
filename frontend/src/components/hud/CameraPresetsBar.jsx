import React from 'react';
import { Eye, Lightbulb, Fan, DoorOpen, Tv, Grid } from 'lucide-react';
import { useCommandStore } from '../../store/useCommandStore';

const PRESETS = [
  { id: 'DEFAULT', label: 'Room Orbit', icon: Eye },
  { id: 'LIGHT', label: 'Ceiling Light', icon: Lightbulb },
  { id: 'FAN', label: 'Smart Fan', icon: Fan },
  { id: 'DOOR', label: 'Smart Door', icon: DoorOpen },
  { id: 'TV', label: 'OLED TV', icon: Tv },
  { id: 'TOP_DOWN', label: 'Top-Down', icon: Grid },
];

export function CameraPresetsBar() {
  const currentPreset = useCommandStore((s) => s.cameraPreset);
  const setCameraPreset = useCommandStore((s) => s.setCameraPreset);

  return (
    <div className="camera-presets-bar" role="toolbar" aria-label="3D Camera Viewpoints">
      <span className="preset-bar-title">VIEWPOINT:</span>
      <div className="presets-group">
        {PRESETS.map((p) => {
          const Icon = p.icon;
          const isActive = currentPreset === p.id;
          return (
            <button
              key={p.id}
              className={`preset-btn ${isActive ? 'active' : ''}`}
              onClick={() => setCameraPreset(p.id)}
              title={`Switch camera view to ${p.label}`}
              aria-pressed={isActive}
            >
              <Icon size={13} />
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
