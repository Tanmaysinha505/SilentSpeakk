import React, { useState } from 'react';
import { RoomCanvas } from '../scene/RoomCanvas';
import { PIPCameraFeed } from '../camera/PIPCameraFeed';
import { GestureStatusPanel } from '../hud/GestureStatusPanel';
import { VoiceControlBtn } from '../voice/VoiceControlBtn';
import { useCommandStore } from '../../store/useCommandStore';
import { useAgent44Store } from '../../store/useAgent44Store';
import { useAuthStore } from '../../store/useAuthStore';
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
  Thermometer,
  Bell,
  Cpu,
  Droplets,
  Activity,
  Layers,
  ShieldAlert
} from 'lucide-react';

const CAMERA_PRESETS = [
  { id: 'DEFAULT', label: 'Orbit' },
  { id: 'LIGHT', label: 'Light' },
  { id: 'FAN', label: 'Fan' },
  { id: 'DOOR', label: 'Door' },
  { id: 'TV', label: 'TV' },
  { id: 'TOP_DOWN', label: 'Top' },
];

const ROOM_OPTIONS = [
  { id: 'room1', name: 'Master Room', icon: '🏠', isHardware: true },
  { id: 'room2', name: 'Living Room', icon: '🛋️', isHardware: false },
  { id: 'room3', name: 'Study Room', icon: '📚', isHardware: false },
  { id: 'room4', name: 'Guest Room', icon: '🛏️', isHardware: false },
];

