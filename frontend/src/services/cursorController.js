/**
 * CursorController Service
 * Smooths index fingertip movements with an Exponential Moving Average (EMA) filter
 * and sends mouse/OS events both locally in-browser and to the Python backend (pyautogui).
 */
class CursorControllerService {
  constructor() {
    this.cursorX = window.innerWidth / 2;
    this.cursorY = window.innerHeight / 2;
    this.targetX = window.innerWidth / 2;
    this.targetY = window.innerHeight / 2;
    this.alpha = 0.55; // Snappy, low-latency smoothing filter
    this.isTracking = false;
    this.lastClickTime = 0;
    this.clickCooldownMs = 600;
    this.lastOsAction = '';
    this.listeners = new Set();
    this.backendUrl = 'http://127.0.0.1:8000';
    this.isBackendAvailable = false;

    this.lastBackendMoveTime = 0;

    this.checkBackend();
    setInterval(() => this.checkBackend(), 2500);
  }

  async checkBackend() {
    try {
      const res = await fetch(`${this.backendUrl}/api/status`, { method: 'GET', signal: AbortSignal.timeout(1200) });
      this.isBackendAvailable = res.ok;
    } catch (e) {
      this.isBackendAvailable = false;
    }
  }

  /**
   * Update cursor position from normalized index fingertip coordinates (0 to 1)
   */
  updateFromLandmark(landmark) {
    if (!landmark) return;
    this.isTracking = true;

    // Direct mapping to screen width/height with margin bounds
    // Note: Landmark X is mirrored for user perspective
    const margin = 0.08;
    const clampedX = Math.max(margin, Math.min(1.0 - margin, landmark.x));
    const clampedY = Math.max(margin, Math.min(1.0 - margin, landmark.y));

    const normX = (clampedX - margin) / (1.0 - 2 * margin);
    const normY = (clampedY - margin) / (1.0 - 2 * margin);

    // Screen coordinates (mirrored X for webcam user interaction)
    this.targetX = (1.0 - normX) * window.innerWidth;
    this.targetY = normY * window.innerHeight;

    // Apply Exponential Moving Average filter
    this.cursorX += (this.targetX - this.cursorX) * this.alpha;
    this.cursorY += (this.targetY - this.cursorY) * this.alpha;

    this.notify({ type: 'move', x: this.cursorX, y: this.cursorY });

    // Stream coordinates to Python backend to physically move the real Windows OS cursor!
    const now = performance.now();
    if (this.isBackendAvailable && now - this.lastBackendMoveTime > 20) {
      this.lastBackendMoveTime = now;
      const screenW = window.screen.width || 1920;
      const screenH = window.screen.height || 1080;
      const realScreenX = Math.max(0, Math.min(screenW - 1, Math.round((this.cursorX / window.innerWidth) * screenW)));
      const realScreenY = Math.max(0, Math.min(screenH - 1, Math.round((this.cursorY / window.innerHeight) * screenH)));

      this.sendToBackend('move', {
        x: realScreenX,
        y: realScreenY,
        norm_x: 1.0 - normX,
        norm_y: normY
      });
    }
  }

  /**
   * Left Click (Triggered by THUMB_UP)
   */
  leftClick() {
    const now = Date.now();
    if (now - this.lastClickTime < this.clickCooldownMs) return;
    this.lastClickTime = now;

    this.notify({ type: 'left_click', x: this.cursorX, y: this.cursorY });
    this.sendToBackend('click', { button: 'left' });
  }

  /**
   * Right Click (Triggered by Index + Thumb Pinch / OK_SIGN)
   */
  rightClick() {
    const now = Date.now();
    if (now - this.lastClickTime < this.clickCooldownMs) return;
    this.lastClickTime = now;

    this.notify({ type: 'right_click', x: this.cursorX, y: this.cursorY });
    this.sendToBackend('click', { button: 'right' });
  }

  /**
   * Show Desktop / Minimize All (Triggered by CLOSED_FIST)
   */
  showDesktop() {
    const now = Date.now();
    if (now - this.lastClickTime < this.clickCooldownMs) return;
    this.lastClickTime = now;
    this.lastOsAction = 'SHOW_DESKTOP';

    this.notify({ type: 'show_desktop' });
    this.sendToBackend('hotkey', { keys: ['win', 'd'] });
  }

  /**
   * Restore Active Window (Triggered by OPEN_PALM)
   */
  restoreWindow() {
    const now = Date.now();
    if (now - this.lastClickTime < this.clickCooldownMs) return;
    this.lastClickTime = now;
    this.lastOsAction = 'RESTORE_WINDOW';

    this.notify({ type: 'restore_window' });
    this.sendToBackend('hotkey', { keys: ['alt', 'tab'] });
  }

  async sendToBackend(action, payload) {
    if (!this.isBackendAvailable) return;
    try {
      await fetch(`${this.backendUrl}/api/control/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {}
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(data) {
    this.listeners.forEach((fn) => fn(data));
  }
}

export const cursorController = new CursorControllerService();
