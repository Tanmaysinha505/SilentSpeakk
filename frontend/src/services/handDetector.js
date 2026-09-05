import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// Standard MediaPipe Hand Landmark Indices
export const WRIST = 0;
export const THUMB_CMC = 1;
export const THUMB_MCP = 2;
export const THUMB_IP = 3;
export const THUMB_TIP = 4;

export const INDEX_MCP = 5;
export const INDEX_PIP = 6;
export const INDEX_DIP = 7;
export const INDEX_TIP = 8;

export const MIDDLE_MCP = 9;
export const MIDDLE_PIP = 10;
export const MIDDLE_DIP = 11;
export const MIDDLE_TIP = 12;

export const RING_MCP = 13;
export const RING_PIP = 14;
export const RING_DIP = 15;
export const RING_TIP = 16;

export const PINKY_MCP = 17;
export const PINKY_PIP = 18;
export const PINKY_DIP = 19;
export const PINKY_TIP = 20;

function euclideanDist(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Geometric analysis to detect extended fingers
 */
export function getExtendedFingers(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return { thumb: false, index: false, middle: false, ring: false, pinky: false };
  }

  const wrist = landmarks[WRIST];

  // A finger is extended if tip is higher than PIP in camera frame or significantly farther from wrist
  const indexExt = (landmarks[INDEX_TIP].y < landmarks[INDEX_PIP].y) ||
    (euclideanDist(wrist, landmarks[INDEX_TIP]) > euclideanDist(wrist, landmarks[INDEX_PIP]) * 1.10);

  const middleExt = (landmarks[MIDDLE_TIP].y < landmarks[MIDDLE_PIP].y) ||
    (euclideanDist(wrist, landmarks[MIDDLE_TIP]) > euclideanDist(wrist, landmarks[MIDDLE_PIP]) * 1.10);

  const ringExt = (landmarks[RING_TIP].y < landmarks[RING_PIP].y) &&
    (euclideanDist(wrist, landmarks[RING_TIP]) > euclideanDist(wrist, landmarks[RING_PIP]) * 1.12);

  const pinkyExt = (landmarks[PINKY_TIP].y < landmarks[PINKY_PIP].y) &&
    (euclideanDist(wrist, landmarks[PINKY_TIP]) > euclideanDist(wrist, landmarks[PINKY_PIP]) * 1.12);

  // Thumb extension check
  const thumbTipDist = euclideanDist(landmarks[THUMB_TIP], landmarks[PINKY_MCP]);
  const thumbIpDist = euclideanDist(landmarks[THUMB_IP], landmarks[PINKY_MCP]);
  const thumbExt = thumbTipDist > thumbIpDist * 1.10;

  return {
    thumb: thumbExt,
    index: indexExt,
    middle: middleExt,
    ring: ringExt,
    pinky: pinkyExt
  };
}

/**
 * Classifies 21 hand landmarks into distinct static gestures with confidence score
 */