export function RoomControlView({ onOpenLearner }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isGuest = currentUser?.role === 'guest';
  const activeRoomId = useCommandStore((s) => s.activeRoomId || 'room1');
  const setActiveRoom = useCommandStore((s) => s.setActiveRoom);
  const rooms = useCommandStore((s) => s.rooms);
  const activeRoom = rooms[activeRoomId] || rooms.room1;

  const light = activeRoom.light;
  const fan = activeRoom.fan;
  const door = activeRoom.door;
  const tv = activeRoom.tv;
  const ac = activeRoom.ac;
  const buzzer = activeRoom.buzzer;
  const blinds = activeRoom.blinds;
  const isMaster = activeRoom.isPhysical;

  const sensors = useCommandStore((s) => s.sensors || { temperature: 29.0, humidity: 58 });
  const presence = useCommandStore((s) => s.presence || { motionDetected: false });

  const dispatchCommand = useCommandStore((s) => s.dispatchCommand);
  const cameraPreset = useCommandStore((s) => s.cameraPreset);
  const setCameraPreset = useCommandStore((s) => s.setCameraPreset);
  const confirmedGesture = useAgent44Store((s) => s.tracking.confirmedGesture);

  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  return (
    <div className="room-control-fullscreen-container">
      {/* 1. Master React Three Fiber 3D Canvas (Full Screen Center Focus) */}
      <RoomCanvas />

      {/* 2. Left HUD Column: Neural Gesture Status + Live Hand Sensor Camera */}
      <div className="agent44-left-hud-column">
        <GestureStatusPanel />
        <PIPCameraFeed />
      </div>

      {/* 3. Top Floating Room Switcher & Telemetry Strip */}
      <div className="room-top-nav-bar">
        <div className="multiroom-switch-strip">
          {ROOM_OPTIONS.map((r) => (
            <button
              key={r.id}
              className={`room-tab-pill ${activeRoomId === r.id ? 'active' : ''} ${r.isHardware ? 'hw-pill' : ''}`}
              onClick={() => setActiveRoom(r.id)}
            >
              <span className="room-tab-icon">{r.icon}</span>
              <span className="room-tab-name">{r.name}</span>
              {r.isHardware && <span className="hw-mini-tag">HW</span>}
            </button>
          ))}
        </div>

        {isMaster ? (
          <div className="hw-connection-badge" title="Master Bedroom connected to ESP32 on GPIO 2, 25, 26, 33">
            <Cpu size={13} className="text-emerald animate-pulse" />
            <span>ESP32 HW</span>
          </div>
        ) : (
          <div className="digital-twin-badge" title="Independent simulated digital twin room">
            <Layers size={13} className="text-cyan" />
            <span>DIGITAL TWIN</span>
          </div>
        )}

        <div className="telemetry-chips-row">
          <div className="telemetry-chip">
            <Thermometer size={12} className="text-amber" />
            <span className="chip-label">TEMP:</span>
            <span className="chip-val text-amber">
              {isMaster ? `${sensors.temperature}°C` : `${ac.temp}°C`}
            </span>
          </div>

          {isMaster && (
            <>
              <div className="telemetry-chip">
                <Droplets size={12} className="text-cyan" />
                <span className="chip-label">HUMIDITY:</span>
                <span className="chip-val text-cyan">{sensors.humidity}%</span>
              </div>

              <div className="telemetry-chip">
                <Activity size={12} className={presence.motionDetected ? 'text-emerald' : 'text-muted'} />
                <span className="chip-label">PIR:</span>
                <span className={`chip-val ${presence.motionDetected ? 'text-emerald' : 'text-muted'}`}>
                  {presence.motionDetected ? 'ACTIVE' : 'IDLE'}
                </span>
              </div>
            </>
          )}

          {/* Voice Command Button in Top Bar */}
          <VoiceControlBtn variant="room-bar" />
        </div>
      </div>

      {/* 4. Right Compact Room Controls Overlay */}
      <div className={`room-right-controls-panel ${isPanelCollapsed ? 'collapsed' : ''}`} aria-label="Room Controls">
        <div className="panel-header-row">
          <div className="title-box">
            <Sliders size={13} className="text-cyan" />
            <span>{activeRoom.name.toUpperCase()}</span>
          </div>

          <div className="header-actions-box">
            <button
              className={`panel-action-btn ${showCheatSheet ? 'active' : ''}`}
              onClick={() => setShowCheatSheet(!showCheatSheet)}
              title="Toggle Gesture Guide"
            >
              <HelpCircle size={13} className="text-cyan" />
            </button>
            <button
              className="panel-action-btn"
              onClick={onOpenLearner}
              title="Teach gesture in current mode"
            >
              <GraduationCap size={13} />
            </button>
            <button
              className="panel-action-btn"
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              title={isPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {isPanelCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </button>
          </div>
        </div>

        {!isPanelCollapsed && (
          <div className="panel-scroll-content">
            {/* Guest Hardware Notification Banner */}
            {isGuest && isMaster && (
              <div className="guest-hw-notice">
                <ShieldAlert size={13} className="text-amber" />
                <span>Guest Mode: Master Room hardware is read-only</span>
              </div>
            )}

            {/* Gesture Guide Accordion */}
            {showCheatSheet && (
              <div className="room-cheat-sheet">
                <div className="cheat-sheet-title">
                  <Hand size={11} className="text-cyan" />
                  <span>GESTURE GUIDE:</span>
                </div>
                <div className="cheat-sheet-items">
                  <div className="cheat-item">✋ <strong>Palm</strong> ➔ Light ON</div>
                  <div className="cheat-item">✊ <strong>Fist</strong> ➔ Light OFF</div>
                  <div className="cheat-item">☝️ <strong>Point Up</strong> ➔ Fan ON</div>
                  <div className="cheat-item">👇 <strong>Point Down</strong> ➔ Fan OFF</div>
                  <div className="cheat-item">👍 <strong>Thumb Up</strong> ➔ Buzzer ON</div>
                  <div className="cheat-item">👎 <strong>Thumb Down</strong> ➔ Buzzer OFF</div>
                  <div className="cheat-item">👌 <strong>OK Sign</strong> ➔ Door Toggle</div>
                  <div className="cheat-item">✌️ <strong>Peace</strong> ➔ TV Power</div>
                  <div className="cheat-item">🤘 <strong>Rock On</strong> ➔ Party Mode</div>
                </div>
              </div>
            )}

            <div className="compact-obj-grid">
              {/* 1. Ceiling Light */}
              <div className={`obj-status-card compact ${light.on ? 'on' : 'off'} ${
                confirmedGesture === 'OPEN_PALM' || confirmedGesture === 'CLOSED_FIST' ? 'active-gesture-target' : ''
              }`}>
                <div className="obj-header">
                  <Lightbulb size={14} className={light.on ? 'text-amber glow-icon' : 'text-muted'} />
                  <span className="obj-name">{isMaster ? 'LIGHT (GPIO 2)' : 'LIGHT'}</span>
                  <span className="device-gesture-hint">✋ / ✊</span>
                </div>
                <div className="obj-quick-btns">
                  <button
                    className={`quick-cmd-btn ${light.on ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('LIGHT_ON', { gesture: 'OPEN_PALM' })}
                  >
                    ✋ ON
                  </button>
                  <button
                    className={`quick-cmd-btn ${!light.on ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('LIGHT_OFF', { gesture: 'CLOSED_FIST' })}
                  >
                    ✊ OFF
                  </button>
                </div>
              </div>

              {/* 2. Ceiling Fan */}
              <div className={`obj-status-card compact ${fan.on ? 'on' : 'off'} ${
                confirmedGesture === 'INDEX_POINT' || confirmedGesture === 'POINT_DOWN' ? 'active-gesture-target' : ''
              }`}>
                <div className="obj-header">
                  <Fan size={14} className={fan.on ? 'text-cyan spin-anim glow-icon' : 'text-muted'} />
                  <span className="obj-name">FAN</span>
                  <span className="device-gesture-hint">☝️ / 👇</span>
                </div>
                <div className="obj-quick-btns">
                  <button
                    className={`quick-cmd-btn ${fan.on ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('FAN_ON')}
                  >
                    ☝️ ON
                  </button>
                  <button
                    className={`quick-cmd-btn ${!fan.on ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('FAN_OFF')}
                  >
                    👇 OFF
                  </button>
                </div>
              </div>

              {/* 3. Smart Door */}
              <div className={`obj-status-card compact ${door.open ? 'on' : 'off'} ${
                confirmedGesture === 'OK_SIGN' || confirmedGesture === 'THREE_FINGERS' ? 'active-gesture-target' : ''
              }`}>
                <div className="obj-header">
                  {door.open ? <DoorOpen size={14} className="text-emerald glow-icon" /> : <DoorClosed size={14} className="text-muted" />}
                  <span className="obj-name">{isMaster ? 'DOOR (GPIO 26)' : 'DOOR'}</span>
                  <span className="device-gesture-hint">👌 OK</span>
                </div>
                <div className="obj-quick-btns">
                  <button
                    className="quick-cmd-btn engaged"
                    onClick={() => dispatchCommand('DOOR_TOGGLE', { gesture: 'OK_SIGN' })}
                  >
                    👌 {door.open ? 'CLOSE' : 'OPEN'}
                  </button>
                </div>
              </div>

              {/* 4. Smart OLED TV */}
              <div className={`obj-status-card compact ${tv.on ? 'on' : 'off'} ${
                confirmedGesture === 'VICTORY' ? 'active-gesture-target' : ''
              }`}>
                <div className="obj-header">
                  <Tv size={14} className={tv.on ? 'text-purple glow-icon' : 'text-muted'} />
                  <span className="obj-name">OLED TV</span>
                  <span className="device-gesture-hint">✌️ Peace</span>
                </div>
                <div className="obj-quick-btns">
                  <button
                    className={`quick-cmd-btn ${tv.on ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('TV_TOGGLE')}
                  >
                    ✌️ POWER
                  </button>
                  <button
                    className="quick-cmd-btn"
                    onClick={() => dispatchCommand('PARTY_MODE')}
                  >
                    🤘 PARTY
                  </button>
                </div>
              </div>

              {/* 5. Smart AC */}
              <div className={`obj-status-card compact ${ac.on ? 'on' : 'off'}`}>
                <div className="obj-header">
                  <Wind size={14} className={ac.on ? 'text-cyan spin-anim glow-icon' : 'text-muted'} />
                  <span className="obj-name">SMART AC ({ac.temp}°C)</span>
                  <span className="device-gesture-hint">{ac.autoMode ? '❄️ AUTO' : 'MANUAL'}</span>
                </div>
                <div className="obj-quick-btns">
                  <button
                    className={`quick-cmd-btn ${ac.on ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand(ac.on ? 'AC_OFF' : 'AC_ON')}
                  >
                    {ac.on ? 'OFF' : 'ON'}
                  </button>
                  <button
                    className="quick-cmd-btn"
                    onClick={() => dispatchCommand('TEMP_DOWN')}
                  >
                    -1°C
                  </button>
                  <button
                    className="quick-cmd-btn"
                    onClick={() => dispatchCommand('TEMP_UP')}
                  >
                    +1°C
                  </button>
                  <button
                    className={`quick-cmd-btn ${ac.autoMode ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('AC_AUTO_TOGGLE')}
                  >
                    AUTO
                  </button>
                </div>
              </div>

              {/* 6. Smart Buzzer */}
              <div className={`obj-status-card compact ${buzzer ? 'on' : 'off'} ${
                confirmedGesture === 'THUMB_UP' || confirmedGesture === 'THUMB_DOWN' ? 'active-gesture-target' : ''
              }`}>
                <div className="obj-header">
                  <Bell size={14} className={buzzer ? 'text-amber glow-icon' : 'text-muted'} />
                  <span className="obj-name">{isMaster ? 'BUZZER (GPIO 25)' : 'BUZZER'}</span>
                  <span className="device-gesture-hint">👍 / 👎</span>
                </div>
                <div className="obj-quick-btns">
                  <button
                    className={`quick-cmd-btn ${buzzer ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('BUZZER_ON', { gesture: 'THUMB_UP' })}
                  >
                    👍 ON
                  </button>
                  <button
                    className={`quick-cmd-btn ${!buzzer ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('BUZZER_OFF', { gesture: 'THUMB_DOWN' })}
                  >
                    👎 OFF
                  </button>
                </div>
              </div>

              {/* 7. Window Blinds */}
              <div className={`obj-status-card compact ${blinds.open ? 'on' : 'off'}`}>
                <div className="obj-header">
                  <Sun size={14} className={blinds.open ? 'text-amber glow-icon' : 'text-muted'} />
                  <span className="obj-name">BLINDS</span>
                </div>
                <div className="obj-quick-btns">
                  <button
                    className={`quick-cmd-btn ${blinds.open ? 'engaged' : ''}`}
                    onClick={() => dispatchCommand('BLINDS_TOGGLE')}
                  >
                    {blinds.open ? 'CLOSE' : 'OPEN'}
                  </button>
                </div>
              </div>
            </div>

            {/* Viewpoint Camera Strip */}
            <div className="room-camera-strip">
              <span className="cam-strip-label">
                <Eye size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
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
          </div>
        )}
      </div>
    </div>
  );
}
