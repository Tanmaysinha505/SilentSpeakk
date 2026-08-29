/**
 * AirOS Hackathon Demo Tour Guide
 * 7-step guided interactive walkthrough designed for presentations and judging demos.
 */

class DemoTour {
  constructor() {
    this.overlay = document.getElementById('demoTourOverlay');
    this.stepList = document.getElementById('demoStepList');
    this.demoCurrentTitle = document.getElementById('demoCurrentTitle');
    this.demoCurrentDesc = document.getElementById('demoCurrentDesc');
    this.btnNextDemo = document.getElementById('btnDemoNext');
    this.btnCloseDemo = document.getElementById('btnDemoClose');

    this.steps = [
      {
        id: 'step_cursor',
        title: '1. Air Mouse Movement',
        desc: 'Point your index finger toward the camera and move your hand around to glide the cursor.',
        targetGesture: 'INDEX_POINT',
        mode: 'CURSOR'
      },
      {
        id: 'step_click',
        title: '2. Pinch to Click',
        desc: 'Bring your thumb and index finger together to trigger a precise left click.',
        targetGesture: 'PINCH',
        mode: 'CURSOR'
      },
      {
        id: 'step_swipe',
        title: '3. Swipe to Switch Tabs',
        desc: 'Perform a swift horizontal swipe right or left to switch browser tabs.',
        targetGesture: 'SWIPE_RIGHT',
        mode: 'BROWSER'
      },
      {
        id: 'step_volume',
        title: '4. Rotate Hand for Volume',
        desc: 'Switch to Media Mode and rotate your hand clockwise to adjust master audio volume.',
        targetGesture: 'ROTATE_CLOCKWISE',
        mode: 'MEDIA'
      },
      {
        id: 'step_presentation',
        title: '5. Virtual Laser Pointer',
        desc: 'In Presentation Mode, point your index finger to cast a virtual laser dot on screen.',
        targetGesture: 'INDEX_POINT',
        mode: 'PRESENTATION'
      },
      {
        id: 'step_custom',
        title: '6. Custom Shortcut Gesture',
        desc: 'Make the Rock-On or Peace sign to instantly launch apps or capture a screenshot.',
        targetGesture: 'ROCK_ON',
        mode: 'CUSTOM'
      },
      {
        id: 'step_teach',
        title: '7. Teach AirOS a New Gesture',
        desc: 'Record a personalized hand gesture in real-time and train the AI model on device.',
        targetGesture: 'RECORD_FINISH',
        mode: 'TRAINING'
      }
    ];

    this.currentStepIdx = 0;
    this.isActive = false;

    this.bindEvents();
  }

  bindEvents() {
    const startBtn = document.getElementById('btnStartDemoTour');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.start());
    }

    if (this.btnCloseDemo) {
      this.btnCloseDemo.addEventListener('click', () => this.stop());
    }

    if (this.btnNextDemo) {
      this.btnNextDemo.addEventListener('click', () => this.nextStep());
    }
  }

  start() {
    this.isActive = true;
    this.currentStepIdx = 0;
    this.overlay.classList.add('active');
    this.renderTour();
  }

  stop() {
    this.isActive = false;
    this.overlay.classList.remove('active');
  }

  renderTour() {
    if (this.currentStepIdx >= this.steps.length) {
      this.finishTour();
      return;
    }

    const step = this.steps[this.currentStepIdx];
    this.demoCurrentTitle.textContent = step.title;
    this.demoCurrentDesc.textContent = step.desc;

    // Switch mode automatically to match step
    if (window.airOSApp) {
      window.airOSApp.setMode(step.mode);
    }

    // Render list items
    this.stepList.innerHTML = '';
    this.steps.forEach((s, idx) => {
      const div = document.createElement('div');
      div.className = `demo-step-item ${idx === this.currentStepIdx ? 'active' : ''} ${idx < this.currentStepIdx ? 'completed' : ''}`;
      div.innerHTML = `
        <div class="demo-step-icon">${idx < this.currentStepIdx ? '✓' : (idx === this.currentStepIdx ? '▶' : '○')}</div>
        <div>${s.title}</div>
      `;
      this.stepList.appendChild(div);
    });
  }

  onGestureDetected(gestureName) {
    if (!this.isActive) return;
    const step = this.steps[this.currentStepIdx];

    if (step.targetGesture === gestureName || (step.targetGesture === 'SWIPE_RIGHT' && gestureName.startsWith('SWIPE'))) {
      // Step matched! Advance with celebration
      this.triggerStepSuccess();
    }
  }

  triggerStepSuccess() {
    if (window.airOSApp && window.airOSApp.playChirp) {
      window.airOSApp.playChirp(920, 0.18);
    }
    window.airOSApp.showToast(`Great! ${this.steps[this.currentStepIdx].title} Verified!`, 'success');
    this.currentStepIdx++;
    setTimeout(() => this.renderTour(), 600);
  }

  nextStep() {
    this.currentStepIdx++;
    this.renderTour();
  }

  finishTour() {
    this.demoCurrentTitle.textContent = '🎉 AirOS Demo Showcase Complete!';
    this.demoCurrentDesc.textContent = 'You have verified all touchless computer interaction capabilities.';
    this.stepList.innerHTML = '<div style="color:var(--accent-emerald);font-weight:700;text-align:center;padding:12px;">All 7 gestures verified successfully!</div>';
    this.btnNextDemo.textContent = 'Done';
    this.btnNextDemo.onclick = () => this.stop();
  }
}
