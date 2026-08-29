import { useCommandStore } from '../store/useCommandStore';
import { resolveGestureToCommand } from './gestureMapper';

/**
 * GestureBridge Service
 * Hub connecting MediaPipe webcam feeds, AirOS WebSocket telemetry,
 * and simulator inputs into the Command State System.
 */
class GestureBridgeService {
  constructor() {
    this.ws = null;
    this.wsUrl = 'ws://127.0.0.1:8000/ws/telemetry';
    this.reconnectTimer = null;
    this.lastTriggeredGesture = null;
    this.lastTriggeredTime = 0;
    this.cooldownMs = 1200; // Debounce cooldown between discrete gestures
    this.isListening = false;
    this.externalListeners = new Set();
  }

  init() {
    if (this.isListening) return;
    this.isListening = true;
    this.connectWebSocket();
  }

  connectWebSocket() {
    try {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return;
      }

      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[GestureBridge] Connected to AirOS Python Telemetry WebSocket.');
        useCommandStore.getState().updateTelemetry({ connectedToBackend: true, source: 'AirOS Engine (Webcam Active)' });
        if (this.reconnectTimer) {
          clearInterval(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'telemetry') {
            this.handleTelemetryFrame(data);
          }
        } catch (err) {
          // Ignore parsing glitch
        }
      };

      this.ws.onclose = () => {
        useCommandStore.getState().updateTelemetry({ connectedToBackend: false });
        if (!this.reconnectTimer) {
          this.reconnectTimer = setInterval(() => {
            if (this.isListening) this.connectWebSocket();
          }, 4000);
        }
      };

      this.ws.onerror = () => {
        useCommandStore.getState().updateTelemetry({ connectedToBackend: false });
      };
    } catch (e) {
      console.warn('[GestureBridge] WebSocket error:', e);
    }
  }

  /**
   * Process telemetry packet from AirOS or MediaPipe HandLandmarker
   */
  handleTelemetryFrame(data) {
    const rawGesture = data.gesture || 'NONE';
    const confidence = data.confidence || 0;
    const fps = data.fps || 30;

    // Notify registered sub-handlers (e.g. video HUD visualizers)
    this.externalListeners.forEach((fn) => fn(data));

    if (rawGesture === 'NONE' || !rawGesture) {
      useCommandStore.getState().updateTelemetry({
        fps,
        source: data.camera_connected ? 'AirOS Live Stream' : 'Awaiting Gesture'
      });
      return;
    }

    this.processDetectedGesture(rawGesture, confidence, 'AirOS CV Stream', fps);
  }

  /**
   * Universal ingestion point for any MediaPipe pipeline (Python, WebWorker, or In-Browser).
   * @param {string} gestureName - e.g. "OPEN_PALM", "FIST", "POINT_UP", "THUMBS_UP"
   * @param {number} confidence - 0 to 100
   * @param {string} source - e.g. "MediaPipe Hands", "Simulator", "AirOS"
   * @param {number} fps - current FPS
   */
  processDetectedGesture(gestureName, confidence = 95, source = 'MediaPipe HandLandmarker', fps = 60) {
    const now = Date.now();

    // 1. Resolve gesture to command
    const resolved = resolveGestureToCommand(gestureName, confidence);

    if (!resolved || !resolved.valid || !resolved.command) {
      useCommandStore.getState().updateTelemetry({
        gesture: gestureName,
        intent: resolved?.intent || 'UNRECOGNIZED',
        confidence,
        source,
        fps
      });
      return;
    }

    // 2. Debounce / cooldown check
    if (this.lastTriggeredGesture === resolved.command && now - this.lastTriggeredTime < this.cooldownMs) {
      // Still in cooldown for same command
      useCommandStore.getState().updateTelemetry({
        gesture: gestureName,
        intent: `${resolved.command} (Debouncing...)`,
        confidence,
        source,
        fps
      });
      return;
    }

    // 3. Dispatch into global Command State System
    this.lastTriggeredGesture = resolved.command;
    this.lastTriggeredTime = now;

    useCommandStore.getState().dispatchCommand(resolved.command, {
      gesture: gestureName,
      confidence,
      source
    });
  }

  /**
   * Manual or Simulated Gesture Injection (for testing & interactive HUD controls)
   */
  simulateGesture(gestureName, confidence = 98.5) {
    this.processDetectedGesture(gestureName, confidence, 'Gesture Simulator', 60);
  }

  /**
   * Add listener for raw telemetry frames
   */
  addListener(callback) {
    this.externalListeners.add(callback);
    return () => this.externalListeners.delete(callback);
  }

  disconnect() {
    this.isListening = false;
    if (this.reconnectTimer) clearInterval(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}

export const gestureBridge = new GestureBridgeService();
