import { create } from 'zustand';
import { audioFeedback } from '../services/audioFeedback.js';
import { firebaseService } from '../services/firebase.js';
import { useAuthStore } from './useAuthStore.js';

const CHANNELS = [
  { id: 'lofi', name: 'Ambient Chill / Synthwave Lounge', color: '#6366f1' },
  { id: 'cyber', name: 'Cyberpunk HUD Telemetry Stream', color: '#00f3ff' },
  { id: 'nature', name: 'Deep Forest 4K Live Stream', color: '#10b981' },
  { id: 'space', name: 'ISS Live Low Earth Orbit HD', color: '#a855f7' },
];

const INITIAL_ROOMS = {
  room1: {
    id: 'room1',
    name: 'Master Bedroom',
    isPhysical: true,
    light: { on: false, brightness: 1.2, color: '#fff6e0', emissiveIntensity: 3.5 },
    fan: { on: false, speed: 0, targetSpeed: 0, maxSpeed: 12.0, acceleration: 3.0 },
    door: { open: false, angle: 0, targetAngle: 0, maxAngle: Math.PI * 0.46 },
    tv: { on: false, channelIndex: 0, channels: CHANNELS, volume: 75 },
    ac: { on: true, temp: 24, targetTemperature: 24, autoMode: true },
    buzzer: false,
    partyMode: false,
    blinds: { open: true },
  },
  room2: {
    id: 'room2',
    name: 'Living Room',
    isPhysical: false,
    light: { on: false, brightness: 1.2, color: '#fff6e0', emissiveIntensity: 3.5 },
    fan: { on: false, speed: 0, targetSpeed: 0, maxSpeed: 12.0, acceleration: 3.0 },
    door: { open: false, angle: 0, targetAngle: 0, maxAngle: Math.PI * 0.46 },
    tv: { on: false, channelIndex: 1, channels: CHANNELS, volume: 80 },
    ac: { on: true, temp: 23, targetTemperature: 23, autoMode: true },
    buzzer: false,
    partyMode: false,
    blinds: { open: true },
  },
  room3: {
    id: 'room3',
    name: 'Study Room',
    isPhysical: false,
    light: { on: false, brightness: 1.2, color: '#fff6e0', emissiveIntensity: 3.5 },
    fan: { on: false, speed: 0, targetSpeed: 0, maxSpeed: 12.0, acceleration: 3.0 },
    door: { open: false, angle: 0, targetAngle: 0, maxAngle: Math.PI * 0.46 },
    tv: { on: false, channelIndex: 2, channels: CHANNELS, volume: 50 },
    ac: { on: false, temp: 25, targetTemperature: 25, autoMode: false },
    buzzer: false,
    partyMode: false,
    blinds: { open: false },
  },
  room4: {
    id: 'room4',
    name: 'Guest Bedroom',
    isPhysical: false,
    light: { on: false, brightness: 1.2, color: '#fff6e0', emissiveIntensity: 3.5 },
    fan: { on: false, speed: 0, targetSpeed: 0, maxSpeed: 12.0, acceleration: 3.0 },
    door: { open: false, angle: 0, targetAngle: 0, maxAngle: Math.PI * 0.46 },
    tv: { on: false, channelIndex: 0, channels: CHANNELS, volume: 60 },
    ac: { on: false, temp: 26, targetTemperature: 26, autoMode: false },
    buzzer: false,
    partyMode: false,
    blinds: { open: true },
  }
};

