import { useAgent44Store } from '../store/useAgent44Store.js';
import { agenticSynthesizer } from './agenticSynthesizer.js';

/**
 * GestureProcessor
 * Edge-triggered gesture execution engine with state machine locking,
 * release-to-NONE unlocking, and cooldown deduplication protection.
 */
class GestureProcessor {
  constructor() {
    this.bufferSize = 4;
    this.frameBuffer = [];

    // State machine: 'SEARCHING' | 'STABILIZING' | 'CONFIRMED'
    this.status = 'SEARCHING';
    this.currentCandidate = 'NONE';
    this.confirmedGesture = 'NONE';
    this.lastConfirmedTime = 0;
    this.consecutiveCandidateFrames = 0;
    this.consecutiveNoneFrames = 0;

    // Edge-trigger & Gesture Lock State Machine
    this.lastExecutedGesture = 'NONE';
    this.gestureLocked = false;
    this.lastGestureExecutionTime = 0;
    this.gestureCooldownMs = 1800; // 1.8s cooldown window

    // Fast, ultra-responsive thresholds (2-3 frame trigger)
    this.minConfidenceThreshold = 52.0;
    this.consecutiveFramesToConfirm = 3;
    this.highConfidenceThreshold = 75.0; // 2 frames for clear gestures
    this.handDropGracePeriodMs = 250;
    this.lastHandSeenTime = 0;
  }

  processFrame(rawGesture, confidence = 0, landmarks = [], fps = 30) {
    const now = Date.now();
    const hasHand = rawGesture !== 'NONE' && rawGesture !== '' && landmarks && landmarks.length >= 21;

    if (hasHand) {
      this.lastHandSeenTime = now;
    }

    const validDetection = hasHand && confidence >= this.minConfidenceThreshold;
    const effectiveGesture = validDetection ? rawGesture.toUpperCase().replace(/\s+/g, '_') : 'NONE';

    // 1. Sliding FIFO Queue
    this.frameBuffer.push({
      gesture: effectiveGesture,
      confidence: validDetection ? confidence : 0,
      timestamp: now
    });
    if (this.frameBuffer.length > this.bufferSize) {
      this.frameBuffer.shift();
    }

    // 2. Fast candidate tracking & edge-triggered confirmation
    if (effectiveGesture !== 'NONE') {
      this.consecutiveNoneFrames = 0;

      if (this.currentCandidate !== effectiveGesture) {
        this.currentCandidate = effectiveGesture;
        this.consecutiveCandidateFrames = 1;
        this.status = 'STABILIZING';

        // If hand switched to a DIFFERENT gesture than the currently locked gesture,
        // unlock so the new gesture can be evaluated & confirmed
        if (this.lastExecutedGesture !== effectiveGesture) {
          this.gestureLocked = false;
        }
      } else {
        this.consecutiveCandidateFrames++;

        // Fast confirmation: 3 consecutive frames OR 2 frames with high confidence (>= 75%)
        const neededFrames = confidence >= this.highConfidenceThreshold ? 2 : this.consecutiveFramesToConfirm;

        if (this.consecutiveCandidateFrames >= neededFrames) {
          this.status = 'CONFIRMED';
          this.confirmedGesture = effectiveGesture;
          this.lastConfirmedTime = now;

          // Edge-trigger and cooldown protection:
          // 1. If hand is locked in the SAME gesture, do NOT fire again!
          // 2. Cooldown of ~1.8s prevents rapid jitter between gestures
          const isSameLockedGesture = this.gestureLocked && (this.lastExecutedGesture === effectiveGesture);
          const cooldownElapsed = (now - this.lastGestureExecutionTime) >= this.gestureCooldownMs;

          if (!isSameLockedGesture && (cooldownElapsed || this.lastExecutedGesture === 'NONE')) {
            // Lock this gesture immediately (one stable gesture = one action)
            this.lastExecutedGesture = effectiveGesture;
            this.gestureLocked = true;
            this.lastGestureExecutionTime = now;

            // Execute single edge-triggered action
            this.dispatchActionForCurrentMode(effectiveGesture, Math.round(confidence));
          }
        }
      }
    } else {
      // Hand dropped or returned to NONE pose
      this.consecutiveNoneFrames++;

      if (this.consecutiveNoneFrames >= 2 || (now - this.lastHandSeenTime > this.handDropGracePeriodMs)) {
        this.status = 'SEARCHING';
        this.currentCandidate = 'NONE';
        this.confirmedGesture = 'NONE';
        this.consecutiveCandidateFrames = 0;

        // Reset gesture lock when hand returns to NONE / released
        this.gestureLocked = false;
        this.lastExecutedGesture = 'NONE';
      }
    }

    // 3. Publish to reactive store
    const store = useAgent44Store.getState();
    const activeMode = store.activeMode;
    const activeGestureForIntent =
      this.status === 'CONFIRMED'
        ? this.confirmedGesture
        : this.currentCandidate !== 'NONE'
        ? this.currentCandidate
        : rawGesture;
    const intentData = this.resolveIntent(activeGestureForIntent, activeMode);

    store.updateTracking({
      rawGesture,
      confirmedGesture: this.confirmedGesture,
      status: this.status,
      confidence: Math.round(confidence),
      intent: intentData.intent,
      target: intentData.target,
      handDetected: hasHand,
      fps: Math.round(fps),
      landmarks
    });
  }

