/**
 * AirOS "Teach AirOS" Custom Gesture Training Studio
 * Manages sample recording, AI model training, accuracy display, and action mapping.
 */

class TrainingStudio {
  constructor() {
    this.gestureNameInput = document.getElementById('trainGestureName');
    this.recordBtn = document.getElementById('btnStartRecord');
    this.trainModelBtn = document.getElementById('btnTrainModel');
    this.progressContainer = document.getElementById('trainProgressContainer');
    this.progressBar = document.getElementById('trainProgressBar');
    this.progressCount = document.getElementById('trainProgressCount');
    this.datasetList = document.getElementById('trainDatasetList');
    this.accuracyBadge = document.getElementById('modelAccuracyBadge');

    this.isRecording = false;
    this.bindEvents();
    this.fetchDatasetSummary();
  }

  bindEvents() {
    if (this.recordBtn) {
      this.recordBtn.addEventListener('click', () => this.toggleRecording());
    }

    if (this.trainModelBtn) {
      this.trainModelBtn.addEventListener('click', () => this.triggerTraining());
    }
  }

  async fetchDatasetSummary() {
    try {
      const resp = await fetch('/api/training/dataset');
      const data = await resp.json();
      this.renderDatasetList(data.classes || {});

      if (data.is_trained && this.accuracyBadge) {
        this.accuracyBadge.textContent = `Model Accuracy: ${data.model_accuracy}% (${data.total_classes} Gestures)`;
        this.accuracyBadge.style.display = 'inline-block';
      }
    } catch (e) {
      console.error('Failed to fetch dataset summary:', e);
    }
  }

  renderDatasetList(classes) {
    if (!this.datasetList) return;
    this.datasetList.innerHTML = '';

    const keys = Object.keys(classes);
    if (keys.length === 0) {
      this.datasetList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:12px;">No custom gestures recorded yet.</div>';
      return;
    }

    keys.forEach((name) => {
      const count = classes[name];
      const div = document.createElement('div');
      div.className = 'event-item';
      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="event-gesture">${name}</span>
          <span style="color:var(--text-muted);font-size:11px;">(${count} samples)</span>
        </div>
        <button class="btn" style="padding:2px 8px;font-size:11px;color:var(--accent-rose);" onclick="window.airOSApp.trainingStudio.deleteGesture('${name}')">Delete</button>
      `;
      this.datasetList.appendChild(div);
    });
  }

  async toggleRecording() {
    const name = this.gestureNameInput.value.trim().toUpperCase();
    if (!name) {
      window.airOSApp.showToast('Please enter a gesture name (e.g. MAGIC, PEACE)', 'warning');
      return;
    }

    if (!this.isRecording) {
      // Start recording
      try {
        const resp = await fetch('/api/training/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gesture_name: name, samples: 15 })
        });
        const data = await resp.json();
        if (data.success) {
          this.isRecording = true;
          this.recordBtn.textContent = 'Cancel Recording';
          this.recordBtn.classList.add('btn-demo');
          this.progressContainer.style.display = 'block';
          this.progressBar.style.width = '0%';
          this.progressCount.textContent = '0 / 15';
          window.airOSApp.showToast(`Hold gesture "${name}" in front of camera...`, 'info');
        }
      } catch (e) {
        console.error('Error starting recording:', e);
      }
    } else {
      // Cancel recording
      try {
        await fetch('/api/training/cancel', { method: 'POST' });
        this.resetRecordingUI();
      } catch (e) {
        console.error('Error cancelling recording:', e);
      }
    }
  }

  updateProgress(trainingData) {
    if (!trainingData || !this.isRecording) return;

    const count = trainingData.count;
    const target = trainingData.target;
    const progress = trainingData.progress;

    this.progressBar.style.width = `${progress}%`;
    this.progressCount.textContent = `${count} / ${target}`;

    if (trainingData.done) {
      this.isRecording = false;
      this.recordBtn.textContent = 'Record Samples';
      this.recordBtn.classList.remove('btn-demo');
      this.gestureNameInput.value = '';
      window.airOSApp.showToast(`Successfully recorded ${target} samples!`, 'success');
      this.fetchDatasetSummary();
    }
  }

  resetRecordingUI() {
    this.isRecording = false;
    this.recordBtn.textContent = 'Record Samples';
    this.recordBtn.classList.remove('btn-demo');
    this.progressContainer.style.display = 'none';
  }

  async deleteGesture(name) {
    try {
      await fetch(`/api/training/gesture/${encodeURIComponent(name)}`, { method: 'DELETE' });
      this.fetchDatasetSummary();
      window.airOSApp.showToast(`Deleted gesture dataset for "${name}"`, 'info');
    } catch (e) {
      console.error('Error deleting gesture:', e);
    }
  }

  async triggerTraining() {
    this.trainModelBtn.disabled = true;
    this.trainModelBtn.textContent = 'Training AI Classifier...';

    try {
      const resp = await fetch('/api/training/train', { method: 'POST' });
      const data = await resp.json();

      if (data.success) {
        window.airOSApp.showToast(`AI Model Trained! Accuracy: ${data.accuracy}%`, 'success');
        if (window.airOSApp && window.airOSApp.playChirp) {
          window.airOSApp.playChirp(880, 0.25);
        }
        this.fetchDatasetSummary();
      } else {
        window.airOSApp.showToast(data.error || 'Training failed', 'error');
      }
    } catch (e) {
      console.error('Training error:', e);
      window.airOSApp.showToast('Failed to train AI model', 'error');
    } finally {
      this.trainModelBtn.disabled = false;
      this.trainModelBtn.textContent = 'Train AI Model';
    }
  }
}
