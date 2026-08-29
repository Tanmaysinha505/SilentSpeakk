/**
 * AirOS Main Application Controller
 * Handles WebSocket telemetry stream, HUD updates, mode switching,
 * event log rendering, Web Audio synthesis, and settings synchronization.
 */

class AirOSApp {
  constructor() {
    this.ws = null;
    this.wsUrl = `ws://${window.location.host}/ws/telemetry`;
    this.reconnectTimer = null;

    // Canvas visualizer
    const canvas = document.getElementById('visionCanvas');
    this.visualizer = new VisionVisualizer(canvas);

    // Audio synthesizer for feedback
    this.audioCtx = null;
    this.audioFeedbackEnabled = true;

    // State
    this.currentMode = 'CURSOR';
    this.isCameraConnected = false;

    // Submodules
    this.calibrationWizard = new CalibrationWizard(this.visualizer);
    this.trainingStudio = new TrainingStudio();
    this.demoTour = new DemoTour();

    this.initDOM();
    this.initWebSocket();
    this.bindEvents();
    this.fetchConfig();
    this.fetchCameras();
  }

  initDOM() {
    this.hudGesture = document.getElementById('hudGesture');
    this.hudAction = document.getElementById('hudAction');
    this.hudConfidence = document.getElementById('hudConfidence');
    this.hudConfidenceBar = document.getElementById('hudConfidenceBar');
    this.hudMode = document.getElementById('hudMode');
    this.hudFps = document.getElementById('hudFps');
    this.cameraStatusDot = document.getElementById('cameraStatusDot');
    this.cameraStatusText = document.getElementById('cameraStatusText');
    this.eventList = document.getElementById('eventList');
    this.cameraFeed = document.getElementById('cameraFeed');
    this.toastContainer = document.getElementById('toastContainer');
  }

  initWebSocket() {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log('AirOS WebSocket connected.');
      if (this.reconnectTimer) {
        clearInterval(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'telemetry') {
          this.handleTelemetry(data);
        }
      } catch (e) {
        console.error('Error parsing telemetry message:', e);
      }
    };

    this.ws.onclose = () => {
      console.warn('WebSocket disconnected. Retrying in 2s...');
      if (!this.reconnectTimer) {
        this.reconnectTimer = setInterval(() => this.initWebSocket(), 2000);
      }
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }

  handleTelemetry(data) {
    // 1. Update Camera & FPS status
    this.isCameraConnected = data.camera_connected;
    if (data.camera_connected) {
      this.cameraStatusDot.className = 'status-dot';
      this.cameraStatusText.textContent = `${data.fps} FPS`;
      this.hudFps.textContent = `${data.fps} FPS`;
    } else {
      this.cameraStatusDot.className = 'status-dot offline';
      this.cameraStatusText.textContent = 'Disconnected';
      this.hudFps.textContent = '0 FPS';
    }

    // 3. Render Canvas Skeleton & Landmarks
    if (data.hands && data.hands.length > 0) {
      const primaryHand = data.hands[0];
      if (primaryHand.landmarks && primaryHand.landmarks.length > 8) {
        // Feed hand coordinates to calibration wizard if active
        this.calibrationWizard.updateHandPosition(primaryHand.landmarks[8].x, primaryHand.landmarks[8].y);
      }
    }
    this.visualizer.render(data);

    // 4. Update HUD
    const gestureName = data.gesture || 'NONE';
    const actionName = data.action || 'IDLE';
    const confidence = data.confidence || 0;

    this.hudGesture.textContent = gestureName.replace(/_/g, ' ');
    this.hudAction.textContent = actionName;
    this.hudConfidence.textContent = `${confidence}%`;
    this.hudConfidenceBar.style.width = `${confidence}%`;
    this.hudMode.textContent = data.mode || this.currentMode;

    // 5. Check Demo Mode tour progression
    if (this.demoTour && this.demoTour.isActive && gestureName !== 'NONE') {
      this.demoTour.onGestureDetected(gestureName);
    }

    // 6. Update Training Studio live progress
    if (data.training) {
      this.trainingStudio.updateProgress(data.training);
    }

    // 7. Update Event History if new action occurred
    if (actionName !== 'IDLE' && !actionName.startsWith('Move Cursor')) {
      this.addEventLog(gestureName, actionName, confidence);
    }
  }

