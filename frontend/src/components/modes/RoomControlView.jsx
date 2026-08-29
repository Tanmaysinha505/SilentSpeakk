import React, { useState } from 'react';
import { RoomCanvas } from '../scene/RoomCanvas';
import { PIPCameraFeed } from '../camera/PIPCameraFeed';
import { useCommandStore } from '../../store/useCommandStore';
import { useAgent44Store } from '../../store/useAgent44Store';
import {
  Lightbulb,
  Fan,
  DoorOpen,
  DoorClosed,
  Tv,
  Eye,
  Sliders,
  Sparkles,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Hand,
  Sun,
  Wind,
  Thermometer
} from 'lucide-react';

const CAMERA_PRESETS = [
  { id: 'DEFAULT', label: 'Orbit' },
  { id: 'LIGHT', label: 'Light' },
  { id: 'FAN', label: 'Fan' },
  { id: 'DOOR', label: 'Door' },
  { id: 'TV', label: 'TV' },
  { id: 'TOP_DOWN', label: 'Top' },
];

export function RoomControlView({ onOpenLearner }) {
  const light = useCommandStore((s) => s.light);
  const fan = useCommandStore((s) => s.fan);
  const door = useCommandStore((s) => s.door);
  const tv = useCommandStore((s) => s.tv);
  const blinds = useCommandStore((s) => s.blinds || { open: true });
  const ac = useCommandStore((s) => s.ac || { on: true, temp: 21 });
  const cameraPreset = useCommandStore((s) => s.cameraPreset);
  const setCameraPreset = useCommandStore((s) => s.setCameraPreset);
  const dispatchCommand = useCommandStore((s) => s.dispatchCommand);

  const confirmedGesture = useAgent44Store((s) => s.tracking.confirmedGesture);

  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(true);

  return (
    <div className="room-control-fullscreen-container">
      {/* 1. Master React Three Fiber 3D Canvas */}
      <RoomCanvas />

      {/* 2. Floating Live PIP Camera HUD (Shows user's hand & skeleton in real time) */}
      <PIPCameraFeed />

      {/* 3. Responsive 3D Object Status Bar & Gesture Guide */}
      <div className={`room-status-overlay ${isPanelCollapsed ? 'collapsed' : ''}`} aria-label="3D Room Object States">
        <div className="status-overlay-header">
          <div className="title-box">
            <Sliders size={14} className="text-cyan" />
            <span>3D ROOM STATUS & GESTURES</span>
          </div>

          <div className="header-actions-box">
            <button
              className="panel-action-btn"
              onClick={() => setShowCheatSheet(!showCheatSheet)}
              title={showCheatSheet ? 'Hide Gesture Guide' : 'Show Gesture Guide'}
            >
              <HelpCircle size={14} className="text-cyan" />
            </button>
            <button
              className="panel-action-btn"
              onClick={onOpenLearner}
              title="Teach gesture in Room Control mode"
            >
              <GraduationCap size={13} />
            </button>
            <button
              className="panel-action-btn"
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              title={isPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {isPanelCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
        </div>

        {!isPanelCollapsed && (
          <>
            {/* Gesture Quick Reference Guide Banner */}
            {showCheatSheet && (
              <div className="room-cheat-sheet">
                <div className="cheat-sheet-title">
                  <Hand size={12} className="text-cyan" />
                  <span>GESTURE CONTROL CHEAT SHEET:</span>
                </div>
                <div className="cheat-sheet-items">
                  <div className="cheat-item">✋ <strong>Open Palm</strong> ➔ Light ON</div>
                  <div className="cheat-item">✊ <strong>Fist</strong> ➔ Light OFF</div>
                  <div className="cheat-item">☝️ <strong>Point Up</strong> ➔ Fan ON</div>
                  <div className="cheat-item">👇 <strong>Point Down</strong> ➔ Fan OFF</div>
                  <div className="cheat-item">👍 <strong>Thumb Up</strong> ➔ Door OPEN</div>
                  <div className="cheat-item">👎 <strong>Thumb Down</strong> ➔ Door CLOSE</div>
                  <div className="cheat-item">✌️ <strong>Peace / Victory</strong> ➔ TV Power</div>
                  <div className="cheat-item">🤘 <strong>Rock On</strong> ➔ Party Mode</div>
                </div>
              </div>
            )}

            <div className="object-status-grid">
              {/* 1. Ceiling Light Status */}
              <div
                className={`obj-status-card ${light.on ? 'on' : 'off'} ${
                  confirmedGesture === 'OPEN_PALM' || confirmedGesture === 'CLOSED_FIST' ? 'active-gesture-target' : ''
                }`}
              >
                <div className="obj-header">
                  <Lightbulb size={15} className={light.on ? 'text-amber glow-icon' : 'text-muted'} />
                  <span className="obj-name">CEILING LIGHT</span>
                  <span className="device-gesture-hint">✋ Open / ✊ Fist</span>
                </div>
                <div className="obj-state-value">
                  {light.on ? 'ON (POINTLIGHT ACTIVE)' : 'OFF (EXTINGUISHED)'}
                </div>
                <div className="obj-quick-btns">
                  <button
                    className={`quick-cmd-btn ${light.on ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('LIGHT_ON')}
                    title="Gesture: ✋ OPEN PALM"
                  >
                    ✋ ON (Palm)
                  </button>
                  <button
                    className={`quick-cmd-btn ${!light.on ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('LIGHT_OFF')}
                    title="Gesture: ✊ CLOSED FIST"
                  >
                    ✊ OFF (Fist)
                  </button>
                </div>
              </div>

              {/* 2. Ceiling Fan Status */}
              <div
                className={`obj-status-card ${fan.on ? 'on' : 'off'} ${
                  confirmedGesture === 'INDEX_POINT' || confirmedGesture === 'POINT_DOWN' ? 'active-gesture-target' : ''
                }`}
              >
                <div className="obj-header">
                  <Fan size={15} className={fan.on ? 'text-cyan spin-anim glow-icon' : 'text-muted'} />
                  <span className="obj-name">CEILING FAN</span>
                  <span className="device-gesture-hint">☝️ Up / 👇 Down</span>
                </div>
                <div className="obj-state-value">
                  {fan.on ? 'SPINNING (12.0 RAD/S)' : 'STATIONARY'}
                </div>
                <div className="obj-quick-btns">
                  <button
                    className={`quick-cmd-btn ${fan.on ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('FAN_ON')}
                    title="Gesture: ☝️ POINT UP"
                  >
                    ☝️ ON (Point Up)
                  </button>
                  <button
                    className={`quick-cmd-btn ${!fan.on ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('FAN_OFF')}
                    title="Gesture: 👇 POINT DOWN"
                  >
                    👇 OFF (Point Down)
                  </button>
                </div>
              </div>

              {/* 3. Smart Entrance Door Status */}
              <div
                className={`obj-status-card ${door.open ? 'on' : 'off'} ${
                  confirmedGesture === 'THUMB_UP' || confirmedGesture === 'THUMB_DOWN' ? 'active-gesture-target' : ''
                }`}
              >
                <div className="obj-header">
                  {door.open ? (
                    <DoorOpen size={15} className="text-emerald glow-icon" />
                  ) : (
                    <DoorClosed size={15} className="text-muted" />
                  )}
                  <span className="obj-name">SMART ENTRANCE DOOR</span>
                  <span className="device-gesture-hint">👍 Open / 👎 Close</span>
                </div>
                <div className="obj-state-value">
                  {door.open ? 'OPEN (83° HINGE)' : 'CLOSED & LATCHED'}
                </div>
                <div className="obj-quick-btns">
                  <button
                    className={`quick-cmd-btn ${door.open ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('DOOR_OPEN')}
                    title="Gesture: 👍 THUMBS UP"
                  >
                    👍 OPEN (Thumb Up)
                  </button>
                  <button
                    className={`quick-cmd-btn ${!door.open ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('DOOR_CLOSE')}
                    title="Gesture: 👎 THUMBS DOWN"
                  >
                    👎 CLOSE (Thumb Down)
                  </button>
                </div>
              </div>

              {/* 4. Smart OLED TV Status */}
              <div
                className={`obj-status-card ${tv.on ? 'on' : 'off'} ${
                  confirmedGesture === 'VICTORY' ? 'active-gesture-target' : ''
                }`}
              >
                <div className="obj-header">
                  <Tv size={15} className={tv.on ? 'text-purple glow-icon' : 'text-muted'} />
                  <span className="obj-name">SMART OLED TV</span>
                  <span className="device-gesture-hint">✌️ Peace / Victory</span>
                </div>
                <div className="obj-state-value">
                  {tv.on ? 'ACTIVE (STREAMING)' : 'STANDBY'}
                </div>
                <div className="obj-quick-btns">
                  <button
                    className={`quick-cmd-btn ${tv.on ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('TV_TOGGLE')}
                    title="Gesture: ✌️ VICTORY / PEACE"
                  >
                    ✌️ POWER (Peace)
                  </button>
                  <button
                    className="quick-cmd-btn"
                    onClick={() => dispatchCommand('PARTY_MODE')}
                    title="Gesture: 🤘 ROCK ON"
                  >
                    🤘 PARTY (Rock On)
                  </button>
                </div>
              </div>

              {/* 5. Smart Window Blinds */}
              <div className={`obj-status-card ${blinds.open ? 'on' : 'off'}`}>
                <div className="obj-header">
                  <Sun size={15} className={blinds.open ? 'text-amber glow-icon' : 'text-muted'} />
                  <span className="obj-name">WINDOW BLINDS</span>
                  <span className="device-gesture-hint">Open / Close</span>
                </div>
                <div className="obj-state-value">
                  {blinds.open ? 'OPEN (DAYLIGHT WASH)' : 'CLOSED (PRIVACY)'}
                </div>
                <div className="obj-quick-btns">
                  <button
                    className={`quick-cmd-btn ${blinds.open ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('BLINDS_OPEN')}
                  >
                    OPEN
                  </button>
                  <button
                    className={`quick-cmd-btn ${!blinds.open ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('BLINDS_CLOSE')}
                  >
                    CLOSE
                  </button>
                </div>
              </div>

              {/* 6. Smart Climate AC */}
              <div className={`obj-status-card ${ac.on ? 'on' : 'off'}`}>
                <div className="obj-header">
                  <Wind size={15} className={ac.on ? 'text-cyan spin-anim glow-icon' : 'text-muted'} />
                  <span className="obj-name">SMART CLIMATE AC</span>
                  <span className="device-gesture-hint">{ac.temp}°C Cooling</span>
                </div>
                <div className="obj-state-value">
                  {ac.on ? `ACTIVE COOLING (${ac.temp}°C)` : 'STANDBY (OFF)'}
                </div>
                <div className="obj-quick-btns">
                  <button
                    className={`quick-cmd-btn ${ac.on ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('AC_TOGGLE')}
                  >
                    {ac.on ? 'POWER OFF' : 'POWER ON'}
                  </button>
                  <button
                    className="quick-cmd-btn"
                    onClick={() => dispatchCommand('TEMP_DOWN')}
                    title="Lower temperature"
                  >
                    -1°C
                  </button>
                  <button
                    className="quick-cmd-btn"
                    onClick={() => dispatchCommand('TEMP_UP')}
                    title="Raise temperature"
                  >
                    +1°C
                  </button>
                </div>
              </div>
            </div>

            {/* Viewpoint Controller */}
            <div className="room-camera-strip">
              <span className="cam-strip-label">
                <Eye size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                VIEW:
              </span>
              <div className="cam-btns-row">
                {CAMERA_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    className={`cam-btn ${cameraPreset === p.id ? 'active' : ''}`}
                    onClick={() => setCameraPreset(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
