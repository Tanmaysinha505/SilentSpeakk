/**
 * Web Audio API Synthesizer for futuristic tactile audio cues.
 * Provides accessible acoustic feedback for room events without external mp3 files.
 */
class AudioFeedbackService {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playTone(frequency, type = 'sine', duration = 0.15, gainVal = 0.08) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  }

  playLightOn() {
    // Sci-fi high melodic chime (light turned on)
    this.playTone(587.33, 'sine', 0.12, 0.08); // D5
    setTimeout(() => this.playTone(880.00, 'triangle', 0.2, 0.09), 60); // A5
  }

  playLightOff() {
    // Soft descending tone (light turned off)
    this.playTone(659.25, 'sine', 0.1, 0.06); // E5
    setTimeout(() => this.playTone(440.00, 'sine', 0.18, 0.05), 60); // A4
  }

  playFanOn() {
    // Mechanical ascending whoosh
    this.playTone(329.63, 'sawtooth', 0.15, 0.04);
    setTimeout(() => this.playTone(493.88, 'triangle', 0.25, 0.05), 80);
  }

  playFanOff() {
    // Gentle decelerating chime
    this.playTone(440.00, 'triangle', 0.12, 0.04);
    setTimeout(() => this.playTone(261.63, 'sine', 0.25, 0.04), 80);
  }

  playDoorOpen() {
    // Futuristic hydraulic unlatch
    this.playTone(523.25, 'triangle', 0.1, 0.07);
    setTimeout(() => this.playTone(698.46, 'sine', 0.2, 0.08), 70);
  }

  playDoorClose() {
    // Solid latch thud + tone
    this.playTone(493.88, 'triangle', 0.08, 0.06);
    setTimeout(() => this.playTone(349.23, 'sine', 0.18, 0.07), 60);
  }

  playTvToggle() {
    // Electric pulse
    this.playTone(784.00, 'square', 0.08, 0.03);
    setTimeout(() => this.playTone(1046.50, 'sine', 0.15, 0.06), 60);
  }

  playSuccess() {
    this.playTone(523.25, 'sine', 0.1, 0.06);
    setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.06), 80);
    setTimeout(() => this.playTone(783.99, 'sine', 0.2, 0.07), 160);
  }

  playWarning() {
    this.playTone(220.00, 'sawtooth', 0.15, 0.08);
    setTimeout(() => this.playTone(207.65, 'sawtooth', 0.2, 0.08), 120);
  }
}

export const audioFeedback = new AudioFeedbackService();
