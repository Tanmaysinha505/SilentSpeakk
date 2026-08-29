import { create } from 'zustand';
import { audioFeedback } from '../services/audioFeedback';
import { useCommandStore } from './useCommandStore';

const MAX_TOASTS = 5;

export const useAgent44Store = create((set, get) => ({
  // --- Active Operational Mode ---
  // Modes: 'ROOM_CONTROL' | 'LIBRARY' | 'HOSPITAL' | 'COMMUNICATION' | 'SPACE' | 'CUSTOM'
  activeMode: 'ROOM_CONTROL',

  // --- Gesture Stability & Temporal State ---
  tracking: {
    rawGesture: 'NONE',
    confirmedGesture: 'NONE',
    status: 'SEARCHING', // 'SEARCHING' | 'STABILIZING' | 'CONFIRMED'
    confidence: 0,
    intent: 'Waiting for hand gesture...',
    target: '',
    handDetected: false,
    handsCount: 0,
    fps: 30,
    cameraActive: false,
    cameraInitializing: true,
    showLandmarks: true,
    source: 'MediaPipe Vision',
    landmarks: []
  },

  // --- 3D Smart Room Device States ---
  room: {
    light: {
      on: true,
      brightness: 1.2,
      color: '#fff6e0',
      emissiveIntensity: 3.5,
    },
    fan: {
      on: false,
      speed: 0,
      targetSpeed: 0,
      maxSpeed: 12.0,
      acceleration: 3.0,
    },
    door: {
      open: false,
      angle: 0,
      targetAngle: 0,
      maxAngle: Math.PI * 0.46, // ~83 degrees
    },
    tv: {
      on: true,
      channelIndex: 0,
      channels: [
        'AGENT 44 SMART HUB',
        'AIROS TELEMETRY GRID',
        'SYNTHWAVE HORIZON',
        'AMBIENT ZEN'
      ],
      volume: 75,
    },
    partyMode: false,
    cameraPreset: 'DEFAULT', // 'DEFAULT' | 'LIGHT' | 'FAN' | 'DOOR' | 'TV' | 'TOP_DOWN'
  },

  // --- Mode Specific Contexts ---
  library: {
    lastNotice: 'Silent study environment active',
    history: []
  },

  hospital: {
    alertLevel: 'NORMAL', // 'NORMAL' | 'URGENT' | 'CODE_BLUE'
    callCount: 0,
    history: []
  },

  communication: {
    speechEnabled: true,
    transcript: ['Agent 44 Communication Layer ready.'],
    currentPhrase: ''
  },

  space: {
    suitStatus: 'ALL SYSTEMS NOMINAL',
    oxygenPercent: 98,
    rcsActive: false,
    airlockSecured: true,
    history: []
  },

  // --- Action Feedback Toasts ---
  toasts: [
    {
      id: 'welcome',
      message: 'Agent 44 Initialized: Room Control Ready',
      type: 'info',
      time: Date.now()
    }
  ],

  // --- Store Actions ---

  setActiveMode: (mode) => {
    set({ activeMode: mode });
    get().addToast(`Switched to ${mode.replace(/_/g, ' ')} Mode`, 'info');
    audioFeedback.playTone(620, 'sine', 0.1, 0.05);

    // If connected to Python backend, notify it
    if (typeof window !== 'undefined' && window.__agent44_ws && window.__agent44_ws.readyState === WebSocket.OPEN) {
      window.__agent44_ws.send(JSON.stringify({ command: 'set_mode', mode }));
    }
  },

  setCameraPreset: (preset) =>
    set((s) => ({
      room: { ...s.room, cameraPreset: preset }
    })),

  toggleLandmarks: () =>
    set((s) => ({
      tracking: { ...s.tracking, showLandmarks: !s.tracking.showLandmarks }
    })),

  setCameraInitializing: (val) =>
    set((s) => ({
      tracking: { ...s.tracking, cameraInitializing: val }
    })),

  updateTracking: (partial) =>
    set((s) => ({
      tracking: { ...s.tracking, ...partial }
    })),

  addToast: (message, type = 'info') => {
    const toast = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      message,
      type,
      time: Date.now()
    };
    set((s) => ({
      toasts: [toast, ...s.toasts.slice(0, MAX_TOASTS - 1)]
    }));

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      set((s) => ({
        toasts: s.toasts.filter((t) => t.id !== toast.id)
      }));
    }, 4000);
  },

  speakText: (text) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  },

  /**
   * Dispatches command to Virtual Smart Room (React Three Fiber)
   */
  dispatchRoomCommand: (command) => {
    const res = useCommandStore.getState().dispatchCommand(command, { source: 'Agent 44 Vision Engine' });
    if (res && res.message) {
      get().addToast(res.message, res.success ? 'success' : 'warning');
    }
  }
}));
