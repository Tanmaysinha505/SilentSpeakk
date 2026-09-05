import React, { useState, useEffect } from 'react';
import { CameraFeed } from './components/camera/CameraFeed';
import { TopBar } from './components/hud/TopBar';
import { ModeSelector } from './components/hud/ModeSelector';
import { GestureStatusPanel } from './components/hud/GestureStatusPanel';
import { ActionToasts } from './components/hud/ActionToasts';
import { GestureSimulatorModal } from './components/hud/GestureSimulatorModal';
import { AgenticSentenceCard } from './components/hud/AgenticSentenceCard';
import { InModeLearner } from './components/learning/InModeLearner';

import { RoomControlView } from './components/modes/RoomControlView';
import { ClassroomView } from './components/modes/ClassroomView';
import { LibraryView } from './components/modes/LibraryView';
import { HospitalView } from './components/modes/HospitalView';
import { CommunicationView } from './components/modes/CommunicationView';
import { SpaceView } from './components/modes/SpaceView';
import { CustomLearningView } from './components/modes/CustomLearningView';

import { inBrowserHandDetector } from './services/handDetector';
import { useAgent44Store } from './store/useAgent44Store';
import { useCommandStore } from './store/useCommandStore';
import { useAuthStore } from './store/useAuthStore';
import { LoginPage } from './components/auth/LoginPage';
import { firebaseService } from './services/firebase';

// Master Agent 44 Application Interface
export function App() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const activeMode = useAgent44Store((s) => s.activeMode);
  const setActiveMode = useAgent44Store((s) => s.setActiveMode);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isLearnerOpen, setIsLearnerOpen] = useState(false);

  // Eagerly initialize MediaPipe GPU landmarker on app mount
  useEffect(() => {
    inBrowserHandDetector.init().catch(console.warn);
  }, []);

  // Real-time listener for ESP32 DHT11 temperature & humidity sensors
  useEffect(() => {
    const unsub = firebaseService.subscribeSensors((sensorData) => {
      if (sensorData) {
        useCommandStore.getState().setSensors(sensorData);
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Real-time listener for ESP32 PIR motion presence (agent44/presence/motionDetected)
  useEffect(() => {
    const unsub = firebaseService.subscribeMotionPresence((motionDetected) => {
      useCommandStore.getState().setPresence(motionDetected);
      useAgent44Store.getState().setPresence(motionDetected);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Real-time listener for ESP32 hardware device states (agent44/room)
  useEffect(() => {
    const unsub = firebaseService.subscribeHardwareState((hwState) => {
      if (hwState) {
        useCommandStore.getState().syncHardwareState(hwState);
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // 0. Render Login Page if user is not authenticated
  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="agent44-app-container">
      {/* 1. Full Screen Main Viewport Layer (3D Room or Camera Feed) */}
      <div className="main-viewport-layer">
        {activeMode === 'ROOM_CONTROL' ? (
          <RoomControlView onOpenLearner={() => setIsLearnerOpen(true)} />
        ) : (
          <CameraFeed />
        )}
      </div>

      {/* 2. Mode Content Overlays */}
      <div className="mode-overlay-layer">
        {activeMode === 'CLASSROOM' && <ClassroomView onOpenLearner={() => setIsLearnerOpen(true)} />}
        {activeMode === 'LIBRARY' && <LibraryView onOpenLearner={() => setIsLearnerOpen(true)} />}
        {activeMode === 'HOSPITAL' && <HospitalView onOpenLearner={() => setIsLearnerOpen(true)} />}
        {activeMode === 'COMMUNICATION' && <CommunicationView onOpenLearner={() => setIsLearnerOpen(true)} />}
        {activeMode === 'SPACE' && <SpaceView onOpenLearner={() => setIsLearnerOpen(true)} />}
        {activeMode === 'CUSTOM' && <CustomLearningView />}
      </div>

      {/* 3. Futuristic Agent 44 HUD Interactive Layer */}
      <div className="hud-interactive-layer">
        {/* Top Navigation & Status Bar */}
        <TopBar onOpenSimulator={() => setIsSimulatorOpen(true)} />

        {/* Global HUD Cards for Non-3D Modes (RoomControlView manages its own single left HUD column) */}
        {activeMode !== 'ROOM_CONTROL' && (
          <>
            <AgenticSentenceCard />
            <GestureStatusPanel />
          </>
        )}

        {/* Action Feedback Non-Blocking Notification Toasts */}
        <ActionToasts />

        {/* Prominent Mode Selector Dock with Teach / New Mode */}
        <ModeSelector onOpenLearner={() => setIsLearnerOpen(true)} />
      </div>

      {/* 4. Gesture Simulator Modal */}
      <GestureSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />

      {/* 5. In-Mode Learning & Mode Creation Modal */}
      <InModeLearner
        isOpen={isLearnerOpen}
        onClose={() => setIsLearnerOpen(false)}
      />
    </div>
  );
}

export default App;
