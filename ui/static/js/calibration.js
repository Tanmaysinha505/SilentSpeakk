/**
 * AirOS Active Region Calibration Wizard
 * Guides the user through calibrating their 4-corner active hand movement bounding area.
 */

class CalibrationWizard {
  constructor(visualizerRef) {
    this.visualizer = visualizerRef;
    this.modal = document.getElementById('calibrationModal');
    this.stepLabel = document.getElementById('calibStepLabel');
    this.targetIndicator = document.getElementById('calibTarget');
    this.canvasWrapper = document.getElementById('calibCanvasWrapper');

    this.steps = [
      { name: 'TOP-LEFT', pos: { top: '15%', left: '15%' } },
      { name: 'TOP-RIGHT', pos: { top: '15%', right: '15%', left: 'auto' } },
      { name: 'BOTTOM-RIGHT', pos: { bottom: '15%', top: 'auto', right: '15%', left: 'auto' } },
      { name: 'BOTTOM-LEFT', pos: { bottom: '15%', top: 'auto', left: '15%' } }
    ];

    this.currentStep = 0;
    this.points = [];
    this.latestHandPos = null;
    this.isCalibrating = false;

    this.bindEvents();
  }

  bindEvents() {
    const startBtn = document.getElementById('btnStartCalib');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.open());
    }

    const captureBtn = document.getElementById('btnCalibCapture');
    if (captureBtn) {
      captureBtn.addEventListener('click', () => this.captureCurrentPoint());
    }

    const closeBtn = document.getElementById('closeCalibModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Keyboard shortcut (Space) to capture corner
    window.addEventListener('keydown', (e) => {
      if (this.isCalibrating && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        this.captureCurrentPoint();
      }
    });
  }

  updateHandPosition(normX, normY) {
    this.latestHandPos = [normX, normY];
  }

  open() {
    this.currentStep = 0;
    this.points = [];
    this.isCalibrating = true;
    this.modal.classList.add('active');
    this.renderStep();
  }

  close() {
    this.isCalibrating = false;
    this.modal.classList.remove('active');
  }

  renderStep() {
    if (this.currentStep >= this.steps.length) {
      this.finishCalibration();
      return;
    }

    const stepInfo = this.steps[this.currentStep];
    this.stepLabel.textContent = `Step ${this.currentStep + 1}/4: Move hand to ${stepInfo.name} corner and press Capture`;

    // Position target indicator in modal
    Object.assign(this.targetIndicator.style, {
      top: stepInfo.pos.top || 'auto',
      bottom: stepInfo.pos.bottom || 'auto',
      left: stepInfo.pos.left || 'auto',
      right: stepInfo.pos.right || 'auto'
    });
  }

  captureCurrentPoint() {
    let pt = this.latestHandPos ? [...this.latestHandPos] : null;

    // Fallback default coordinates if no hand in frame
    if (!pt) {
      const defaults = [[0.15, 0.15], [0.85, 0.15], [0.85, 0.85], [0.15, 0.85]];
      pt = defaults[this.currentStep];
    }

    this.points.push(pt);
    this.currentStep++;

    // Audio chirp feedback
    if (window.airOSApp && window.airOSApp.playChirp) {
      window.airOSApp.playChirp(600 + this.currentStep * 150, 0.12);
    }

    this.renderStep();
  }

  async finishCalibration() {
    this.stepLabel.textContent = 'Calibration complete! Applying active boundary...';

    const payload = {
      top_left: this.points[0],
      top_right: this.points[1],
      bottom_right: this.points[2],
      bottom_left: this.points[3]
    };

    try {
      const resp = await fetch('/api/calibration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.success) {
        // Update visualizer active box
        const x1 = Math.min(payload.top_left[0], payload.bottom_left[0]);
        const x2 = Math.max(payload.top_right[0], payload.bottom_right[0]);
        const y1 = Math.min(payload.top_left[1], payload.top_right[1]);
        const y2 = Math.max(payload.bottom_left[1], payload.bottom_right[1]);
        this.visualizer.setActiveRegion(x1, y1, x2, y2);

        setTimeout(() => {
          this.close();
          if (window.airOSApp) {
            window.airOSApp.showToast('Active cursor area successfully calibrated!', 'success');
          }
        }, 800);
      }
    } catch (e) {
      console.error('Calibration error:', e);
      this.close();
    }
  }
}
