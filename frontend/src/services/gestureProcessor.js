import { useAgent44Store } from '../store/useAgent44Store';
import { agenticSynthesizer } from './agenticSynthesizer';
import { cursorController } from './cursorController';

/**
 * GestureProcessor
 * Temporal smoothing, multi-frame majority voting, hysteresis, and debounce state machine
 * for rock-solid flicker-free gesture recognition.
 */
class GestureProcessor {
  constructor() {
    // Sliding FIFO queue of recent raw predictions (15 frames)
    this.bufferSize = 15;
    this.frameBuffer = []; // [{ gesture: 'OPEN_PALM', confidence: 92, timestamp: 12345 }]

    // State machine: 'SEARCHING' | 'STABILIZING' | 'CONFIRMED'
    this.status = 'SEARCHING';
    this.currentCandidate = 'NONE';
    this.confirmedGesture = 'NONE';
    this.lastConfirmedTime = 0;
    this.lastDispatchedAction = null;
    this.lastActionTime = 0;

    // Thresholds
    this.minConfidenceThreshold = 68.0; // Filter low confidence noise
    this.majorityThreshold = 0.65; // At least 65% of frames in buffer must agree
    this.stabilizationTimeMs = 250; // Candidate must persist for at least 250ms
    this.actionCooldownMs = 1200; // Debounce cooldown before same action can re-fire
    this.handDropGracePeriodMs = 550; // Retain confirmed gesture if hand briefly drops

    this.lastHandSeenTime = 0;
    this.candidateFirstSeenTime = 0;
  }

  /**
   * Main ingest frame method called on every computer vision frame
   * @param {string} rawGesture - name of gesture or 'NONE'
   * @param {number} confidence - 0 to 100
   * @param {Array} landmarks - 21 3D hand landmarks
   * @param {number} fps - current FPS
   */
  processFrame(rawGesture, confidence = 0, landmarks = [], fps = 30) {
    const now = Date.now();
    const hasHand = rawGesture !== 'NONE' && rawGesture !== '' && landmarks && landmarks.length >= 21;

    if (hasHand) {
      this.lastHandSeenTime = now;
    }

    // 1. Confidence threshold gating
    const validDetection = hasHand && confidence >= this.minConfidenceThreshold;
    const effectiveGesture = validDetection ? rawGesture.toUpperCase().replace(/\s+/g, '_') : 'NONE';

    // 2. Sliding window FIFO
    this.frameBuffer.push({
      gesture: effectiveGesture,
      confidence: validDetection ? confidence : 0,
      timestamp: now
    });
    if (this.frameBuffer.length > this.bufferSize) {
      this.frameBuffer.shift();
    }

    // 3. Majority Voting across buffer
    const counts = {};
    let totalValidConf = 0;
    let validCount = 0;

    for (const frame of this.frameBuffer) {
      if (frame.gesture !== 'NONE') {
        counts[frame.gesture] = (counts[frame.gesture] || 0) + 1;
        totalValidConf += frame.confidence;
        validCount++;
      }
    }

    let dominantGesture = 'NONE';
    let maxCount = 0;
    for (const [gest, cnt] of Object.entries(counts)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        dominantGesture = gest;
      }
    }

    const majorityRatio = maxCount / this.bufferSize;
    const isDominant = majorityRatio >= this.majorityThreshold && dominantGesture !== 'NONE';
    const smoothedConfidence = validCount > 0 ? totalValidConf / validCount : 0;

    // 4. State Machine & Transition Hysteresis
    if (isDominant) {
      if (this.currentCandidate !== dominantGesture) {
        // New candidate emerged -> start stabilizing
        this.currentCandidate = dominantGesture;
        this.candidateFirstSeenTime = now;
        this.status = 'STABILIZING';
      } else {
        // Same candidate persisting -> check if stabilized long enough
        if (this.status === 'STABILIZING') {
          if (now - this.candidateFirstSeenTime >= this.stabilizationTimeMs) {
            this.status = 'CONFIRMED';
            this.confirmedGesture = dominantGesture;
            this.lastConfirmedTime = now;

            // Trigger action on confirmation transition
            this.dispatchActionForCurrentMode(dominantGesture, Math.round(smoothedConfidence));
          }
        }
      }
    } else {
      // Not dominant: check hand loss grace period
      if (now - this.lastHandSeenTime > this.handDropGracePeriodMs) {
        this.status = 'SEARCHING';
        this.currentCandidate = 'NONE';
        this.confirmedGesture = 'NONE';
      } else {
        // Within grace period: retain previous state briefly to prevent UI flicker
      }
    }