  addEventLog(gesture, action, confidence) {
    if (!this.eventList) return;

    const timeStr = new Date().toTimeString().split(' ')[0];
    const item = document.createElement('div');
    item.className = 'event-item';
    item.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="event-time">${timeStr}</span>
        <span class="event-gesture">${gesture}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="event-action">${action}</span>
        <span style="color:var(--accent-purple);font-size:11px;font-weight:700;">${confidence}%</span>
      </div>
    `;

    this.eventList.prepend(item);
    // Keep max 25 items in DOM
    if (this.eventList.children.length > 25) {
      this.eventList.removeChild(this.eventList.lastChild);
    }
  }

  bindEvents() {
    // Mode Switcher Cards
    document.querySelectorAll('.mode-card').forEach((card) => {
      card.addEventListener('click', () => {
        const mode = card.getAttribute('data-mode');
        this.setMode(mode);
      });
    });

    // Clear History Button
    const clearHistoryBtn = document.getElementById('btnClearHistory');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', async () => {
        if (this.eventList) this.eventList.innerHTML = '';
        await fetch('/api/history/clear', { method: 'POST' });
        this.showToast('Event history cleared', 'info');
      });
    }

    // Settings Modal Open/Close
    const settingsBtn = document.getElementById('btnOpenSettings');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettingsModal');

    if (settingsBtn && settingsModal) {
      settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
    }
    if (closeSettings && settingsModal) {
      closeSettings.addEventListener('click', () => settingsModal.classList.remove('active'));
    }

    // Settings Sliders & Form Bindings
    this.bindSettingsForm();

    // Toggle Camera Video Feed button
    const toggleCameraBtn = document.getElementById('btnToggleCamera');
    if (toggleCameraBtn) {
      toggleCameraBtn.addEventListener('click', () => {
        this.visualizer.showCameraFeed = !this.visualizer.showCameraFeed;
        toggleCameraBtn.textContent = this.visualizer.showCameraFeed ? 'Hide Video' : 'Show Video';
      });
    }

    // Toggle Landmarks button
    const toggleLandmarksBtn = document.getElementById('btnToggleLandmarks');
    if (toggleLandmarksBtn) {
      toggleLandmarksBtn.addEventListener('click', () => {
        this.visualizer.showLandmarks = !this.visualizer.showLandmarks;
        toggleLandmarksBtn.textContent = this.visualizer.showLandmarks ? 'Hide Landmarks' : 'Show Landmarks';
      });
    }
  }

  bindSettingsForm() {
    const smoothingSlider = document.getElementById('settingSmoothing');
    const smoothingVal = document.getElementById('valSmoothing');
    if (smoothingSlider && smoothingVal) {
      smoothingSlider.addEventListener('input', (e) => {
        smoothingVal.textContent = e.target.value;
        this.updateConfigSection('mouse', { smoothing_factor: parseFloat(e.target.value) });
      });
    }

    const sensSlider = document.getElementById('settingSensitivity');
    const sensVal = document.getElementById('valSensitivity');
    if (sensSlider && sensVal) {
      sensSlider.addEventListener('input', (e) => {
        sensVal.textContent = e.target.value;
        this.updateConfigSection('mouse', {
          sensitivity_x: parseFloat(e.target.value),
          sensitivity_y: parseFloat(e.target.value)
        });
      });
    }

    const confSlider = document.getElementById('settingConfidence');
    const confVal = document.getElementById('valConfidence');
    if (confSlider && confVal) {
      confSlider.addEventListener('input', (e) => {
        confVal.textContent = `${Math.round(parseFloat(e.target.value) * 100)}%`;
        this.updateConfigSection('recognition', { confidence_threshold: parseFloat(e.target.value) });
      });
    }

    // High Contrast Theme Toggle
    const contrastToggle = document.getElementById('toggleContrast');
    if (contrastToggle) {
      contrastToggle.addEventListener('change', (e) => {
        document.body.classList.toggle('high-contrast', e.target.checked);
      });
    }

    // Camera Selector
    const camSelect = document.getElementById('cameraSelect');
    if (camSelect) {
      camSelect.addEventListener('change', async (e) => {
        const idx = parseInt(e.target.value, 10);
        await fetch('/api/camera/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index: idx })
        });
        this.showToast(`Switched camera to device ${idx}`, 'info');
      });
    }
  }

  async setMode(mode) {
    this.currentMode = mode.toUpperCase();

    // Update active UI card
    document.querySelectorAll('.mode-card').forEach((card) => {
      if (card.getAttribute('data-mode') === this.currentMode) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    try {
      await fetch('/api/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: this.currentMode })
      });
      this.showToast(`Active mode: ${this.currentMode}`, 'info');
    } catch (e) {
      console.error('Failed to set mode:', e);
    }
  }

  async fetchConfig() {
    try {
      const resp = await fetch('/api/config');
      const cfg = await resp.json();

      if (cfg.mouse) {
        const smoothSlider = document.getElementById('settingSmoothing');
        const smoothVal = document.getElementById('valSmoothing');
        if (smoothSlider) smoothSlider.value = cfg.mouse.smoothing_factor || 0.65;
        if (smoothVal) smoothVal.textContent = cfg.mouse.smoothing_factor || 0.65;

        const sensSlider = document.getElementById('settingSensitivity');
        const sensVal = document.getElementById('valSensitivity');
        if (sensSlider) sensSlider.value = cfg.mouse.sensitivity_x || 1.4;
        if (sensVal) sensVal.textContent = cfg.mouse.sensitivity_x || 1.4;
      }

      if (cfg.calibration && cfg.calibration.calibrated) {
        const tl = cfg.calibration.top_left;
        const br = cfg.calibration.bottom_right;
        this.visualizer.setActiveRegion(tl[0], tl[1], br[0], br[1]);
      }
    } catch (e) {
      console.error('Failed to fetch config:', e);
    }
  }

  async fetchCameras() {
    try {
      const resp = await fetch('/api/cameras');
      const data = await resp.json();
      const select = document.getElementById('cameraSelect');
      if (select && data.cameras) {
        select.innerHTML = '';
        data.cameras.forEach((cam) => {
          const opt = document.createElement('option');
          opt.value = cam.index;
          opt.textContent = cam.name;
          if (cam.index === data.current_index) opt.selected = true;
          select.appendChild(opt);
        });
      }
    } catch (e) {
      console.error('Failed to list cameras:', e);
    }
  }

  async updateConfigSection(section, values) {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, values })
      });
    } catch (e) {
      console.error('Config update error:', e);
    }
  }

  playChirp(freq = 600, duration = 0.15) {
    if (!this.audioFeedbackEnabled) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.audioCtx.currentTime + duration);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // AudioContext might require user gesture
    }
  }

  showToast(message, type = 'info') {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'glass-panel';
    toast.style.cssText = `
      padding: 10px 16px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px;
      margin-bottom: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      border-left: 4px solid ${type === 'success' ? 'var(--accent-emerald)' : type === 'warning' ? 'var(--accent-amber)' : 'var(--accent-cyan)'};
      animation: slide-in 0.2s ease;
    `;
    toast.textContent = message;

    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.airOSApp = new AirOSApp();
});
