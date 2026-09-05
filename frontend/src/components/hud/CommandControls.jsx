import React from 'react';
import {
  Lightbulb,
  Fan,
  DoorOpen,
  DoorClosed,
  Tv,
  Power,
  Sliders,
  Wind
} from 'lucide-react';
import { useCommandStore } from '../../store/useCommandStore';

export function CommandControls() {
  const light = useCommandStore((s) => s.light);
  const fan = useCommandStore((s) => s.fan);
  const door = useCommandStore((s) => s.door);
  const tv = useCommandStore((s) => s.tv);
  const ac = useCommandStore((s) => s.ac || { on: true, temp: 24 });
  const dispatchCommand = useCommandStore((s) => s.dispatchCommand);

  return (
    <section className="hud-card command-pad-card" aria-labelledby="controls-heading">
      <div className="card-header">
        <div className="card-title-group">
          <Sliders size={15} className="text-cyan" />
          <h2 id="controls-heading" className="card-title">SMART OBJECT COMMAND DISPATCHER</h2>
        </div>
        <span className="card-hint">Keys: [1] Light  [2] Fan  [3] Door  [4] TV</span>
      </div>

      <div className="command-grid">
        {/* --- CEILING LIGHT CONTROL --- */}
        <div className={`command-tile ${light.on ? 'active-light' : ''}`}>
          <div className="tile-top">
            <div className="tile-icon-box">
              <Lightbulb size={20} className={light.on ? 'text-amber glow-icon' : 'text-muted'} />
            </div>
            <div className="tile-meta">
              <div className="tile-title">Ceiling Light</div>
              <div className="tile-status-tag">
                {light.on ? 'ILLUMINATED' : 'EXTINGUISHED'}
              </div>
            </div>
          </div>
          <div className="tile-btn-row">
            <button
              className={`action-btn ${light.on ? 'btn-engaged' : ''}`}
              onClick={() => dispatchCommand('LIGHT_ON')}
              aria-label="Turn Ceiling Light On"
            >
              LIGHT_ON
            </button>
            <button
              className={`action-btn ${!light.on ? 'btn-engaged' : ''}`}
              onClick={() => dispatchCommand('LIGHT_OFF')}
              aria-label="Turn Ceiling Light Off"
            >
              LIGHT_OFF
            </button>
          </div>
        </div>

        {/* --- CEILING FAN CONTROL --- */}
        <div className={`command-tile ${fan.on ? 'active-fan' : ''}`}>
          <div className="tile-top">
            <div className="tile-icon-box">
              <Fan size={20} className={fan.on ? 'text-cyan spin-anim glow-icon' : 'text-muted'} />
            </div>
            <div className="tile-meta">
              <div className="tile-title">Ceiling Fan</div>
              <div className="tile-status-tag">
                {fan.on ? 'SPINNING' : 'STOPPED'}
              </div>
            </div>
          </div>
          <div className="tile-btn-row">
            <button
              className={`action-btn ${fan.on ? 'btn-engaged' : ''}`}
              onClick={() => dispatchCommand('FAN_ON')}
              aria-label="Turn Fan On"
            >
              FAN_ON
            </button>
            <button
              className={`action-btn ${!fan.on ? 'btn-engaged' : ''}`}
              onClick={() => dispatchCommand('FAN_OFF')}
              aria-label="Turn Fan Off"
            >
              FAN_OFF
            </button>
          </div>
        </div>

        {/* --- SMART DOOR CONTROL --- */}
        <div className={`command-tile ${door.open ? 'active-door' : ''}`}>
          <div className="tile-top">
            <div className="tile-icon-box">
              {door.open ? (
                <DoorOpen size={20} className="text-emerald glow-icon" />
              ) : (
                <DoorClosed size={20} className="text-muted" />
              )}
            </div>
            <div className="tile-meta">
              <div className="tile-title">Smart Door (Servo)</div>
              <div className="tile-status-tag">
                {door.open ? 'OPEN (SERVO: 83°)' : 'SECURED & LATCHED'}
              </div>
            </div>
          </div>
          <div className="tile-btn-row">
            <button
              className="action-btn btn-engaged"
              onClick={() => dispatchCommand('DOOR_TOGGLE', { gesture: 'OK_SIGN' })}
              aria-label="Toggle Smart Door"
            >
              👌 TOGGLE
            </button>
            <button
              className={`action-btn ${door.open ? 'btn-engaged' : ''}`}
              onClick={() => dispatchCommand('DOOR_OPEN')}
              aria-label="Open Smart Door"
            >
              OPEN
            </button>
            <button
              className={`action-btn ${!door.open ? 'btn-engaged' : ''}`}
              onClick={() => dispatchCommand('DOOR_CLOSE')}
              aria-label="Close Smart Door"
            >
              CLOSE
            </button>
          </div>
        </div>

        {/* --- SMART OLED TV CONTROL --- */}
        <div className={`command-tile ${tv.on ? 'active-tv' : ''}`}>
          <div className="tile-top">
            <div className="tile-icon-box">
              <Tv size={20} className={tv.on ? 'text-purple glow-icon' : 'text-muted'} />
            </div>
            <div className="tile-meta">
              <div className="tile-title">Smart TV</div>
              <div className="tile-status-tag">
                {tv.on ? 'OLED ACTIVE' : 'STANDBY'}
              </div>
            </div>
          </div>
          <div className="tile-btn-row">
            <button
              className={`action-btn ${tv.on ? 'btn-engaged' : ''}`}
              onClick={() => dispatchCommand('TV_ON')}
              aria-label="Turn TV On"
            >
              TV_ON
            </button>
            <button
              className={`action-btn ${!tv.on ? 'btn-engaged' : ''}`}
              onClick={() => dispatchCommand('TV_OFF')}
              aria-label="Turn TV Off"
            >
              TV_OFF
            </button>
            <button
              className="action-btn btn-alt"
              onClick={() => dispatchCommand('TV_NEXT_CHANNEL')}
              title="Next Channel"
              aria-label="Switch TV Channel"
            >
              CH+
            </button>
          </div>
        </div>

        {/* --- SMART CLIMATE AC CONTROL --- */}
        <div className={`command-tile ${ac.on ? 'active-ac' : ''}`}>
          <div className="tile-top">
            <div className="tile-icon-box">
              <Wind size={20} className={ac.on ? 'text-cyan spin-anim glow-icon' : 'text-muted'} />
            </div>
            <div className="tile-meta">
              <div className="tile-title">Digital Twin AC</div>
              <div className="tile-status-tag">
                {ac.on ? `COOLING (${ac.temp}°C)` : 'STANDBY'}
              </div>
            </div>
          </div>
          <div className="tile-btn-row">
            <button
              className={`action-btn ${ac.on ? 'btn-engaged' : ''}`}
              onClick={() => dispatchCommand(ac.on ? 'AC_OFF' : 'AC_ON')}
            >
              {ac.on ? 'AC_OFF' : 'AC_ON'}
            </button>
            <button
              className="action-btn"
              onClick={() => dispatchCommand('TEMP_DOWN')}
            >
              -1°C
            </button>
            <button
              className="action-btn"
              onClick={() => dispatchCommand('TEMP_UP')}
            >
              +1°C
            </button>
          </div>
        </div>
      </div>

      {/* Global Quick Action Strip */}
      <div className="global-strip">
        <button
          className="global-act-btn"
          onClick={() => dispatchCommand('ALL_ON')}
          aria-label="Engage All Room Systems"
        >
          <Power size={13} /> ALL SYSTEMS ON
        </button>
        <button
          className="global-act-btn"
          onClick={() => dispatchCommand('ALL_OFF')}
          aria-label="Power Down All Systems"
        >
          <Power size={13} /> ALL SYSTEMS OFF
        </button>
      </div>
    </section>
  );
}