export const useCommandStore = create((set, get) => ({
  // --- Active Room Selection ---
  activeRoomId: 'room1', // Default: Master Bedroom (Physical ESP32 Hardware)

  // --- Multi-Room Independent States ---
  rooms: INITIAL_ROOMS,

  // --- Active Room Top-Level Mirrors (for easy reactivity) ---
  light: INITIAL_ROOMS.room1.light,
  fan: INITIAL_ROOMS.room1.fan,
  door: INITIAL_ROOMS.room1.door,
  tv: INITIAL_ROOMS.room1.tv,
  ac: INITIAL_ROOMS.room1.ac,
  buzzer: INITIAL_ROOMS.room1.buzzer,
  partyMode: INITIAL_ROOMS.room1.partyMode,
  blinds: INITIAL_ROOMS.room1.blinds,

  // --- Live Sensor Telemetry from ESP32 (Room 1) ---
  sensors: {
    temperature: 29.0, // DHT11 °C
    humidity: 58,      // DHT11 %
    lastUpdated: Date.now()
  },

  // --- Informational PIR Presence from ESP32 ---
  presence: {
    motionDetected: false,
    status: 'ACTIVE',
    lastChangedAt: Date.now()
  },

  telemetry: {
    source: 'Vision System',
    command: 'READY',
    target: 'Smart Room',
    gesture: 'NONE',
    confidence: 100,
    timestamp: Date.now(),
  },

  history: [],
  cameraPreset: 'DEFAULT', // 'DEFAULT' | 'LIGHT' | 'FAN' | 'DOOR' | 'TV' | 'TOP_DOWN'

  // --- Room Selection Action ---
  setActiveRoom: (roomId) => {
    const state = get();
    if (!state.rooms[roomId]) return;
    const targetRoom = state.rooms[roomId];

    set({
      activeRoomId: roomId,
      light: targetRoom.light,
      fan: targetRoom.fan,
      door: targetRoom.door,
      tv: targetRoom.tv,
      ac: targetRoom.ac,
      buzzer: targetRoom.buzzer,
      partyMode: targetRoom.partyMode,
      blinds: targetRoom.blinds,
    });

    audioFeedback.playTone(550, 'sine', 0.1, 0.04);
    console.log(`[useCommandStore] Switched active room to: ${targetRoom.name} (${roomId})`);
  },

  // --- Device Setters ---
  setLight: (lightState) => {
    const activeId = get().activeRoomId;
    set((s) => ({
      light: { ...s.light, ...lightState },
      rooms: {
        ...s.rooms,
        [activeId]: {
          ...s.rooms[activeId],
          light: { ...s.rooms[activeId].light, ...lightState }
        }
      }
    }));
  },

  syncHardwareState: (hwState) => {
    if (!hwState || typeof hwState !== 'object') return;
    const state = get();
    const room1 = state.rooms.room1;
    if (!room1) return;

    const updatedRoom1 = { ...room1 };
    if (typeof hwState.light === 'boolean') {
      updatedRoom1.light = { ...room1.light, on: hwState.light };
    }
    if (typeof hwState.buzzer === 'boolean') {
      updatedRoom1.buzzer = hwState.buzzer;
    }
    if (typeof hwState.fan === 'boolean') {
      updatedRoom1.fan = { ...room1.fan, on: hwState.fan, targetSpeed: hwState.fan ? 12.0 : 0 };
    }
    if (hwState.door !== undefined) {
      const isOpen = hwState.door === 'open' || hwState.door === true;
      updatedRoom1.door = { ...room1.door, open: isOpen, targetAngle: isOpen ? room1.door.maxAngle : 0 };
    }

    const newRooms = { ...state.rooms, room1: updatedRoom1 };
    const updates = { rooms: newRooms };
    if (state.activeRoomId === 'room1') {
      if (typeof hwState.light === 'boolean') updates.light = updatedRoom1.light;
      if (typeof hwState.buzzer === 'boolean') updates.buzzer = updatedRoom1.buzzer;
      if (typeof hwState.fan === 'boolean') updates.fan = updatedRoom1.fan;
      if (hwState.door !== undefined) updates.door = updatedRoom1.door;
    }
    set(updates);
  },

  toggleLight: () => {
    const nextOn = !get().light.on;
    get().dispatchCommand(nextOn ? 'LIGHT_ON' : 'LIGHT_OFF');
  },

  setFan: (fanState) => {
    const activeId = get().activeRoomId;
    set((s) => ({
      fan: { ...s.fan, ...fanState },
      rooms: {
        ...s.rooms,
        [activeId]: {
          ...s.rooms[activeId],
          fan: { ...s.rooms[activeId].fan, ...fanState }
        }
      }
    }));
  },

  toggleFan: () => {
    const nextOn = !get().fan.on;
    get().dispatchCommand(nextOn ? 'FAN_ON' : 'FAN_OFF');
  },

  openDoor: () => get().dispatchCommand('DOOR_OPEN'),
  closeDoor: () => get().dispatchCommand('DOOR_CLOSE'),
  toggleDoor: () => get().dispatchCommand('DOOR_TOGGLE'),

  setTv: (tvState) => {
    const activeId = get().activeRoomId;
    set((s) => ({
      tv: { ...s.tv, ...tvState },
      rooms: {
        ...s.rooms,
        [activeId]: {
          ...s.rooms[activeId],
          tv: { ...s.rooms[activeId].tv, ...tvState }
        }
      }
    }));
  },

  toggleTv: () => get().dispatchCommand('TV_TOGGLE'),

  nextChannel: () => {
    const activeId = get().activeRoomId;
    const curTv = get().rooms[activeId].tv;
    const nextIdx = (curTv.channelIndex + 1) % curTv.channels.length;
    get().dispatchCommand('TV_NEXT_CHANNEL');
  },

  setAcTemp: (temp) => {
    const clamped = Math.max(18, Math.min(30, Number(temp)));
    get().dispatchCommand('SET_AC_TEMP', { temp: clamped });
  },

  toggleAcPower: () => {
    const next = !get().ac.on;
    get().dispatchCommand(next ? 'AC_ON' : 'AC_OFF');
  },

  toggleAcAutoMode: () => {
    const next = !get().ac.autoMode;
    get().dispatchCommand('AC_AUTO_TOGGLE', { autoMode: next });
  },

  setBuzzer: (buzzerState) => {
    get().dispatchCommand(buzzerState ? 'BUZZER_ON' : 'BUZZER_OFF');
  },

  toggleBuzzer: () => {
    const next = !get().buzzer;
    get().dispatchCommand(next ? 'BUZZER_ON' : 'BUZZER_OFF');
  },

  setSensors: (sensorsData) =>
    set((state) => ({
      sensors: {
        ...state.sensors,
        ...sensorsData,
        lastUpdated: Date.now()
      }
    })),

  setPresence: (motionDetected) =>
    set((state) => ({
      presence: {
        motionDetected: Boolean(motionDetected),
        status: 'ACTIVE',
        lastChangedAt: Date.now()
      }
    })),

  setCameraPreset: (preset) => set({ cameraPreset: preset }),

  updateTelemetry: (partial) =>
    set((state) => ({
      telemetry: {
        ...state.telemetry,
        ...partial,
        timestamp: Date.now(),
      },
    })),

  clearHistory: () => set({ history: [] }),

  /**
   * Room-Aware Command Dispatcher
   * Routes command to the selected active room.
   * If Master Room ('room1'): syncs to ESP32 physical paths in Firebase (Admin only).
   * If Digital Twin ('room2', 'room3', 'room4'): updates ONLY that room's digital twin state.
   */
  dispatchCommand: (command, meta = {}) => {
    const state = get();
    const cmd = command.toUpperCase().trim();
    const gesture = meta.gesture || 'MANUAL_OVERLAY';
    const confidence = meta.confidence ?? 100;
    const source = meta.source || 'USER_HUD';

    const targetRoomId = meta.roomId || state.activeRoomId || 'room1';
    const targetRoom = state.rooms[targetRoomId] || state.rooms.room1;
    const roomName = targetRoom.name;
    const isMaster = (targetRoomId === 'room1');

    // Guest Permission Guard: Guests can explore all rooms but cannot trigger physical ESP32 commands
    const authUser = useAuthStore.getState().currentUser;
    const isGuest = (authUser?.role === 'guest');
    if (isGuest && isMaster && cmd !== 'RESET_ROOM') {
      console.log(`[Permission Guard] Blocked guest hardware command "${cmd}" on ${roomName}`);
      audioFeedback.playWarning();
      return {
        success: false,
        command: cmd,
        target: `${roomName} (Physical ESP32)`,
        message: 'Admin access required for Master Room physical ESP32 hardware',
        permissionDenied: true
      };
    }

    let target = `${roomName}`;
    let message = '';
    let success = true;

    // Changes to apply to target room
    const roomUpdates = { ...targetRoom };
    const firebasePayload = { mode: 'ROOM_CONTROL', source, roomId: targetRoomId };

    switch (cmd) {
      case 'LIGHT_ON': {
        target = `${roomName} Light`;
        message = `${roomName}: Light turned ON`;
        audioFeedback.playLightOn();
        roomUpdates.light = { ...targetRoom.light, on: true };
        firebasePayload.light = true;
        break;
      }

      case 'LIGHT_OFF': {
        target = `${roomName} Light`;
        message = `${roomName}: Light turned OFF`;
        audioFeedback.playLightOff();
        roomUpdates.light = { ...targetRoom.light, on: false };
        firebasePayload.light = false;
        break;
      }

      case 'LIGHT_TOGGLE': {
        target = `${roomName} Light`;
        const next = !targetRoom.light.on;
        message = `${roomName}: Light ${next ? 'turned ON' : 'turned OFF'}`;
        if (next) audioFeedback.playLightOn();
        else audioFeedback.playLightOff();
        roomUpdates.light = { ...targetRoom.light, on: next };
        firebasePayload.light = next;
        break;
      }

      case 'FAN_ON': {
        target = `${roomName} Fan`;
        message = `${roomName}: Fan engaged`;
        audioFeedback.playFanOn();
        roomUpdates.fan = { ...targetRoom.fan, on: true, targetSpeed: targetRoom.fan.maxSpeed };
        firebasePayload.fan = true;
        break;
      }

      case 'FAN_OFF': {
        target = `${roomName} Fan`;
        message = `${roomName}: Fan decelerating`;
        audioFeedback.playFanOff();
        roomUpdates.fan = { ...targetRoom.fan, on: false, targetSpeed: 0 };
        firebasePayload.fan = false;
        break;
      }

      case 'FAN_TOGGLE': {
        target = `${roomName} Fan`;
        const next = !targetRoom.fan.on;
        message = `${roomName}: Fan ${next ? 'engaged' : 'decelerating'}`;
        if (next) audioFeedback.playFanOn();
        else audioFeedback.playFanOff();
        roomUpdates.fan = { ...targetRoom.fan, on: next, targetSpeed: next ? targetRoom.fan.maxSpeed : 0 };
        firebasePayload.fan = next;
        break;
      }

      case 'DOOR_OPEN': {
        target = `${roomName} Door`;
        message = `${roomName}: Door Opened`;
        audioFeedback.playDoorOpen();
        roomUpdates.door = { ...targetRoom.door, open: true };
        firebasePayload.door = 'open';
        break;
      }

      case 'DOOR_CLOSE': {
        target = `${roomName} Door`;
        message = `${roomName}: Door Closed`;
        audioFeedback.playDoorClose();
        roomUpdates.door = { ...targetRoom.door, open: false };
        firebasePayload.door = 'close';
        break;
      }

      case 'DOOR_TOGGLE': {
        target = `${roomName} Door`;
        const next = !targetRoom.door.open;
        message = `${roomName}: Door ${next ? 'Opened' : 'Closed'}`;
        if (next) audioFeedback.playDoorOpen();
        else audioFeedback.playDoorClose();
        roomUpdates.door = { ...targetRoom.door, open: next };
        firebasePayload.door = next ? 'open' : 'close';
        break;
      }

      case 'TV_ON': {
        target = `${roomName} TV`;
        message = `${roomName}: TV turned ON`;
        audioFeedback.playTvOn();
        roomUpdates.tv = { ...targetRoom.tv, on: true };
        firebasePayload.tv = true;
        break;
      }

      case 'TV_OFF': {
        if (targetRoom.tv && targetRoom.tv.on === false) {
          console.log(`[Command Deduplication] TV_OFF skipped: ${roomName} TV is already OFF`);
          return { success: true, command: cmd, target: `${roomName} TV`, message: '', noop: true };
        }
        target = `${roomName} TV`;
        message = `${roomName}: TV turned OFF`;
        audioFeedback.playTvOff();
        roomUpdates.tv = { ...targetRoom.tv, on: false };
        firebasePayload.tv = false;
        break;
      }

      case 'TV_TOGGLE': {
        target = `${roomName} TV`;
        const next = !targetRoom.tv.on;
        message = `${roomName}: TV ${next ? 'turned ON' : 'turned OFF'}`;
        if (next) audioFeedback.playTvOn();
        else audioFeedback.playTvOff();
        roomUpdates.tv = { ...targetRoom.tv, on: next };
        firebasePayload.tv = next;
        break;
      }

      case 'TV_NEXT_CHANNEL': {
        target = `${roomName} TV`;
        const nextIdx = (targetRoom.tv.channelIndex + 1) % targetRoom.tv.channels.length;
        message = `${roomName}: TV Channel ${targetRoom.tv.channels[nextIdx].name}`;
        audioFeedback.playChannelChange();
        roomUpdates.tv = { ...targetRoom.tv, on: true, channelIndex: nextIdx };
        firebasePayload.tv = true;
        break;
      }

      case 'BLINDS_TOGGLE': {
        target = `${roomName} Blinds`;
        const next = !targetRoom.blinds.open;
        message = `${roomName}: Blinds ${next ? 'Opened' : 'Closed'}`;
        audioFeedback.playTone(next ? 520 : 390, 'sine', 0.15, 0.05);
        roomUpdates.blinds = { ...targetRoom.blinds, open: next };
        break;
      }

      case 'AC_ON': {
        if (targetRoom.ac && targetRoom.ac.on === true) {
          console.log(`[Command Deduplication] AC_ON skipped: ${roomName} AC is already ON`);
          return { success: true, command: cmd, target: `${roomName} AC`, message: '', noop: true };
        }
        target = `${roomName} AC`;
        message = `${roomName}: AC ON at ${targetRoom.ac.temp}°C`;
        audioFeedback.playTone(600, 'sine', 0.2, 0.05);
        roomUpdates.ac = { ...targetRoom.ac, on: true };
        firebasePayload.ac = { on: true, targetTemperature: targetRoom.ac.temp };
        break;
      }

      case 'AC_OFF': {
        if (targetRoom.ac && targetRoom.ac.on === false) {
          console.log(`[Command Deduplication] AC_OFF skipped: ${roomName} AC is already OFF`);
          return { success: true, command: cmd, target: `${roomName} AC`, message: '', noop: true };
        }
        target = `${roomName} AC`;
        message = `${roomName}: AC turned OFF`;
        audioFeedback.playTone(400, 'sine', 0.2, 0.05);
        roomUpdates.ac = { ...targetRoom.ac, on: false };
        firebasePayload.ac = { on: false, targetTemperature: targetRoom.ac.temp };
        break;
      }

      case 'AC_TOGGLE': {
        target = `${roomName} AC`;
        const next = !targetRoom.ac.on;
        message = `${roomName}: AC ${next ? 'cooling active' : 'turned off'}`;
        audioFeedback.playTone(next ? 600 : 400, 'sine', 0.2, 0.05);
        roomUpdates.ac = { ...targetRoom.ac, on: next };
        firebasePayload.ac = { on: next, targetTemperature: targetRoom.ac.temp };
        break;
      }

      case 'TEMP_UP': {
        target = `${roomName} AC`;
        const newTemp = Math.min(30, targetRoom.ac.temp + 1);
        if (newTemp === targetRoom.ac.temp) {
          return { success: true, command: cmd, target: `${roomName} AC`, message: '', noop: true };
        }
        message = `${roomName}: AC raised to ${newTemp}°C`;
        audioFeedback.playTone(680, 'sine', 0.1, 0.04);
        roomUpdates.ac = { ...targetRoom.ac, temp: newTemp, targetTemperature: newTemp, on: true };
        firebasePayload.ac = { on: true, targetTemperature: newTemp };
        break;
      }

      case 'TEMP_DOWN': {
        target = `${roomName} AC`;
        const newTemp = Math.max(18, targetRoom.ac.temp - 1);
        if (newTemp === targetRoom.ac.temp) {
          return { success: true, command: cmd, target: `${roomName} AC`, message: '', noop: true };
        }
        message = `${roomName}: AC lowered to ${newTemp}°C`;
        audioFeedback.playTone(480, 'sine', 0.1, 0.04);
        roomUpdates.ac = { ...targetRoom.ac, temp: newTemp, targetTemperature: newTemp, on: true };
        firebasePayload.ac = { on: true, targetTemperature: newTemp };
        break;
      }

      case 'SET_AC_TEMP': {
        target = `${roomName} AC`;
        const targetTemp = Math.max(18, Math.min(30, Number(meta.temp || targetRoom.ac.temp)));
        if (targetRoom.ac.temp === targetTemp) {
          return { success: true, command: cmd, target: `${roomName} AC`, message: '', noop: true };
        }
        message = `${roomName}: AC target set to ${targetTemp}°C`;
        audioFeedback.playTone(620, 'sine', 0.1, 0.04);
        roomUpdates.ac = { ...targetRoom.ac, temp: targetTemp, targetTemperature: targetTemp };
        firebasePayload.ac = { on: targetRoom.ac.on, targetTemperature: targetTemp };
        break;
      }

      case 'AC_AUTO_TOGGLE': {
        target = `${roomName} AC`;
        const autoNext = meta.autoMode !== undefined ? meta.autoMode : !targetRoom.ac.autoMode;
        message = `${roomName}: AC Auto Mode ${autoNext ? 'ENABLED' : 'DISABLED'}`;
        audioFeedback.playTone(autoNext ? 650 : 450, 'sine', 0.12, 0.04);
        roomUpdates.ac = { ...targetRoom.ac, autoMode: autoNext };
        break;
      }

      case 'BUZZER_ON': {
        if (targetRoom.buzzer === true) {
          console.log(`[Command Deduplication] BUZZER_ON skipped: ${roomName} buzzer is already ON`);
          return { success: true, command: cmd, target: `${roomName} Buzzer`, message: '', noop: true };
        }
        target = `${roomName} Buzzer`;
        message = isMaster ? 'Master Room: Physical Buzzer Alarm ACTIVATED' : `${roomName}: Buzzer Alarm Sounded`;
        audioFeedback.playTone(880, 'square', 0.2, 0.08);
        roomUpdates.buzzer = true;
        if (isMaster) firebasePayload.buzzer = true;
        break;
      }

      case 'BUZZER_OFF': {
        if (targetRoom.buzzer === false) {
          console.log(`[Command Deduplication] BUZZER_OFF skipped: ${roomName} buzzer is already OFF`);
          return { success: true, command: cmd, target: `${roomName} Buzzer`, message: '', noop: true };
        }
        target = `${roomName} Buzzer`;
        message = isMaster ? 'Master Room: Physical Buzzer Muted' : `${roomName}: Buzzer Muted`;
        audioFeedback.playTone(440, 'sine', 0.15, 0.04);
        roomUpdates.buzzer = false;
        if (isMaster) firebasePayload.buzzer = false;
        break;
      }

      case 'PARTY_MODE': {
        target = `${roomName} Party Mode`;
        const next = !targetRoom.partyMode;
        message = `${roomName}: Party Mode ${next ? 'ACTIVATED' : 'DEACTIVATED'}`;
        audioFeedback.playTone(next ? 880 : 330, 'triangle', 0.3, 0.08);
        roomUpdates.partyMode = next;
        if (next) {
          roomUpdates.light = { ...targetRoom.light, on: true, emissiveIntensity: 5.0 };
          roomUpdates.fan = { ...targetRoom.fan, on: true, targetSpeed: targetRoom.fan.maxSpeed };
          roomUpdates.tv = { ...targetRoom.tv, on: true };
          firebasePayload.light = true;
          firebasePayload.fan = true;
          firebasePayload.tv = true;
        }
        break;
      }

      default: {
        success = false;
        message = `Command "${cmd}" not recognized`;
        audioFeedback.playWarning();
        break;
      }
    }

    // Update Zustand state
    const newRooms = {
      ...state.rooms,
      [targetRoomId]: roomUpdates
    };

    const stateUpdates = { rooms: newRooms };

    // If updating currently active room, also update top-level mirrors
    if (targetRoomId === state.activeRoomId) {
      stateUpdates.light = roomUpdates.light;
      stateUpdates.fan = roomUpdates.fan;
      stateUpdates.door = roomUpdates.door;
      stateUpdates.tv = roomUpdates.tv;
      stateUpdates.ac = roomUpdates.ac;
      stateUpdates.buzzer = roomUpdates.buzzer;
      stateUpdates.blinds = roomUpdates.blinds;
      stateUpdates.partyMode = roomUpdates.partyMode;
    }

    set(stateUpdates);

    // Normalize final action name for telemetry
    let finalActionName = cmd;
    if (cmd === 'LIGHT_TOGGLE') finalActionName = roomUpdates.light?.on ? 'LIGHT_ON' : 'LIGHT_OFF';
    else if (cmd === 'FAN_TOGGLE') finalActionName = roomUpdates.fan?.on ? 'FAN_ON' : 'FAN_OFF';
    else if (cmd === 'DOOR_TOGGLE') finalActionName = roomUpdates.door?.open ? 'DOOR_OPEN' : 'DOOR_CLOSE';
    else if (cmd === 'TV_TOGGLE') finalActionName = roomUpdates.tv?.on ? 'TV_ON' : 'TV_OFF';
    else if (cmd === 'AC_TOGGLE') finalActionName = roomUpdates.ac?.on ? 'AC_ON' : 'AC_OFF';

    const resolvedGesture = (gesture && gesture !== 'MANUAL_OVERLAY' && gesture !== 'SYSTEM')
      ? gesture
      : (cmd === 'LIGHT_ON' ? 'OPEN_PALM' : (cmd === 'LIGHT_OFF' ? 'CLOSED_FIST' : (cmd === 'BUZZER_ON' ? 'THUMB_UP' : (cmd === 'BUZZER_OFF' ? 'THUMB_DOWN' : (cmd === 'FAN_ON' ? 'POINT_UP' : (cmd === 'FAN_OFF' ? 'POINT_DOWN' : (cmd === 'DOOR_OPEN' || cmd === 'DOOR_TOGGLE' ? 'OK_SIGN' : (cmd === 'DOOR_CLOSE' ? 'OK_SIGN' : 'NONE'))))))));

    console.log(`[Command Dispatch] Room: ${targetRoomId} (${roomName}) | Gesture: ${resolvedGesture} | Action: ${finalActionName}`);

    // Immediate write to Firebase Realtime Database
    if (success) {
      firebasePayload.lastGesture = resolvedGesture;
      firebasePayload.lastAction = finalActionName;
      firebaseService.updateRoomDevices(targetRoomId, firebasePayload).catch((e) => {
        console.warn('[Firebase RTDB] write error:', e);
      });
    }

    // Add to history
    const newEntry = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      command: cmd,
      target,
      gesture,
      confidence: Math.round(confidence),
      message,
      success,
      timestamp: Date.now(),
      source,
      roomId: targetRoomId
    };

    set((s) => ({
      history: [newEntry, ...s.history.slice(0, 49)],
      telemetry: {
        source,
        command: cmd,
        target,
        gesture: resolvedGesture,
        confidence: Math.round(confidence),
        timestamp: Date.now(),
      }
    }));

    return { success, command: cmd, target, message };
  },
}));