  resolveIntent(gesture, mode) {
    if (!gesture || gesture === 'NONE') {
      return { intent: 'Searching for hand...', target: '' };
    }

    if (mode === 'ROOM_CONTROL') {
      if (gesture === 'OPEN_PALM') return { intent: 'LIGHT_ON (Ceiling Light)', target: 'Ceiling Light' };
      if (gesture === 'CLOSED_FIST' || gesture === 'FIST') return { intent: 'LIGHT_OFF (Ceiling Light)', target: 'Ceiling Light' };
      if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') return { intent: 'FAN_ON (Ceiling Fan)', target: 'Ceiling Fan' };
      if (gesture === 'POINT_DOWN') return { intent: 'FAN_OFF (Ceiling Fan)', target: 'Ceiling Fan' };
      if (gesture === 'THUMB_UP' || gesture === 'THUMBS_UP') return { intent: 'BUZZER_ON (Smart Buzzer)', target: 'Smart Buzzer' };
      if (gesture === 'THUMB_DOWN' || gesture === 'THUMBS_DOWN') return { intent: 'BUZZER_OFF (Smart Buzzer)', target: 'Smart Buzzer' };
      if (gesture === 'OK_SIGN' || gesture === 'THREE_FINGERS') return { intent: 'DOOR_TOGGLE (Smart Door)', target: 'Smart Door' };
      if (gesture === 'VICTORY' || gesture === 'PEACE') return { intent: 'TV_TOGGLE (OLED TV)', target: 'Smart OLED TV' };
      if (gesture === 'ROCK_ON') return { intent: 'PARTY_MODE (Smart Room)', target: 'Smart Room' };
    }

    return { intent: `Gesture: ${gesture.replace(/_/g, ' ')}`, target: mode };
  }

  dispatchActionForCurrentMode(gesture, confidence) {
    const store = useAgent44Store.getState();
    const mode = store.activeMode;

    agenticSynthesizer.ingestGesture(gesture, mode);

    if (mode === 'ROOM_CONTROL') {
      const meta = { gesture, confidence, source: 'MediaPipe Vision Engine' };
      let targetCommand = null;

      if (gesture === 'OPEN_PALM') targetCommand = 'LIGHT_ON';
      else if (gesture === 'CLOSED_FIST' || gesture === 'FIST') targetCommand = 'LIGHT_OFF';
      else if (gesture === 'INDEX_POINT' || gesture === 'POINT_UP') targetCommand = 'FAN_ON';
      else if (gesture === 'POINT_DOWN') targetCommand = 'FAN_OFF';
      else if (gesture === 'THUMB_UP' || gesture === 'THUMBS_UP') targetCommand = 'BUZZER_ON';
      else if (gesture === 'THUMB_DOWN' || gesture === 'THUMBS_DOWN') targetCommand = 'BUZZER_OFF';
      else if (gesture === 'OK_SIGN' || gesture === 'THREE_FINGERS') targetCommand = 'DOOR_TOGGLE';
      else if (gesture === 'VICTORY' || gesture === 'PEACE') targetCommand = 'TV_TOGGLE';
      else if (gesture === 'ROCK_ON') targetCommand = 'PARTY_MODE';

      if (targetCommand) {
        console.log(`[GestureProcessor] Single Edge-Trigger Dispatch: ${targetCommand} (Gesture: ${gesture}, Conf: ${confidence}%)`);
        store.dispatchRoomCommand(targetCommand, meta);
      }
    }
  }
}

export const gestureProcessor = new GestureProcessor();
