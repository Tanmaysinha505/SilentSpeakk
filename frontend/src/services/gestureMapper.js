/**
 * Gesture to Smart Room Command Mapping Engine.
 * Formats gesture detections into actionable room commands with confidence thresholds.
 */

export const GESTURE_DEFINITIONS = {
  OPEN_PALM: {
    id: 'OPEN_PALM',
    label: 'Open Palm',
    icon: 'Hand',
    intent: 'LIGHT_ON',
    target: 'Ceiling Light',
    description: 'Illuminate the room with ceiling light',
    minConfidence: 65,
    category: 'Lighting'
  },
  FIST: {
    id: 'FIST',
    label: 'Closed Fist',
    icon: 'CircleDot',
    intent: 'LIGHT_OFF',
    target: 'Ceiling Light',
    description: 'Extinguish ceiling illumination',
    minConfidence: 65,
    category: 'Lighting'
  },
  POINT_UP: {
    id: 'POINT_UP',
    label: 'Point Index Up',
    icon: 'ArrowUp',
    intent: 'FAN_ON',
    target: 'Ceiling Fan',
    description: 'Engage fan motor & aerodynamic rotation',
    minConfidence: 60,
    category: 'Climate'
  },
  POINT_DOWN: {
    id: 'POINT_DOWN',
    label: 'Point Index Down',
    icon: 'ArrowDown',
    intent: 'FAN_OFF',
    target: 'Ceiling Fan',
    description: 'Decelerate fan to rest',
    minConfidence: 60,
    category: 'Climate'
  },
  THUMBS_UP: {
    id: 'THUMBS_UP',
    label: 'Thumbs Up',
    icon: 'ThumbsUp',
    intent: 'BUZZER_ON',
    target: 'Smart Buzzer / Alarm',
    description: 'Activate IoT Smart Buzzer audio alarm (ESP32)',
    minConfidence: 70,
    category: 'Audio'
  },
  THUMBS_DOWN: {
    id: 'THUMBS_DOWN',
    label: 'Thumbs Down',
    icon: 'ThumbsDown',
    intent: 'BUZZER_OFF',
    target: 'Smart Buzzer / Mute',
    description: 'Deactivate IoT Smart Buzzer audio alarm (ESP32)',
    minConfidence: 70,
    category: 'Audio'
  },
  VICTORY: {
    id: 'VICTORY',
    label: 'Victory / Peace',
    icon: 'Tv',
    intent: 'TV_TOGGLE',
    target: 'Smart OLED TV',
    description: 'Toggle smart TV display power',
    minConfidence: 65,
    category: 'Media'
  },
  ROCK_ON: {
    id: 'ROCK_ON',
    label: 'Rock On (Horns)',
    icon: 'Sparkles',
    intent: 'PARTY_MODE',
    target: 'Whole Room',
    description: 'Activate smart room party lighting & fan sequence',
    minConfidence: 70,
    category: 'Automation'
  },
  OK_SIGN: {
    id: 'OK_SIGN',
    label: 'OK Sign (👌)',
    icon: 'DoorOpen',
    intent: 'DOOR_TOGGLE',
    target: 'Smart Door',
    description: 'Toggle smart entrance door (Open ➔ Close ➔ Open via Servo)',
    minConfidence: 65,
    category: 'Access'
  },
  THREE_FINGERS: {
    id: 'THREE_FINGERS',
    label: 'Three Fingers Up',
    icon: 'DoorOpen',
    intent: 'DOOR_TOGGLE',
    target: 'Smart Door',
    description: 'Toggle smart entrance door (Open ➔ Close ➔ Open via Servo)',
    minConfidence: 65,
    category: 'Access'
  },
  PINCH: {
    id: 'PINCH',
    label: 'Pinch (🤏)',
    icon: 'DoorClosed',
    intent: 'DOOR_TOGGLE',
    target: 'Smart Door',
    description: 'Toggle smart entrance door (Open ➔ Close ➔ Open via Servo)',
    minConfidence: 65,
    category: 'Access'
  },
  CALL: {
    id: 'CALL',
    label: 'Shaka / Call (🤙)',
    icon: 'DoorClosed',
    intent: 'DOOR_TOGGLE',
    target: 'Smart Door',
    description: 'Toggle smart entrance door (Open ➔ Close ➔ Open via Servo)',
    minConfidence: 65,
    category: 'Access'
  },
  DOOR_TOGGLE: {
    id: 'DOOR_TOGGLE',
    label: 'Door Toggle (Servo)',
    icon: 'DoorOpen',
    intent: 'DOOR_TOGGLE',
    target: 'Smart Door',
    description: 'Trigger servo motor to toggle smart entrance door',
    minConfidence: 50,
    category: 'Access'
  },
};

/**
 * Resolves a raw gesture detection and returns the mapped command or null if below threshold.
 */
export function resolveGestureToCommand(gestureName, confidence = 100) {
  if (!gestureName || gestureName === 'NONE') return null;

  const normalized = gestureName.toUpperCase().replace(/\s+/g, '_');
  const mapping = GESTURE_DEFINITIONS[normalized];

  if (!mapping) {
    return {
      command: null,
      intent: 'UNKNOWN_GESTURE',
      target: 'None',
      confidence,
      valid: false,
      reason: `Gesture "${gestureName}" has no mapped action`
    };
  }

  if (confidence < mapping.minConfidence) {
    return {
      command: null,
      intent: mapping.intent,
      target: mapping.target,
      confidence,
      valid: false,
      reason: `Confidence ${confidence}% below required ${mapping.minConfidence}%`
    };
  }

  return {
    command: mapping.intent,
    intent: mapping.intent,
    target: mapping.target,
    label: mapping.label,
    confidence,
    valid: true,
    category: mapping.category,
    description: mapping.description
  };
}