export function classifyHandGesture(landmarks, currentMode = '') {
  if (!landmarks || landmarks.length < 21) {
    return { gesture: 'NONE', confidence: 0 };
  }

  const ext = getExtendedFingers(landmarks);
  const wrist = landmarks[WRIST];

  // Extended count among 4 fingers (index, middle, ring, pinky)
  const fingersCount = (ext.index ? 1 : 0) + (ext.middle ? 1 : 0) + (ext.ring ? 1 : 0) + (ext.pinky ? 1 : 0);

  // 1. OPEN_PALM: All 5 fingers extended
  if (ext.thumb && ext.index && ext.middle && ext.ring && ext.pinky) {
    return { gesture: 'OPEN_PALM', confidence: 96 };
  }

  // 1b. OPEN_PALM (Relaxed): 4 fingers extended
  if (fingersCount === 4) {
    return { gesture: 'OPEN_PALM', confidence: 91 };
  }

  // 2. CLOSED_FIST: All fingers curled tightly
  if (!ext.index && !ext.middle && !ext.ring && !ext.pinky) {
    const thumbDistToWrist = euclideanDist(wrist, landmarks[THUMB_TIP]);
    const wristMcpDist = euclideanDist(wrist, landmarks[INDEX_MCP]);
    if (thumbDistToWrist < wristMcpDist * 1.35) {
      return { gesture: 'CLOSED_FIST', confidence: 94 };
    }
  }

  // 3. INDEX_POINT / POINT_UP: Only index finger extended
  if (ext.index && !ext.middle && !ext.ring && !ext.pinky) {
    const isPointingDown = landmarks[INDEX_TIP].y > landmarks[INDEX_PIP].y + 0.08;

    if (isPointingDown) {
      return { gesture: 'POINT_DOWN', confidence: 92 };
    }

    // Medical anatomical pointing gestures ONLY apply in HOSPITAL mode
    if (currentMode === 'HOSPITAL') {
      if (landmarks[INDEX_TIP].y < 0.22) {
        return { gesture: 'POINT_HEAD', confidence: 89 };
      }
      // Pointing backward toward chest
      if (landmarks[INDEX_TIP].z > landmarks[WRIST].z + 0.04) {
        return { gesture: 'POINT_CHEST', confidence: 90 };
      }
    }

    // For ROOM_CONTROL, CLASSROOM, etc. — always INDEX_POINT!
    return { gesture: 'INDEX_POINT', confidence: 95 };
  }

  // 4. VICTORY / PEACE: Index and Middle extended, Ring and Pinky curled
  if (ext.index && ext.middle && !ext.ring && !ext.pinky) {
    return { gesture: 'VICTORY', confidence: 93 };
  }

  // 5. THUMB_UP: Only thumb extended, pointing upward
  if (ext.thumb && !ext.index && !ext.middle && !ext.ring && !ext.pinky) {
    const thumbPointingUp = landmarks[THUMB_TIP].y < landmarks[THUMB_IP].y;
    const thumbPointingDown = landmarks[THUMB_TIP].y > landmarks[THUMB_IP].y;

    if (thumbPointingUp) {
      return { gesture: 'THUMB_UP', confidence: 92 };
    }
    if (thumbPointingDown) {
      return { gesture: 'THUMB_DOWN', confidence: 91 };
    }
  }

  // 6. ROCK_ON: Index and Pinky extended, Middle and Ring curled
  if (ext.index && ext.pinky && !ext.middle && !ext.ring && !ext.thumb) {
    return { gesture: 'ROCK_ON', confidence: 90 };
  }

  // 7. CALL / SHAKA: Thumb and Pinky extended, Index, Middle, Ring curled
  if (ext.thumb && ext.pinky && !ext.index && !ext.middle && !ext.ring) {
    return { gesture: 'CALL', confidence: 92 };
  }

  // 8. THREE_FINGERS: Index, Middle, and Ring extended, Pinky curled
  if (ext.index && ext.middle && ext.ring && !ext.pinky) {
    return { gesture: 'THREE_FINGERS', confidence: 91 };
  }

  // 9. OK_SIGN: Thumb and Index touching (pinch), other fingers extended
  const thumbIndexDist = euclideanDist(landmarks[THUMB_TIP], landmarks[INDEX_TIP]);
  if (thumbIndexDist < 0.085 && (ext.middle && ext.ring)) {
    return { gesture: 'OK_SIGN', confidence: 93 };
  }

  // 10. PINCH: Thumb and Index touching close, other fingers curled
  if (thumbIndexDist < 0.085 && !ext.middle && !ext.ring && !ext.pinky) {
    return { gesture: 'PINCH', confidence: 92 };
  }

  // Default fallback if pose is indeterminate
  return { gesture: 'NONE', confidence: 30 };
}

/**
 * Singleton InBrowserHandDetector class managing GPU MediaPipe lifecycle
 */
class InBrowserHandDetector {
  constructor() {
    this.handLandmarker = null;
    this.isInitializing = false;
    this.isReady = false;
    this.initError = null;
  }

  async init() {
    if (this.isReady) return;
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      console.log('[MediaPipe] Initializing WebAssembly FilesetResolver...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );

      console.log('[MediaPipe] Creating HandLandmarker from model asset...');
      let modelPath = '/hand_landmarker.task';
      try {
        const resp = await fetch(modelPath, { method: 'HEAD' });
        if (!resp.ok) {
          modelPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
        }
      } catch (e) {
        modelPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
      }

      // Try GPU delegate first, fallback to CPU if context or hardware limits encountered
      try {
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4
        });
        console.log('[MediaPipe] In-browser HandLandmarker initialized on GPU!');
      } catch (gpuErr) {
        console.warn('[MediaPipe] GPU delegate failed, falling back to CPU:', gpuErr);
        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.4,
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4
        });
        console.log('[MediaPipe] In-browser HandLandmarker initialized on CPU!');
      }

      this.isReady = true;
      this.isInitializing = false;
    } catch (err) {
      console.error('[MediaPipe] Initialization error:', err);
      this.initError = err;
      this.isInitializing = false;
    }
  }

  detectVideoFrame(videoElement, timestamp) {
    if (!this.isReady || !this.handLandmarker || !videoElement || videoElement.readyState < 2) {
      return null;
    }

    try {
      let ts = Math.round(timestamp);
      if (this.lastTimestamp !== undefined && ts <= this.lastTimestamp) {
        ts = this.lastTimestamp + 1;
      }
      this.lastTimestamp = ts;

      const results = this.handLandmarker.detectForVideo(videoElement, ts);
      return results;
    } catch (err) {
      return null;
    }
  }
}

export const inBrowserHandDetector = new InBrowserHandDetector();
