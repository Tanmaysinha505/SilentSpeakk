/**
 * SilentSpeak / Agent 44 — Firebase Integration Module
 * Handles Realtime Database IoT synchronization with ESP32 and digital twins,
 * Anonymous Authentication, Cloud Firestore (Per-User History), and Storage.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import {
  getStorage
} from 'firebase/storage';
import {
  getDatabase,
  ref as rtdbRef,
  update as rtdbUpdate,
  onValue as rtdbOnValue,
  set as rtdbSet
} from 'firebase/database';

// 1. Firebase Project Configuration
export const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyD7NfJqGqrkuxC2x4Gvwb2konxbUNGlnAc",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "silentspeakk.firebaseapp.com",
  databaseURL: import.meta.env?.VITE_FIREBASE_DATABASE_URL || "https://silentspeakk-default-rtdb.firebaseio.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "silentspeakk",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "silentspeakk.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "161059501134",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:161059501134:web:93073b657f799a58afff1f",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-NTBFXVY1EG"
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'PASTE_MY_API_KEY_HERE' &&
  !firebaseConfig.apiKey.includes('PASTE_')
);

// 2. Initialize Firebase instances safely
let app = null;
let auth = null;
let db = null;
let storage = null;
let rtdb = null;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  const dbUrl = import.meta.env?.VITE_FIREBASE_DATABASE_URL || firebaseConfig.databaseURL || "https://silentspeakk-default-rtdb.firebaseio.com";
  rtdb = getDatabase(app, dbUrl);

  if (rtdb) {
    const connectedRef = rtdbRef(rtdb, '.info/connected');
    rtdbOnValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        console.log('[Firebase RTDB] Connected to realtime database');
      }
    });
  }
} catch (err) {
  console.error('[Firebase] Initialization error:', err);
}

export { app, auth, db, storage, rtdb };

// 3. User Authentication & IoT Service
class FirebaseService {
  constructor() {
    this.currentUser = null;
    this.authListeners = new Set();
    this.isReady = false;
    this.initAuth();
  }

  async initAuth() {
    if (!auth) return;

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        this.isReady = true;
        this.notifyAuthListeners(user);
        await this.ensureUserProfile(user.uid, user.isAnonymous);
      } else {
        try {
          if (isFirebaseConfigured) {
            const credential = await signInAnonymously(auth);
            this.currentUser = credential.user;
            this.isReady = true;
            this.notifyAuthListeners(credential.user);
            await this.ensureUserProfile(credential.user.uid, true);
          }
        } catch (authError) {
          console.warn('[Firebase Auth] Anonymous sign-in notice:', authError.message);
        }
      }
    });
  }

  subscribeAuth(callback) {
    this.authListeners.add(callback);
    if (this.currentUser) callback(this.currentUser);
    return () => this.authListeners.delete(callback);
  }

  notifyAuthListeners(user) {
    this.authListeners.forEach((fn) => fn(user));
  }

  getUid() {
    return this.currentUser ? this.currentUser.uid : null;
  }

  async ensureUserProfile(userId, isAnonymous = true) {
    if (!db || !userId) return;
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: userId,
          isAnonymous,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          activeMode: 'ROOM_CONTROL',
          platform: navigator.userAgent || 'web'
        }, { merge: true });
      } else {
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
      }
    } catch (e) {}
  }

  async saveCustomGesture(userId, mode, gestureData) {
    if (!db || !userId || !gestureData.gesture) return;
    try {
      const docId = `${mode}_${gestureData.gesture}`;
      const gestureRef = doc(db, 'users', userId, 'custom_gestures', docId);
      await setDoc(gestureRef, {
        gesture: gestureData.gesture,
        action: gestureData.action,
        spoken: gestureData.spoken || gestureData.action,
        mode: mode,
        userId: userId,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (e) {
      return false;
    }
  }

  // =========================================================================
  // FIREBASE REALTIME DATABASE (AGENT 44 IOT SMART ROOM CONTROL)
  // =========================================================================

  /**
   * Updates Realtime Database with device states for a specific room.
   * - If roomId === 'room1' (Master Room):
   *     Writes directly to physical ESP32 endpoints:
   *       agent44/room/light
   *       agent44/room/buzzer
   *       agent44/room/door
   *       agent44/room/fan
   *       agent44/room/tv
   *       agent44/room/ac/*
   * - If roomId === 'room2' | 'room3' | 'room4' (Digital Twins):
   *     Writes ONLY to agent44/rooms/{roomId}/* (NEVER touches physical ESP32 paths).
   */
  async updateRoomDevices(roomId = 'room1', payload = {}) {
    if (!rtdb) {
      try {
        const dbUrl = import.meta.env?.VITE_FIREBASE_DATABASE_URL || firebaseConfig.databaseURL || "https://silentspeakk-default-rtdb.firebaseio.com";
        rtdb = getDatabase(app, dbUrl);
      } catch (e) {
        console.error("Firebase command failed:", e);
        throw e;
      }
    }

    if (!rtdb) return;

    try {
      const updates = {};
      const isMaster = (roomId === 'room1');

      if (isMaster) {
        // Physical ESP32 hardware endpoints (Comprehensive multi-path compatibility)
        if (typeof payload.light === 'boolean') {
          updates['agent44/room/light'] = payload.light;
          updates['agent44/light'] = payload.light;
          updates['agent44/devices/light'] = payload.light ? 1 : 0;
          updates['agent44/led'] = payload.light;
          updates['agent44/lightState'] = payload.light ? 'ON' : 'OFF';
          updates['agent44/room/lightState'] = payload.light ? 'ON' : 'OFF';
        }
        if (typeof payload.buzzer === 'boolean') {
          updates['agent44/room/buzzer'] = payload.buzzer;
          updates['agent44/buzzer'] = payload.buzzer;
          updates['agent44/devices/buzzer'] = payload.buzzer ? 1 : 0;
        }
        if (typeof payload.fan === 'boolean') {
          updates['agent44/room/fan'] = payload.fan;
          updates['agent44/fan'] = payload.fan;
        }
        if (typeof payload.door !== 'undefined') {
          const doorVal = typeof payload.door === 'boolean' ? (payload.door ? 'open' : 'close') : String(payload.door);
          const isOpen = doorVal === 'open' || payload.door === true;
          updates['agent44/room/door'] = doorVal;
          updates['agent44/door'] = doorVal;
          updates['agent44/servo'] = isOpen ? 90 : 0;
        }
        if (typeof payload.tv === 'boolean') {
          updates['agent44/room/tv'] = payload.tv;
          updates['agent44/tv'] = payload.tv;
        }
        if (payload.ac && typeof payload.ac === 'object') {
          if (typeof payload.ac.on === 'boolean') {
            updates['agent44/room/ac/on'] = payload.ac.on;
            updates['agent44/ac/on'] = payload.ac.on;
          }
          if (typeof payload.ac.targetTemperature === 'number' || typeof payload.ac.temp === 'number') {
            const targetT = payload.ac.targetTemperature ?? payload.ac.temp;
            updates['agent44/room/ac/targetTemperature'] = targetT;
            updates['agent44/ac/targetTemperature'] = targetT;
          }
        }
        updates['agent44/mode'] = payload.mode || 'ROOM_CONTROL';
        updates['agent44/lastGesture'] = payload.lastGesture || 'NONE';
        updates['agent44/lastAction'] = payload.lastAction || 'NONE';
        updates['agent44/updatedAt'] = Date.now();
      } else {
        // Independent simulated room endpoints (Zero physical hardware touch)
        const prefix = `agent44/rooms/${roomId}`;
        if (typeof payload.light === 'boolean') updates[`${prefix}/light`] = payload.light;
        if (typeof payload.fan === 'boolean') updates[`${prefix}/fan`] = payload.fan;
        if (typeof payload.door !== 'undefined') {
          const doorVal = typeof payload.door === 'boolean' ? (payload.door ? 'open' : 'close') : String(payload.door);
          updates[`${prefix}/door`] = doorVal;
        }
        if (typeof payload.tv === 'boolean') updates[`${prefix}/tv`] = payload.tv;
        if (payload.ac && typeof payload.ac === 'object') {
          if (typeof payload.ac.on === 'boolean') updates[`${prefix}/ac/on`] = payload.ac.on;
          if (typeof payload.ac.targetTemperature === 'number' || typeof payload.ac.temp === 'number') {
            updates[`${prefix}/ac/targetTemperature`] = payload.ac.targetTemperature ?? payload.ac.temp;
          }
        }
        updates[`${prefix}/lastGesture`] = payload.lastGesture || 'NONE';
        updates[`${prefix}/lastAction`] = payload.lastAction || 'NONE';
        updates[`${prefix}/updatedAt`] = Date.now();
      }

      await rtdbUpdate(rtdbRef(rtdb), updates);
      console.log(`[Firebase RTDB] Updated room: ${roomId}`, updates);

      // Ultra-reliable parallel REST write for zero-delay hardware delivery
      try {
        const dbUrl = import.meta.env?.VITE_FIREBASE_DATABASE_URL || firebaseConfig.databaseURL || "https://silentspeakk-default-rtdb.firebaseio.com";
        const cleanDbUrl = dbUrl.replace(/\/$/, '');
        if (isMaster) {
          const patchBody = {};
          if (typeof payload.light === 'boolean') {
            patchBody.light = payload.light;
            patchBody.led = payload.light;
            patchBody.lightState = payload.light ? 'ON' : 'OFF';
            patchBody['devices/light'] = payload.light ? 1 : 0;
            patchBody['room/light'] = payload.light;
            patchBody['room/lightState'] = payload.light ? 'ON' : 'OFF';
          }
          if (typeof payload.buzzer === 'boolean') {
            patchBody.buzzer = payload.buzzer;
            patchBody['devices/buzzer'] = payload.buzzer ? 1 : 0;
            patchBody['room/buzzer'] = payload.buzzer;
          }
          if (typeof payload.door !== 'undefined') {
            const doorVal = typeof payload.door === 'boolean' ? (payload.door ? 'open' : 'close') : String(payload.door);
            patchBody.door = doorVal;
            patchBody.servo = (doorVal === 'open' || payload.door === true) ? 90 : 0;
            patchBody['room/door'] = doorVal;
          }
          if (typeof payload.fan === 'boolean') {
            patchBody.fan = payload.fan;
            patchBody['room/fan'] = payload.fan;
          }
          if (typeof payload.tv === 'boolean') {
            patchBody.tv = payload.tv;
            patchBody['room/tv'] = payload.tv;
          }
          patchBody.lastAction = payload.lastAction || (payload.light ? 'LIGHT_ON' : 'LIGHT_OFF');
          patchBody.lastGesture = payload.lastGesture || 'OPEN_PALM';
          patchBody.updatedAt = Date.now();

          fetch(`${cleanDbUrl}/agent44.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patchBody)
          }).catch(() => {});
        }
      } catch (restErr) {}

      return true;
    } catch (err) {
      console.error("Firebase command failed:", err);
      // Failsafe REST write even if SDK encountered error
      try {
        const dbUrl = import.meta.env?.VITE_FIREBASE_DATABASE_URL || firebaseConfig.databaseURL || "https://silentspeakk-default-rtdb.firebaseio.com";
        const cleanDbUrl = dbUrl.replace(/\/$/, '');
        if (roomId === 'room1' && typeof payload.light === 'boolean') {
          fetch(`${cleanDbUrl}/agent44.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              light: payload.light,
              led: payload.light,
              lightState: payload.light ? 'ON' : 'OFF',
              'room/light': payload.light,
              'room/lightState': payload.light ? 'ON' : 'OFF',
              'devices/light': payload.light ? 1 : 0
            })
          }).catch(() => {});
        }
      } catch (e) {}
      throw err;
    }
  }

  /**
   * Backwards compatible sendIoTCommand (defaults to Master Room)
   */
  async sendIoTCommand(payload = {}) {
    return this.updateRoomDevices('room1', payload);
  }

  /**
   * Subscribes to real-time DHT11 temperature & humidity sensors:
   * agent44/sensors/temperature
   * agent44/sensors/humidity
   */
  subscribeSensors(callback) {
    if (!rtdb) {
      try {
        const dbUrl = import.meta.env?.VITE_FIREBASE_DATABASE_URL || firebaseConfig.databaseURL || "https://silentspeakk-default-rtdb.firebaseio.com";
        rtdb = getDatabase(app, dbUrl);
      } catch (e) {}
    }
    if (!rtdb) return () => {};
    try {
      const sensorsRef = rtdbRef(rtdb, 'agent44/sensors');
      return rtdbOnValue(sensorsRef, (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.val());
        }
      }, (error) => {
        console.error('[Firebase RTDB] Sensors listener error:', error);
      });
    } catch (e) {
      return () => {};
    }
  }

  /**
   * Subscribes to 2-way hardware device state changes from ESP32:
   * agent44/room and agent44/light
   */
  subscribeHardwareState(callback) {
    if (!rtdb) {
      try {
        const dbUrl = import.meta.env?.VITE_FIREBASE_DATABASE_URL || firebaseConfig.databaseURL || "https://silentspeakk-default-rtdb.firebaseio.com";
        rtdb = getDatabase(app, dbUrl);
      } catch (e) {}
    }
    if (!rtdb) return () => {};
    try {
      const roomRef = rtdbRef(rtdb, 'agent44/room');
      return rtdbOnValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.val());
        }
      }, (error) => {
        console.error('[Firebase RTDB] Hardware state listener error:', error);
      });
    } catch (e) {
      return () => {};
    }
  }

  /**
   * Subscribes to real-time PIR motion presence: agent44/presence/motionDetected
   */
  subscribeMotionPresence(callback) {
    if (!rtdb) {
      try {
        const dbUrl = import.meta.env?.VITE_FIREBASE_DATABASE_URL || firebaseConfig.databaseURL || "https://silentspeakk-default-rtdb.firebaseio.com";
        rtdb = getDatabase(app, dbUrl);
      } catch (e) {}
    }
    if (!rtdb) return () => {};
    try {
      const motionRef = rtdbRef(rtdb, 'agent44/presence/motionDetected');
      return rtdbOnValue(motionRef, (snapshot) => {
        if (snapshot.exists()) {
          callback(Boolean(snapshot.val()));
        } else {
          callback(false);
        }
      }, () => {});
    } catch (e) {
      return () => {};
    }
  }
}

export const firebaseService = new FirebaseService();
