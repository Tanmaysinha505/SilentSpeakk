/**
 * VoiceCommandParser
 * Ultra-fast local rule-based speech intent parser.
 * Supports English, Hindi, and Hinglish with zero network/AI latency.
 */

// Normalized Room Aliases
const ROOM_MAP = [
  { id: 'room1', keywords: ['master', 'master room', 'master bedroom', 'room 1', 'room one', 'pehle room', 'pehela kamra', 'main room', 'hardware room'] },
  { id: 'room2', keywords: ['living', 'living room', 'hall', 'drawing room', 'room 2', 'room two', 'doosra room', 'dusra kamra'] },
  { id: 'room3', keywords: ['study', 'study room', 'office', 'library', 'room 3', 'room three', 'teesra room', 'tisra kamra'] },
  { id: 'room4', keywords: ['guest', 'guest room', 'guest bedroom', 'room 4', 'room four', 'chautha room', 'chautha kamra'] },
];

/**
 * Normalizes speech text by stripping punctuation, extra spaces, and lowercase conversion.
 */
export function normalizeSpeechText(text = '') {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detects if a specific room was explicitly mentioned in the voice command.
 */
export function extractTargetRoom(normalizedText) {
  for (const r of ROOM_MAP) {
    for (const kw of r.keywords) {
      if (normalizedText.includes(kw)) {
        return r.id;
      }
    }
  }
  return null; // Fallback to currently selected active room
}

/**
 * Parses normalized speech text into a structured command payload.
 * @param {string} rawSpeech - Raw transcript from Web Speech API
 * @param {string} fallbackRoomId - Currently active roomId
 * @returns {{ command: string, targetRoomId: string, confidence: number, matchType: string, feedback: string } | null}
 */
export function parseVoiceCommand(rawSpeech, fallbackRoomId = 'room1') {
  if (!rawSpeech) return null;

  const text = normalizeSpeechText(rawSpeech);
  if (!text) return null;

  const targetRoomId = extractTargetRoom(text) || fallbackRoomId;

  // 1. LIGHT COMMANDS (English + Hindi + Hinglish)
  // ON: "turn on light", "light on", "batti jalao", "light chalu karo", "switch on the light"
  if (
    /(\b(light|lights|batti|roshni|bulb|lamp)\b.*\b(on|turn on|switch on|chalu|jalao|khol|start|enable|jala do|chalu karo)\b)|(\b(on|turn on|switch on|chalu|jalao|khol do|start|enable)\b.*\b(light|lights|batti|roshni|bulb|lamp)\b)/i.test(text)
  ) {
    return { command: 'LIGHT_ON', targetRoomId, confidence: 98, matchType: 'LOCAL_RULE', feedback: 'Turning light ON' };
  }

  // OFF: "turn off light", "light off", "batti bujhao", "light band karo", "switch off the light"
  if (
    /(\b(light|lights|batti|roshni|bulb|lamp)\b.*\b(off|turn off|switch off|band|bujhao|bujha do|stop|disable|band karo)\b)|(\b(off|turn off|switch off|band|bujhao|bujha do|stop|disable|band karo)\b.*\b(light|lights|batti|roshni|bulb|lamp)\b)/i.test(text)
  ) {
    return { command: 'LIGHT_OFF', targetRoomId, confidence: 98, matchType: 'LOCAL_RULE', feedback: 'Turning light OFF' };
  }

  // TOGGLE LIGHT: "toggle light", "light badlo"
  if (/\b(toggle|badlo|change)\b.*\b(light|lights|batti)\b/i.test(text)) {
    return { command: 'LIGHT_TOGGLE', targetRoomId, confidence: 95, matchType: 'LOCAL_RULE', feedback: 'Toggling light' };
  }

  // 2. FAN COMMANDS (English + Hindi + Hinglish)
  // ON: "turn on fan", "fan on", "pankha chalu karo", "pankha chalao", "fan start"
  if (
    /(\b(fan|fans|pankha|pankhe|cooler)\b.*\b(on|turn on|switch on|chalu|chalao|start|enable|chalu karo|chala do)\b)|(\b(on|turn on|switch on|chalu|chalao|start|enable|chalu karo|chala do)\b.*\b(fan|fans|pankha|pankhe|cooler)\b)/i.test(text)
  ) {
    return { command: 'FAN_ON', targetRoomId, confidence: 98, matchType: 'LOCAL_RULE', feedback: 'Engaging fan' };
  }

  // OFF: "turn off fan", "fan off", "pankha band karo", "fan roko"
  if (
    /(\b(fan|fans|pankha|pankhe)\b.*\b(off|turn off|switch off|band|roko|stop|disable|band karo)\b)|(\b(off|turn off|switch off|band|roko|stop|disable|band karo)\b.*\b(fan|fans|pankha|pankhe)\b)/i.test(text)
  ) {
    return { command: 'FAN_OFF', targetRoomId, confidence: 98, matchType: 'LOCAL_RULE', feedback: 'Decelerating fan' };
  }

  // TOGGLE FAN: "toggle fan", "pankha badlo"
  if (/\b(toggle|badlo)\b.*\b(fan|pankha)\b/i.test(text)) {
    return { command: 'FAN_TOGGLE', targetRoomId, confidence: 95, matchType: 'LOCAL_RULE', feedback: 'Toggling fan' };
  }

  // 3. DOOR / SERVO COMMANDS (English + Hindi + Hinglish)
  // OPEN: "open door", "darwaza kholo", "door open", "gate kholo", "khol do darwaza"
  if (
    /(\b(door|doors|darwaza|darwaje|gate|entry)\b.*\b(open|kholo|khol do|unlock|unlatch)\b)|(\b(open|kholo|khol do|unlock)\b.*\b(door|doors|darwaza|darwaje|gate|entry)\b)/i.test(text)
  ) {
    return { command: 'DOOR_OPEN', targetRoomId, confidence: 98, matchType: 'LOCAL_RULE', feedback: 'Opening smart door' };
  }

  // CLOSE: "close door", "darwaza band karo", "door close", "gate band karo", "band kar do"
  if (
    /(\b(door|doors|darwaza|darwaje|gate|entry)\b.*\b(close|band|lock|shut|band karo|band kar do)\b)|(\b(close|band|lock|shut|band karo|band kar do)\b.*\b(door|doors|darwaza|darwaje|gate|entry)\b)/i.test(text)
  ) {
    return { command: 'DOOR_CLOSE', targetRoomId, confidence: 98, matchType: 'LOCAL_RULE', feedback: 'Closing smart door' };
  }

  // TOGGLE DOOR: "toggle door", "darwaza toggle karo"
  if (/\b(toggle)\b.*\b(door|darwaza|gate)\b/i.test(text)) {
    return { command: 'DOOR_TOGGLE', targetRoomId, confidence: 95, matchType: 'LOCAL_RULE', feedback: 'Toggling smart door' };
  }

  // 4. TV / MEDIA COMMANDS (English + Hindi + Hinglish)
  // ON: "turn on tv", "tv on", "tv chalu karo", "television on"
  if (
    /(\b(tv|television|screen|display)\b.*\b(on|turn on|switch on|chalu|start|chalu karo)\b)|(\b(on|turn on|switch on|chalu|start|chalu karo)\b.*\b(tv|television|screen|display)\b)/i.test(text)
  ) {
    return { command: 'TV_ON', targetRoomId, confidence: 98, matchType: 'LOCAL_RULE', feedback: 'Turning TV ON' };
  }

  // OFF: "turn off tv", "tv off", "tv band karo"
  if (
    /(\b(tv|television|screen|display)\b.*\b(off|turn off|switch off|band|stop|band karo)\b)|(\b(off|turn off|switch off|band|stop|band karo)\b.*\b(tv|television|screen|display)\b)/i.test(text)
  ) {
    return { command: 'TV_OFF', targetRoomId, confidence: 98, matchType: 'LOCAL_RULE', feedback: 'Turning TV OFF' };
  }

  // NEXT CHANNEL: "next channel", "change channel", "channel badlo", "agla channel", "tv channel change"
  if (
    /\b(next channel|change channel|channel badlo|agla channel|dusra channel|next station)\b/i.test(text) ||
    (/\b(channel)\b.*\b(next|change|badlo|agla)\b/i.test(text))
  ) {
    return { command: 'TV_NEXT_CHANNEL', targetRoomId, confidence: 97, matchType: 'LOCAL_RULE', feedback: 'Switching TV channel' };
  }

  // 5. AC / CLIMATE CONTROL COMMANDS (English + Hindi + Hinglish)
  // ON: "ac on", "turn on ac", "air conditioner on", "ac chalu karo", "cooling start"
  if (
    /(\b(ac|a c|air conditioner|airconditioner|cooler|cooling)\b.*\b(on|turn on|switch on|chalu|start|chalu karo)\b)|(\b(on|turn on|switch on|chalu|start|chalu karo)\b.*\b(ac|a c|air conditioner|airconditioner|cooler|cooling)\b)/i.test(text)
  ) {
    return { command: 'AC_ON', targetRoomId, confidence: 98, matchType: 'LOCAL_RULE', feedback: 'Starting AC cooling' };
  }

  // OFF: "ac off", "turn off ac", "ac band karo", "air conditioner band karo"
  if (
    /(\b(ac|a c|air conditioner|airconditioner|cooler|cooling)\b.*\b(off|turn off|switch off|band|stop|band karo)\b)|(\b(off|turn off|switch off|band|stop|band karo)\b.*\b(ac|a c|air conditioner|airconditioner|cooler|cooling)\b)/i.test(text)
  ) {
    return { command: 'AC_OFF', targetRoomId, confidence: 98, matchType: 'LOCAL_RULE', feedback: 'Turning AC OFF' };
  }

  // COLDER / TEMP DOWN: "make it colder", "temperature kam karo", "temp down", "thanda karo", "increase cooling", "decrease temperature", "kam karo"
  if (
    /\b(make it colder|colder|cold|thanda|thanda karo|temp down|temperature down|lower temperature|decrease temp|decrease temperature|kam karo|ghatao|more cooling)\b/i.test(text)
  ) {
    return { command: 'TEMP_DOWN', targetRoomId, confidence: 96, matchType: 'LOCAL_RULE', feedback: 'Lowering AC temperature' };
  }

  // WARMER / TEMP UP: "make it warmer", "temperature badhao", "temp up", "garam karo", "increase temperature", "increase temp", "badhao"
  if (
    /\b(make it warmer|warmer|warm|garam|garam karo|temp up|temperature up|raise temperature|increase temp|increase temperature|badhao|less cooling)\b/i.test(text)
  ) {
    return { command: 'TEMP_UP', targetRoomId, confidence: 96, matchType: 'LOCAL_RULE', feedback: 'Raising AC temperature' };
  }

  // AUTO MODE: "ac auto", "auto mode on", "auto mode chalu karo"
  if (/\b(auto mode|ac auto|climate auto|auto cooling)\b/i.test(text)) {
    return { command: 'AC_AUTO_TOGGLE', targetRoomId, confidence: 95, matchType: 'LOCAL_RULE', feedback: 'Toggling AC Auto Mode' };
  }

  // 6. BUZZER / ALARM COMMANDS (English + Hindi + Hinglish)
  // ON: "buzzer on", "alarm on", "sound alarm", "ghanti bajao", "buzzer chalu karo", "alarm chalu karo", "siren on"
  if (
    /(\b(buzzer|alarm|ghanti|siren|bell)\b.*\b(on|turn on|chalu|sound|bajao|start|chalu karo)\b)|(\b(on|turn on|chalu|sound|bajao|start|chalu karo)\b.*\b(buzzer|alarm|ghanti|siren|bell)\b)/i.test(text)
  ) {
    return { command: 'BUZZER_ON', targetRoomId, confidence: 98, matchType: 'LOCAL_RULE', feedback: 'Sounding Smart Buzzer' };
  }

  // OFF: "buzzer off", "alarm off", "mute buzzer", "ghanti band karo", "buzzer band karo", "alarm band karo", "stop alarm"
  if (
    /(\b(buzzer|alarm|ghanti|siren|bell)\b.*\b(off|turn off|band|mute|stop|silence|band karo)\b)|(\b(off|turn off|band|mute|stop|silence|band karo)\b.*\b(buzzer|alarm|ghanti|siren|bell)\b)/i.test(text)
  ) {
    return { command: 'BUZZER_OFF', targetRoomId, confidence: 98, matchType: 'LOCAL_RULE', feedback: 'Muting Smart Buzzer' };
  }

  // 7. WINDOW BLINDS / CURTAINS (English + Hindi + Hinglish)
  // "open blinds", "parda kholo", "blinds close", "curtains open"
  if (/\b(blinds|blind|curtain|curtains|parda|parde)\b/i.test(text)) {
    return { command: 'BLINDS_TOGGLE', targetRoomId, confidence: 95, matchType: 'LOCAL_RULE', feedback: 'Toggling window blinds' };
  }

  // 8. PARTY MODE
  // "party mode", "party on", "masti mode", "celebrate"
  if (/\b(party|party mode|disco|masti mode|celebration)\b/i.test(text)) {
    return { command: 'PARTY_MODE', targetRoomId, confidence: 97, matchType: 'LOCAL_RULE', feedback: 'Toggling Party Mode' };
  }

  // 9. FAST NATURAL LANGUAGE HEURISTIC FALLBACKS
  // "It's feeling too hot" -> TEMP_DOWN / AC_ON
  if (/\b(too hot|very hot|garmi lag rahi|bahut garmi|sweating|burning up)\b/i.test(text)) {
    return { command: 'TEMP_DOWN', targetRoomId, confidence: 85, matchType: 'NATURAL_HEURISTIC', feedback: 'Cooling room down' };
  }

  // "It's feeling cold" -> TEMP_UP / AC_OFF
  if (/\b(too cold|very cold|thand lag rahi|bahut thand|chilly|freezing)\b/i.test(text)) {
    return { command: 'TEMP_UP', targetRoomId, confidence: 85, matchType: 'NATURAL_HEURISTIC', feedback: 'Warming room up' };
  }

  // "It's too dark" -> LIGHT_ON
  if (/\b(too dark|very dark|andhera|andhera ho gaya|can't see|cant see)\b/i.test(text)) {
    return { command: 'LIGHT_ON', targetRoomId, confidence: 88, matchType: 'NATURAL_HEURISTIC', feedback: 'Illuminating room' };
  }

  // "Going to sleep" / "Goodnight" -> LIGHT_OFF
  if (/\b(goodnight|good night|going to sleep|so raha hu|so jao|sleeping time)\b/i.test(text)) {
    return { command: 'LIGHT_OFF', targetRoomId, confidence: 88, matchType: 'NATURAL_HEURISTIC', feedback: 'Goodnight! Dimming lights' };
  }

  // Unrecognized command
  return null;
}