    // 5. Publish to reactive store
    const store = useAgent44Store.getState();
    const activeMode = store.activeMode;
    const intentData = this.resolveIntent(
      this.status === 'CONFIRMED' ? this.confirmedGesture : this.currentCandidate,
      activeMode
    );

    store.updateTracking({
      rawGesture,
      confirmedGesture: this.confirmedGesture,
      status: this.status,
      confidence: Math.round(smoothedConfidence),
      intent: intentData.intent,
      target: intentData.target,
      handDetected: hasHand,
      fps: Math.round(fps),
      landmarks
    });
  }

  /**
   * Resolves mode-dependent intent text
   */
  resolveIntent(gesture, mode) {
    if (!gesture || gesture === 'NONE') {
      return { intent: 'Searching for hand...', target: '' };
    }

    switch (mode) {
      case 'ROOM_CONTROL':
        if (gesture === 'OPEN_PALM') return { intent: 'LIGHT_ON (Ceiling Light)', target: 'Ceiling Light' };
        if (gesture === 'CLOSED_FIST' || gesture === 'FIST') return { intent: 'LIGHT_OFF (Ceiling Light)', target: 'Ceiling Light' };
        if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') return { intent: 'FAN_ON (Ceiling Fan)', target: 'Ceiling Fan' };
        if (gesture === 'POINT_DOWN') return { intent: 'FAN_OFF (Ceiling Fan)', target: 'Ceiling Fan' };
        if (gesture === 'THUMB_UP' || gesture === 'THUMBS_UP') return { intent: 'DOOR_OPEN (Smart Door)', target: 'Smart Door' };
        if (gesture === 'THUMB_DOWN' || gesture === 'THUMBS_DOWN') return { intent: 'DOOR_CLOSE (Smart Door)', target: 'Smart Door' };
        if (gesture === 'VICTORY') return { intent: 'TV_TOGGLE (OLED TV)', target: 'Smart OLED TV' };
        if (gesture === 'ROCK_ON') return { intent: 'PARTY_MODE (Smart Room)', target: 'Smart Room' };
        break;

      case 'LIBRARY':
        if (gesture === 'OPEN_PALM') return { intent: 'Please be quiet (Shh)', target: 'Study Desk' };
        if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') return { intent: 'Need book assistance', target: 'Librarian Desk' };
        if (gesture === 'THUMB_UP' || gesture === 'THUMBS_UP') return { intent: 'Thank you!', target: 'Study Desk' };
        if (gesture === 'CLOSED_FIST' || gesture === 'FIST') return { intent: 'Leaving study desk', target: 'Station' };
        break;

      case 'HOSPITAL':
        if (gesture === 'POINT_CHEST') return { intent: 'Patient pointing to chest area (Cardiac / Thorax)', target: 'Patient Anatomy' };
        if (gesture === 'POINT_HEAD') return { intent: 'Patient pointing to head / migraine', target: 'Patient Anatomy' };
        if (gesture === 'OPEN_PALM') return { intent: 'Request: Drinking water', target: 'Patient Bed' };
        if (gesture === 'CLOSED_FIST' || gesture === 'FIST') return { intent: 'ALERT: Pain assistance needed', target: 'Nurse Station' };
        if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') return { intent: 'Call nurse to room', target: 'Nurse Call' };
        if (gesture === 'ROCK_ON') return { intent: 'EMERGENCY: Code Blue Alarm', target: 'ER Station' };
        break;

      case 'COMMUNICATION':
        if (gesture === 'POINT_CHEST') return { intent: '"Me / Myself / Here"', target: 'TTS Voice' };
        if (gesture === 'OPEN_PALM') return { intent: '"Hello / Greetings"', target: 'TTS Voice' };
        if (gesture === 'THUMB_UP' || gesture === 'THUMBS_UP') return { intent: '"Yes, I agree"', target: 'TTS Voice' };
        if (gesture === 'THUMB_DOWN' || gesture === 'THUMBS_DOWN') return { intent: '"No, I disagree"', target: 'TTS Voice' };
        if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') return { intent: '"I need this"', target: 'TTS Voice' };
        if (gesture === 'OK_SIGN') return { intent: '"Understood / OK"', target: 'TTS Voice' };
        break;

      case 'SPACE':
        if (gesture === 'THUMB_UP' || gesture === 'THUMBS_UP') return { intent: 'EVA Oxygen & Suit: NOMINAL', target: 'Mission Control' };
        if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') return { intent: 'Fire RCS Thruster (Burst)', target: 'Propulsion' };
        if (gesture === 'CLOSED_FIST' || gesture === 'FIST') return { intent: 'Hold Station / Tether Lock', target: 'Astronaut' };
        if (gesture === 'OPEN_PALM') return { intent: 'Airlock Sealed & Pressurized', target: 'Hab Module' };
        if (gesture === 'WAVE') return { intent: 'Radio Comms Ping', target: 'Telemetry' };
        break;

      case 'DESKTOP':
        if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') return { intent: 'Moving mouse cursor', target: 'Cursor' };
        if (gesture === 'THUMB_UP' || gesture === 'THUMBS_UP') return { intent: 'Left Click (Select)', target: 'Left Button' };
        if (gesture === 'OK_SIGN') return { intent: 'Right Click (Context Menu)', target: 'Right Button' };
        if (gesture === 'CLOSED_FIST' || gesture === 'FIST') return { intent: 'Show Desktop (Win + D / Minimize All)', target: 'Windows OS' };
        if (gesture === 'OPEN_PALM') return { intent: 'Restore Window (Alt + Tab)', target: 'Windows OS' };
        break;

      case 'CLASSROOM':
        if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') return { intent: 'Silent Doubt / Question Raised (Seat 4B)', target: 'Teacher HUD' };
        if (gesture === 'OPEN_PALM') return { intent: 'Need Extra Sheet / Paper', target: 'Teacher HUD' };
        if (gesture === 'CLOSED_FIST' || gesture === 'FIST') return { intent: 'Restroom / Water Break Request', target: 'Teacher HUD' };
        if (gesture === 'THUMB_UP' || gesture === 'THUMBS_UP') return { intent: 'Concept Understood (Good Pace)', target: 'Class Feedback' };
        if (gesture === 'THUMB_DOWN' || gesture === 'THUMBS_DOWN') return { intent: 'Pacing Too Fast (Please Repeat)', target: 'Class Feedback' };
        break;

      default:
        break;
    }

    return { intent: `Gesture: ${gesture.replace(/_/g, ' ')}`, target: mode };
  }

  /**
   * Dispatches the action once confirmed and outside debounced cooldown
   */
  dispatchActionForCurrentMode(gesture, confidence) {
    const now = Date.now();
    const store = useAgent44Store.getState();
    const mode = store.activeMode;
    const actionKey = `${mode}:${gesture}`;

    // Debounce check: Prevent rapid re-firing of the same action
    if (this.lastDispatchedAction === actionKey && now - this.lastActionTime < this.actionCooldownMs) {
      return;
    }

    this.lastDispatchedAction = actionKey;
    this.lastActionTime = now;

    // Feed into Agentic AI sequence aggregator for multi-gesture sentence synthesis
    agenticSynthesizer.ingestGesture(gesture, mode);

    // --- Mode Action Execution ---
    switch (mode) {
      case 'DESKTOP': {
        if (gesture === 'CLOSED_FIST' || gesture === 'FIST') {
          cursorController.showDesktop();
          store.addToast('Desktop OS: Show Desktop (Win + D / Minimize All)', 'info');
        } else if (gesture === 'OPEN_PALM') {
          cursorController.restoreWindow();
          store.addToast('Desktop OS: Restore Active Window (Alt + Tab)', 'info');
        } else if (gesture === 'OK_SIGN') {
          cursorController.rightClick();
          store.addToast('Desktop OS: Right Click', 'info');
        } else if (gesture === 'THUMB_UP' || gesture === 'THUMBS_UP') {
          cursorController.leftClick();
          store.addToast('Desktop OS: Left Click', 'info');
        }
        break;
      }

      case 'CLASSROOM': {
        if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') {
          store.addToast('Teacher Notified: Silent question from Seat 4B', 'success');
          store.speakText('Teacher alert: Seat 4B has a question.');
        } else if (gesture === 'OPEN_PALM') {
          store.addToast('Teacher Notified: Need extra answer sheet', 'success');
          store.speakText('Teacher alert: Seat 4B needs an extra sheet.');
        } else if (gesture === 'CLOSED_FIST' || gesture === 'FIST') {
          store.addToast('Teacher Notified: Restroom / water break request', 'warning');
          store.speakText('Teacher alert: Seat 4B requests a break.');
        } else if (gesture === 'THUMB_UP' || gesture === 'THUMBS_UP') {
          store.addToast('Pacing Feedback: Concept understood!', 'info');
        } else if (gesture === 'THUMB_DOWN' || gesture === 'THUMBS_DOWN') {
          store.addToast('Pacing Feedback: Pacing too fast, please repeat!', 'warning');
        }
        break;
      }

      case 'ROOM_CONTROL': {
        if (gesture === 'OPEN_PALM') store.dispatchRoomCommand('LIGHT_ON');
        else if (gesture === 'CLOSED_FIST' || gesture === 'FIST') store.dispatchRoomCommand('LIGHT_OFF');
        else if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') store.dispatchRoomCommand('FAN_ON');
        else if (gesture === 'POINT_DOWN') store.dispatchRoomCommand('FAN_OFF');
        else if (gesture === 'THUMB_UP' || gesture === 'THUMBS_UP') store.dispatchRoomCommand('DOOR_OPEN');
        else if (gesture === 'THUMB_DOWN' || gesture === 'THUMBS_DOWN') store.dispatchRoomCommand('DOOR_CLOSE');
        else if (gesture === 'VICTORY') store.dispatchRoomCommand('TV_TOGGLE');
        else if (gesture === 'ROCK_ON') store.dispatchRoomCommand('PARTY_MODE');
        break;
      }

      case 'LIBRARY': {
        let msg = '';
        if (gesture === 'OPEN_PALM') msg = 'Notice: Please keep it quiet in the study area';
        else if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') msg = 'Request: Librarian book search assistance requested';
        else if (gesture === 'THUMB_UP' || gesture === 'THUMBS_UP') msg = 'Gratitude: Thank you!';
        else if (gesture === 'CLOSED_FIST' || gesture === 'FIST') msg = 'Status: Leaving study desk';

        if (msg) {
          store.addToast(msg, 'info');
        }
        break;
      }

      case 'HOSPITAL': {
        let msg = '';
        let type = 'info';
        if (gesture === 'OPEN_PALM') {
          msg = 'Patient Request: Water needed at Bed 4';
          type = 'info';
        } else if (gesture === 'CLOSED_FIST' || gesture === 'FIST') {
          msg = 'PATIENT ALERT: Pain medication requested';
          type = 'warning';
        } else if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') {
          msg = 'NURSE CALL: Assistance requested immediately';
          type = 'warning';
        } else if (gesture === 'ROCK_ON') {
          msg = 'EMERGENCY CODE BLUE: Medical team alerted!';
          type = 'error';
        }

        if (msg) {
          store.addToast(msg, type);
          store.speakText(msg);
        }
        break;
      }

      case 'COMMUNICATION': {
        let speech = '';
        if (gesture === 'OPEN_PALM') speech = 'Hello, nice to meet you!';
        else if (gesture === 'THUMB_UP' || gesture === 'THUMBS_UP') speech = 'Yes, I agree.';
        else if (gesture === 'THUMB_DOWN' || gesture === 'THUMBS_DOWN') speech = 'No, I disagree.';
        else if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') speech = 'I want this, please.';
        else if (gesture === 'OK_SIGN') speech = 'I understand, all good.';

        if (speech) {
          store.addToast(`Spoken: "${speech}"`, 'success');
          store.speakText(speech);
        }
        break;
      }

      case 'SPACE': {
        let msg = '';
        if (gesture === 'THUMB_UP' || gesture === 'THUMBS_UP') msg = 'Astronaut Telemetry: Oxygen & Suit Systems 100% Nominal';
        else if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') msg = 'EVA Thruster RCS Pulse Executed (0.5s burst)';
        else if (gesture === 'CLOSED_FIST' || gesture === 'FIST') msg = 'Tether Lock: Station hold engaged';
        else if (gesture === 'OPEN_PALM') msg = 'Airlock Outer Hatch: Sealed & Verified';
        else if (gesture === 'WAVE') msg = 'Comms Ping: High-gain antenna signal 5x5';

        if (msg) {
          store.addToast(msg, 'info');
        }
        break;
      }

      case 'CUSTOM': {
        store.addToast(`Custom Gesture Triggered: ${gesture}`, 'info');
        break;
      }

      default:
        break;
    }
  }

  reset() {
    this.frameBuffer = [];
    this.status = 'SEARCHING';
    this.currentCandidate = 'NONE';
    this.confirmedGesture = 'NONE';
  }
}

export const gestureProcessor = new GestureProcessor();
