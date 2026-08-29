import { create } from 'zustand';
import { audioFeedback } from '../services/audioFeedback';
import confetti from 'canvas-confetti';

const MAX_HISTORY = 60;

export const useCommandStore = create((set, get) => ({
  // --- 3D Smart Room Device States ---
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
      'NEURAL STREAM v2.4',
      'AIROS SMART GRID',
      'SYNTHWAVE HORIZON',
      'AMBIENT ZEN'
    ],
    volume: 75,
  },

  partyMode: false,

  blinds: {
    open: true,
  },

  ac: {
    on: true,
    temp: 21,
  },

  // Camera focus preset
  cameraPreset: 'DEFAULT', // 'DEFAULT' | 'LIGHT' | 'FAN' | 'DOOR' | 'TV' | 'TOP_DOWN'

  // --- Real-Time Vision & Gesture Telemetry ---
  telemetry: {
    gesture: 'OPEN_PALM',
    intent: 'LIGHT_ON',
    target: 'Ceiling Light',
    confidence: 97.4,
    source: 'READY (Awaiting Gesture)',
    timestamp: Date.now(),
    fps: 60,
    connectedToBackend: false,
  },

  // --- Chronological Action Log ---
  history: [
    {
      id: 'init-1',
      command: 'SYSTEM_BOOT',
      target: '3D Smart Room',
      gesture: 'SYSTEM',
      confidence: 100,
      timestamp: Date.now() - 5000,
      timeString: new Date().toLocaleTimeString(),
      success: true,
      message: 'Interactive 3D environment initialized with realistic lighting'
    },
    {
      id: 'init-2',
      command: 'LIGHT_ON',
      target: 'Ceiling Light',
      gesture: 'OPEN_PALM',
      confidence: 97.4,
      timestamp: Date.now() - 3000,
      timeString: new Date().toLocaleTimeString(),
      success: true,
      message: 'Ceiling PointLight illuminated room & emissive bulb glowing'
    }
  ],

  // --- Accessibility Settings ---
  accessibility: {
    highContrast: false,
    audioEnabled: true,
    reducedMotion: false,
    screenReaderAnnouncement: '3D Smart Room Ready. Use number keys 1 to 4 to control devices.',
  },

  // --- Actions & Dispatcher ---

  setCameraPreset: (preset) => set({ cameraPreset: preset }),

  toggleHighContrast: () =>
    set((state) => ({
      accessibility: {
        ...state.accessibility,
        highContrast: !state.accessibility.highContrast
      }
    })),

  toggleAudioFeedback: () =>
    set((state) => {
      const next = !state.accessibility.audioEnabled;
      audioFeedback.enabled = next;
      return {
        accessibility: {
          ...state.accessibility,
          audioEnabled: next,
          screenReaderAnnouncement: next ? 'Audio feedback enabled' : 'Audio feedback muted'
        }
      };
    }),

  updateTelemetry: (partial) =>
    set((state) => ({
      telemetry: {
        ...state.telemetry,
        ...partial,
        timestamp: Date.now()
      }
    })),

  clearHistory: () => set({ history: [] }),

  /**
   * Centralized Command Dispatcher
   * Accepts command strings:
   * LIGHT_ON, LIGHT_OFF, LIGHT_TOGGLE
   * FAN_ON, FAN_OFF, FAN_TOGGLE
   * DOOR_OPEN, DOOR_CLOSE, DOOR_TOGGLE
   * TV_ON, TV_OFF, TV_TOGGLE, TV_NEXT_CHANNEL
   * PARTY_MODE, ALL_ON, ALL_OFF, RESET_ROOM
   */
  dispatchCommand: (command, meta = {}) => {
    const state = get();
    const cmd = command.toUpperCase().trim();
    const gesture = meta.gesture || 'MANUAL_OVERLAY';
    const confidence = meta.confidence ?? 100;
    const source = meta.source || 'USER_HUD';

    let target = 'Room';
    let message = '';
    let success = true;

    switch (cmd) {
      case 'LIGHT_ON': {
        target = 'Ceiling Light';
        message = 'Ceiling PointLight turned ON (Emissive bulb glow engaged)';
        audioFeedback.playLightOn();
        set((s) => ({
          light: { ...s.light, on: true }
        }));
        break;
      }

      case 'LIGHT_OFF': {
        target = 'Ceiling Light';
        message = 'Ceiling PointLight turned OFF (Dim ambient fill)';
        audioFeedback.playLightOff();
        set((s) => ({
          light: { ...s.light, on: false }
        }));
        break;
      }

      case 'LIGHT_TOGGLE': {
        target = 'Ceiling Light';
        const next = !state.light.on;
        message = next ? 'Ceiling Light turned ON' : 'Ceiling Light turned OFF';
        if (next) audioFeedback.playLightOn();
        else audioFeedback.playLightOff();
        set((s) => ({
          light: { ...s.light, on: next }
        }));
        break;
      }

      case 'FAN_ON': {
        target = 'Ceiling Fan';
        message = 'Ceiling Fan motor engaged (Aerodynamic velocity accelerating)';
        audioFeedback.playFanOn();
        set((s) => ({
          fan: { ...s.fan, on: true, targetSpeed: s.fan.maxSpeed }
        }));
        break;
      }

      case 'FAN_OFF': {
        target = 'Ceiling Fan';
        message = 'Ceiling Fan motor disabled (Decelerating with natural inertia)';
        audioFeedback.playFanOff();
        set((s) => ({
          fan: { ...s.fan, on: false, targetSpeed: 0 }
        }));
        break;
      }

      case 'FAN_TOGGLE': {
        target = 'Ceiling Fan';
        const next = !state.fan.on;
        message = next ? 'Ceiling Fan engaged' : 'Ceiling Fan decelerating';
        if (next) audioFeedback.playFanOn();
        else audioFeedback.playFanOff();
        set((s) => ({
          fan: { ...s.fan, on: next, targetSpeed: next ? s.fan.maxSpeed : 0 }
        }));
        break;
      }

      case 'DOOR_OPEN': {
        target = 'Smart Door';
        message = 'Smart Door unlatched & swung open 83°';
        audioFeedback.playDoorOpen();
        set((s) => ({
          door: { ...s.door, open: true, targetAngle: s.door.maxAngle }
        }));
        break;
      }

      case 'DOOR_CLOSE': {
        target = 'Smart Door';
        message = 'Smart Door smoothly swung closed & locked flush';
        audioFeedback.playDoorClose();
        set((s) => ({
          door: { ...s.door, open: false, targetAngle: 0 }
        }));
        break;
      }

      case 'DOOR_TOGGLE': {
        target = 'Smart Door';
        const next = !state.door.open;
        message = next ? 'Door opened 83°' : 'Door closed & latched';
        if (next) audioFeedback.playDoorOpen();
        else audioFeedback.playDoorClose();
        set((s) => ({
          door: { ...s.door, open: next, targetAngle: next ? s.door.maxAngle : 0 }
        }));
        break;
      }

      case 'TV_ON': {
        target = 'Smart OLED TV';
        message = 'Smart TV screen powered ON with dynamic display';
        audioFeedback.playTvToggle();
        set((s) => ({
          tv: { ...s.tv, on: true }
        }));
        break;
      }

      case 'TV_OFF': {
        target = 'Smart OLED TV';
        message = 'Smart TV display turned OFF into ultra-black glass';
        audioFeedback.playTvToggle();
        set((s) => ({
          tv: { ...s.tv, on: false }
        }));
        break;
      }

      case 'TV_TOGGLE': {
        target = 'Smart OLED TV';
        const next = !state.tv.on;
        message = next ? 'Smart TV turned ON' : 'Smart TV turned OFF';
        audioFeedback.playTvToggle();
        set((s) => ({
          tv: { ...s.tv, on: next }
        }));
        break;
      }

      case 'TV_NEXT_CHANNEL': {
        target = 'Smart OLED TV';
        const nextIdx = (state.tv.channelIndex + 1) % state.tv.channels.length;
        message = `TV channel switched to "${state.tv.channels[nextIdx]}"`;
        audioFeedback.playTone(740, 'triangle', 0.1, 0.05);
        set((s) => ({
          tv: { ...s.tv, channelIndex: nextIdx, on: true }
        }));
        break;
      }

      case 'PARTY_MODE': {
        target = 'Smart Room System';
        const nextParty = !state.partyMode;
        message = nextParty ? 'PARTY MODE ACTIVATED! RGB Lights & Fan max speed' : 'Party mode deactivated';
        audioFeedback.playSuccess();
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch (e) {}

        set((s) => ({
          partyMode: nextParty,
          light: { ...s.light, on: true, color: nextParty ? '#ff007f' : '#fff6e0' },
          fan: { ...s.fan, on: true, targetSpeed: s.fan.maxSpeed * 1.5 },
          tv: { ...s.tv, on: true }
        }));
        break;
      }

      case 'ALL_ON': {
        target = 'All Devices';
        message = 'All room smart systems engaged (Light, Fan, TV, Door)';
        audioFeedback.playSuccess();
        set((s) => ({
          light: { ...s.light, on: true },
          fan: { ...s.fan, on: true, targetSpeed: s.fan.maxSpeed },
          door: { ...s.door, open: true, targetAngle: s.door.maxAngle },
          tv: { ...s.tv, on: true }
        }));
        break;
      }

      case 'ALL_OFF': {
        target = 'All Devices';
        message = 'All room systems powered down & secured';
        audioFeedback.playTone(330, 'sine', 0.25, 0.08);
        set((s) => ({
          light: { ...s.light, on: false },
          fan: { ...s.fan, on: false, targetSpeed: 0 },
          door: { ...s.door, open: false, targetAngle: 0 },
          tv: { ...s.tv, on: false },
          partyMode: false
        }));
        break;
      }

      case 'BLINDS_OPEN': {
        target = 'Smart Blinds';
        message = 'Smart Window Blinds tilted open (Daylight illumination)';
        audioFeedback.playTone(520, 'sine', 0.15, 0.05);
        set((s) => ({
          blinds: { ...s.blinds, open: true }
        }));
        break;
      }

      case 'BLINDS_CLOSE': {
        target = 'Smart Blinds';
        message = 'Smart Window Blinds closed for privacy';
        audioFeedback.playTone(390, 'sine', 0.15, 0.05);
        set((s) => ({
          blinds: { ...s.blinds, open: false }
        }));
        break;
      }

      case 'BLINDS_TOGGLE': {
        target = 'Smart Blinds';
        const next = !state.blinds?.open;
        message = next ? 'Smart Window Blinds opened' : 'Smart Window Blinds closed';
        audioFeedback.playTone(next ? 520 : 390, 'sine', 0.15, 0.05);
        set((s) => ({
          blinds: { ...s.blinds, open: next }
        }));
        break;
      }

      case 'AC_ON': {
        target = 'Smart AC';
        message = `Smart Climate AC engaged at ${state.ac?.temp || 21}°C`;
        audioFeedback.playTone(600, 'sine', 0.2, 0.05);
        set((s) => ({
          ac: { ...(s.ac || { temp: 21 }), on: true }
        }));
        break;
      }

      case 'AC_OFF': {
        target = 'Smart AC';
        message = 'Smart Climate AC turned off';
        audioFeedback.playTone(400, 'sine', 0.2, 0.05);
        set((s) => ({
          ac: { ...(s.ac || { temp: 21 }), on: false }
        }));
        break;
      }

      case 'AC_TOGGLE': {
        target = 'Smart AC';
        const next = !state.ac?.on;
        message = next ? `Smart AC cooling to ${state.ac?.temp || 21}°C` : 'Smart AC turned off';
        audioFeedback.playTone(next ? 600 : 400, 'sine', 0.2, 0.05);
        set((s) => ({
          ac: { ...(s.ac || { temp: 21 }), on: next }
        }));
        break;
      }

      case 'TEMP_UP': {
        target = 'Smart AC';
        const newTemp = Math.min(30, (state.ac?.temp || 21) + 1);
        message = `AC temperature raised to ${newTemp}°C`;
        audioFeedback.playTone(680, 'sine', 0.1, 0.04);
        set((s) => ({
          ac: { ...(s.ac || { on: true }), temp: newTemp, on: true }
        }));
        break;
      }

      case 'TEMP_DOWN': {
        target = 'Smart AC';
        const newTemp = Math.max(16, (state.ac?.temp || 21) - 1);
        message = `AC temperature lowered to ${newTemp}°C`;
        audioFeedback.playTone(480, 'sine', 0.1, 0.04);
        set((s) => ({
          ac: { ...(s.ac || { on: true }), temp: newTemp, on: true }
        }));
        break;
      }

      case 'RESET_ROOM': {
        target = 'Whole Room';
        message = 'Room reset to default cozy ambiance';
        audioFeedback.playTone(440, 'sine', 0.15, 0.06);
        set((s) => ({
          light: { on: true, brightness: 1.2, color: '#fff6e0', emissiveIntensity: 3.5 },
          fan: { on: false, speed: 0, targetSpeed: 0, maxSpeed: 12.0, acceleration: 3.0 },
          door: { open: false, angle: 0, targetAngle: 0, maxAngle: Math.PI * 0.46 },
          tv: { on: true, channelIndex: 0, channels: s.tv.channels, volume: 75 },
          partyMode: false,
          cameraPreset: 'DEFAULT'
        }));
        break;
      }

      default: {
        success = false;
        message = `Command "${cmd}" not recognized by Smart Room engine`;
        audioFeedback.playWarning();
        break;
      }
    }

    // New history item
    const newEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      command: cmd,
      target,
      gesture,
      confidence: Math.round(confidence),
      source,
      timestamp: Date.now(),
      timeString: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      success,
      message
    };

    // Update state & accessibility announcement
    set((s) => ({
      telemetry: {
        ...s.telemetry,
        gesture,
        intent: cmd,
        target,
        confidence: Math.round(confidence),
        source,
        timestamp: Date.now()
      },
      history: [newEntry, ...s.history.slice(0, MAX_HISTORY - 1)],
      accessibility: {
        ...s.accessibility,
        screenReaderAnnouncement: `${target}: ${message}. Confidence ${Math.round(confidence)} percent.`
      }
    }));

    return { success, command: cmd, target, message };
  }
}));
