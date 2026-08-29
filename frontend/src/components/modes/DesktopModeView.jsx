import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  MousePointer,
  Folder,
  Globe,
  Terminal,
  FileText,
  Minimize2,
  Maximize2,
  X,
  ExternalLink,
  Zap,
  GraduationCap
} from 'lucide-react';
import { PIPCameraFeed } from '../camera/PIPCameraFeed';
import { cursorController } from '../../services/cursorController';
import { useAgent44Store } from '../../store/useAgent44Store';

export function DesktopModeView({ onOpenLearner }) {
  const [cursorPos, setCursorPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isWindowMinimized, setIsWindowMinimized] = useState(false);
  const [lastAction, setLastAction] = useState('Tracking active');
  const [clickRipple, setClickRipple] = useState(null);
  const [showVirtualCursor, setShowVirtualCursor] = useState(false);
  const addToast = useAgent44Store((s) => s.addToast);
  const tracking = useAgent44Store((s) => s.tracking);

  useEffect(() => {
    const unsub = cursorController.subscribe((event) => {
      if (event.type === 'move') {
        setCursorPos({ x: event.x, y: event.y });
      } else if (event.type === 'left_click') {
        setClickRipple({ x: event.x, y: event.y, type: 'left' });
        setLastAction('Left Click (Thumb Up)');
        setTimeout(() => setClickRipple(null), 500);
      } else if (event.type === 'right_click') {
        setClickRipple({ x: event.x, y: event.y, type: 'right' });
        setLastAction('Right Click (Index-Thumb Pinch)');
        setTimeout(() => setClickRipple(null), 500);
      } else if (event.type === 'show_desktop') {
        setIsWindowMinimized(true);
        setLastAction('Show Desktop (Closed Fist / Win+D)');
      } else if (event.type === 'restore_window') {
        setIsWindowMinimized(false);
        setLastAction('Restore Window (Open Palm / Alt+Tab)');
      }
    });

    return () => unsub();
  }, []);

  return (
    <div className="desktop-mode-fullscreen-container">
      {/* Floating Live PIP Camera for real-time hand & cursor tracking */}
      <PIPCameraFeed />

      {/* 1. Virtual Desktop OS Wallpaper & Icons */}
      <div className="desktop-wallpaper">
        {/* Desktop Icons Grid */}
        <div className="desktop-icons-column">
          <div className="desktop-icon-item" onClick={() => addToast('Opened My Files', 'info')}>
            <Folder size={36} className="text-cyan" />
            <span>My Files</span>
          </div>
          <div className="desktop-icon-item" onClick={() => addToast('Launched Web Browser', 'info')}>
            <Globe size={36} className="text-blue" />
            <span>Browser</span>
          </div>
          <div className="desktop-icon-item" onClick={() => addToast('Terminal Prompt Ready', 'info')}>
            <Terminal size={36} className="text-emerald" />
            <span>Terminal</span>
          </div>
          <div className="desktop-icon-item" onClick={() => addToast('Opened Notes', 'info')}>
            <FileText size={36} className="text-amber" />
            <span>Notes.txt</span>
          </div>
        </div>

        {/* 2. Simulated Active Application Window */}
        {!isWindowMinimized && (
          <div className="simulated-app-window">
            <div className="window-titlebar">
              <div className="window-title-group">
                <Terminal size={14} className="text-cyan" />
                <span>Agent 44 — Command Terminal</span>
              </div>
              <div className="window-controls">
                <button
                  className="win-btn"
                  onClick={() => cursorController.showDesktop()}
                  title="Minimize (Fist)"
                >
                  <Minimize2 size={12} />
                </button>
                <button className="win-btn">
                  <Maximize2 size={12} />
                </button>
                <button className="win-btn win-close">
                  <X size={12} />
                </button>
              </div>
            </div>
            <div className="window-content">
              <p className="terminal-code">
                $ agent44 --os-control --mode=desktop<br />
                [VISION] Tracking index fingertip for 2D cursor mapping...<br />
                [GESTURES ACTIVE]:<br />
                &nbsp;&nbsp;☝️ Move Index Finger ➔ Position Mouse Cursor<br />
                &nbsp;&nbsp;👍 Thumbs Up ➔ Left Click / Select<br />
                &nbsp;&nbsp;👌 Index+Thumb Pinch ➔ Right Click / Context Menu<br />
                &nbsp;&nbsp;✊ Closed Fist ➔ Show Desktop (Win + D)<br />
                &nbsp;&nbsp;✋ Open Palm ➔ Restore Window (Alt + Tab)<br />
                <span className="cursor-blink">_</span>
              </p>
            </div>
          </div>
        )}

        {/* 3. Simulated OS Taskbar */}
        <div className="desktop-taskbar">
          <div className="taskbar-start">
            <Monitor size={16} className="text-cyan" />
            <span>AirOS Desktop</span>
          </div>
          <div className="taskbar-apps">
            <button
              className={`taskbar-app-tab ${!isWindowMinimized ? 'active' : ''}`}
              onClick={() => setIsWindowMinimized(!isWindowMinimized)}
            >
              Terminal
            </button>
          </div>
          <div className="taskbar-status">
            <span>{lastAction}</span>
            <span className="status-separator">|</span>
            <span>{cursorController.isBackendAvailable ? 'PyAutoGUI: ONLINE' : 'PyAutoGUI: SIMULATOR'}</span>
          </div>
        </div>

        {/* 4. Touchless Mouse Cursor Overlay (Hidden by default to let REAL Windows cursor move!) */}
        {showVirtualCursor && (
          <div
            className="touchless-mouse-cursor"
            style={{
              left: `${cursorPos.x}px`,
              top: `${cursorPos.y}px`
            }}
          >
            <MousePointer size={22} className="cursor-icon text-cyan glow-icon" />
            <span className="cursor-coords-tag">
              {Math.round(cursorPos.x)}, {Math.round(cursorPos.y)}
            </span>
          </div>
        )}

        {/* Click ripple animation */}
        {clickRipple && (
          <div
            className={`click-ripple-effect ${clickRipple.type}`}
            style={{ left: `${clickRipple.x}px`, top: `${clickRipple.y}px` }}
          />
        )}
      </div>

      {/* 5. Desktop Mode Floating Controls & Cheat Sheet Panel */}
      <div className="desktop-floating-hud">
        <div className="hud-card-header">
          <div className="title-row">
            <Monitor size={16} className="text-cyan" />
            <span className="card-title">DESKTOP OS TOUCHLESS GESTURES</span>
          </div>
          <button className="mode-teach-btn" onClick={onOpenLearner} title="Teach gesture in Desktop mode">
            <GraduationCap size={13} />
            <span>Teach</span>
          </button>
        </div>

        <div className="desktop-cheat-list">
          <div className="desktop-cheat-row">
            <span className="cheat-gesture-pill">☝️ MOVE INDEX</span>
            <span className="cheat-arrow">➔</span>
            <span className="cheat-action">Move Mouse Cursor smoothly</span>
          </div>
          <div className="desktop-cheat-row">
            <span className="cheat-gesture-pill">👍 THUMBS UP</span>
            <span className="cheat-arrow">➔</span>
            <span className="cheat-action">Left Click / Selection</span>
            <button className="quick-test-btn" onClick={() => cursorController.leftClick()}>Test</button>
          </div>
          <div className="desktop-cheat-row">
            <span className="cheat-gesture-pill">👌 PINCH / OK</span>
            <span className="cheat-arrow">➔</span>
            <span className="cheat-action">Right Click / Context Menu</span>
            <button className="quick-test-btn" onClick={() => cursorController.rightClick()}>Test</button>
          </div>
          <div className="desktop-cheat-row">
            <span className="cheat-gesture-pill">✊ CLOSED FIST</span>
            <span className="cheat-arrow">➔</span>
            <span className="cheat-action">Show Desktop (Win + D)</span>
            <button className="quick-test-btn" onClick={() => cursorController.showDesktop()}>Test</button>
          </div>
          <div className="desktop-cheat-row">
            <span className="cheat-gesture-pill">✋ OPEN PALM</span>
            <span className="cheat-arrow">➔</span>
            <span className="cheat-action">Restore Window (Alt + Tab)</span>
            <button className="quick-test-btn" onClick={() => cursorController.restoreWindow()}>Test</button>
          </div>
        </div>
      </div>
    </div>
  );
}
