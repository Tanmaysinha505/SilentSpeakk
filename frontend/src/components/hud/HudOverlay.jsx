import React, { useState, useEffect } from 'react';
import { HeaderBanner } from './HeaderBanner';
import { GestureCard } from './GestureCard';
import { CommandControls } from './CommandControls';
import { ActionHistoryDrawer } from './ActionHistoryDrawer';
import { CameraPresetsBar } from './CameraPresetsBar';
import { GestureSimulatorModal } from './GestureSimulatorModal';
import { useCommandStore } from '../../store/useCommandStore';
import { gestureBridge } from '../../services/gestureBridge';

export function HudOverlay() {
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const accessibility = useCommandStore((s) => s.accessibility);
  const dispatchCommand = useCommandStore((s) => s.dispatchCommand);
  const setCameraPreset = useCommandStore((s) => s.setCameraPreset);
  const cameraPreset = useCommandStore((s) => s.cameraPreset);

  // Initialize Gesture Bridge (WebSocket to AirOS / MediaPipe Listener)
  useEffect(() => {
    gestureBridge.init();
    return () => {
      gestureBridge.disconnect();
    };
  }, []);

  // Global Accessibility Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept when user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case '1':
          e.preventDefault();
          dispatchCommand('LIGHT_TOGGLE', { gesture: 'KEYBOARD_[1]', source: 'Keyboard' });
          break;
        case '2':
          e.preventDefault();
          dispatchCommand('FAN_TOGGLE', { gesture: 'KEYBOARD_[2]', source: 'Keyboard' });
          break;
        case '3':
          e.preventDefault();
          dispatchCommand('DOOR_TOGGLE', { gesture: 'KEYBOARD_[3]', source: 'Keyboard' });
          break;
        case '4':
          e.preventDefault();
          dispatchCommand('TV_TOGGLE', { gesture: 'KEYBOARD_[4]', source: 'Keyboard' });
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          dispatchCommand('PARTY_MODE', { gesture: 'KEYBOARD_[P]', source: 'Keyboard' });
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          dispatchCommand('RESET_ROOM', { gesture: 'KEYBOARD_[R]', source: 'Keyboard' });
          break;
        case 'c':
        case 'C': {
          e.preventDefault();
          const presets = ['DEFAULT', 'LIGHT', 'FAN', 'DOOR', 'TV', 'TOP_DOWN'];
          const currentIdx = presets.indexOf(cameraPreset);
          const nextPreset = presets[(currentIdx + 1) % presets.length];
          setCameraPreset(nextPreset);
          break;
        }
        case 's':
        case 'S':
          e.preventDefault();
          setIsSimulatorOpen((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatchCommand, setCameraPreset, cameraPreset]);

  return (
    <div className={`hud-container ${accessibility.highContrast ? 'high-contrast-mode' : ''}`}>
      {/* Screen Reader ARIA Live Region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {accessibility.screenReaderAnnouncement}
      </div>

      {/* Top Navigation & Status Bar */}
      <HeaderBanner onOpenSimulator={() => setIsSimulatorOpen(true)} />

      {/* Main HUD Interactive Content Layer */}
      <main className="hud-content-grid">
        {/* Left Side: Live Gesture & Vision Card */}
        <div className="hud-left-panel">
          <GestureCard />
          <CommandControls />
        </div>

        {/* Right Side: Action History Log & Camera Presets */}
        <div className="hud-right-panel">
          <CameraPresetsBar />
          <ActionHistoryDrawer />
        </div>
      </main>

      {/* Gesture Recognition Simulator & Architecture Guide Modal */}
      <GestureSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />
    </div>
  );
}
