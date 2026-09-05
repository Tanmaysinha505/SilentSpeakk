import { useAgent44Store } from '../store/useAgent44Store.js';

/**
 * Agentic AI Sequence-to-Sentence Synthesizer
 * Aggregates sequential gesture chains (e.g. [PAIN] + [POINT_CHEST])
 * and synthesizes them into complete, context-rich human sentences
 * using either built-in contextual reasoning or a Qwen/LLM API.
 */
class AgenticSynthesizerService {
  constructor() {
    this.sequenceBuffer = []; // [{ gesture, mode, timestamp }]
    this.chainTimeoutMs = 3200; // Chain window (gestures within 3.2s are joined)
    this.timer = null;

    // LLM API Config (Supports Qwen / Queen / DashScope / OpenRouter / Ollama)
    const hasStorage = typeof window !== 'undefined' && window.localStorage;
    this.apiKey = hasStorage ? (localStorage.getItem('agent44_llm_api_key') || '') : '';
    this.apiEndpoint = hasStorage ? (localStorage.getItem('agent44_llm_endpoint') || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions') : 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    this.modelName = hasStorage ? (localStorage.getItem('agent44_llm_model') || 'qwen-turbo') : 'qwen-turbo';
    this.useApi = hasStorage ? (localStorage.getItem('agent44_llm_enabled') === 'true') : false;

    // Callbacks
    this.listeners = new Set();
  }

  setApiConfig({ apiKey, apiEndpoint, modelName, useApi }) {
    const hasStorage = typeof window !== 'undefined' && window.localStorage;
    if (apiKey !== undefined) {
      this.apiKey = apiKey;
      if (hasStorage) localStorage.setItem('agent44_llm_api_key', apiKey);
    }
    if (apiEndpoint !== undefined) {
      this.apiEndpoint = apiEndpoint;
      if (hasStorage) localStorage.setItem('agent44_llm_endpoint', apiEndpoint);
    }
    if (modelName !== undefined) {
      this.modelName = modelName;
      if (hasStorage) localStorage.setItem('agent44_llm_model', modelName);
    }
    if (useApi !== undefined) {
      this.useApi = useApi;
      if (hasStorage) localStorage.setItem('agent44_llm_enabled', useApi ? 'true' : 'false');
    }
  }

  /**
   * Ingests a confirmed gesture into the active sequence chain
   */
  ingestGesture(gesture, mode) {
    const now = Date.now();

    // Reset chain if elapsed time exceeds window
    if (this.sequenceBuffer.length > 0) {
      const last = this.sequenceBuffer[this.sequenceBuffer.length - 1];
      if (now - last.timestamp > this.chainTimeoutMs) {
        this.sequenceBuffer = [];
      }
    }

    // Avoid duplicate adjacent gesture in sequence buffer
    if (
      this.sequenceBuffer.length > 0 &&
      this.sequenceBuffer[this.sequenceBuffer.length - 1].gesture === gesture &&
      now - this.sequenceBuffer[this.sequenceBuffer.length - 1].timestamp < 900
    ) {
      return;
    }

    this.sequenceBuffer.push({ gesture, mode, timestamp: now });
    this.notifyListeners();

    // Debounce completion evaluation
    if (this.timer) clearTimeout(this.timer);

    // If sequence reaches 2 or more gestures, or user pauses for 1.4s, synthesize sentence
    if (this.sequenceBuffer.length >= 2) {
      this.synthesizeSentence(mode);
    } else {
      this.timer = setTimeout(() => {
        if (this.sequenceBuffer.length >= 1) {
          this.synthesizeSentence(mode);
        }
      }, 1600);
    }
  }

  /**
   * Synthesize complete sentence from gesture sequence
   */
  async synthesizeSentence(mode) {
    const gestures = this.sequenceBuffer.map((s) => s.gesture);
    if (gestures.length === 0) return;

    // 1. First check local domain synthesis (fast & offline)
    let sentence = this.localSynthesize(gestures, mode);

    // 2. If user enabled external Qwen / LLM API and key is set, call it
    if (this.useApi && this.apiKey && gestures.length >= 2) {
      try {
        const llmSentence = await this.queryLlmApi(gestures, mode);
        if (llmSentence) {
          sentence = llmSentence;
        }
      } catch (err) {
        console.warn('[Agentic AI] LLM API call failed, using offline synthesis:', err);
      }
    }

    // 3. Dispatch synthesized sentence to store & speak
    const store = useAgent44Store.getState();
    store.addToast(`🤖 Agentic AI: "${sentence}"`, 'success');
    store.speakText(sentence);

    this.emitSynthesized({
      gestures: [...gestures],
      sentence,
      mode,
      timestamp: Date.now()
    });

    // Reset sequence buffer after synthesis
    this.sequenceBuffer = [];
    this.notifyListeners();
  }

  /**
   * Built-in contextual reasoning knowledge engine
   */
  localSynthesize(gestures, mode) {
    const gStr = gestures.join(' + ');

    // --- HOSPITAL MODE COMPOUND REASONING ---
    if (mode === 'HOSPITAL') {
      if (gestures.includes('CLOSED_FIST') && gestures.includes('POINT_CHEST')) {
        return 'Patient is reporting acute chest pain. Alerting medical team and cardiology immediately.';
      }
      if (gestures.includes('CLOSED_FIST') && gestures.includes('POINT_HEAD')) {
        return 'Patient is reporting severe head pain or migraine. Requesting neurological check.';
      }
      if (gestures.includes('OPEN_PALM') && (gestures.includes('POINT_CHEST') || gestures.includes('POINT_DOWN'))) {
        return 'Patient requests assistance with drinking water right now.';
      }
      if (gestures.includes('INDEX_POINT') && gestures.includes('POINT_CHEST')) {
        return 'Patient is calling nurse specifically for personal torso assistance.';
      }
      if (gestures.includes('ROCK_ON')) {
        return 'EMERGENCY CODE BLUE: Immediate medical crash team summoned to bedside!';
      }
      if (gestures.includes('CLOSED_FIST')) {
        return 'Patient alert: acute pain reported.';
      }
      if (gestures.includes('OPEN_PALM')) {
        return 'Patient request: drinking water needed.';
      }
      if (gestures.includes('INDEX_POINT')) {
        return 'Nurse assistance summoned to patient room.';
      }
    }

    // --- ROOM CONTROL COMPOUND REASONING ---
    if (mode === 'ROOM_CONTROL') {
      if (gestures.includes('INDEX_POINT') && gestures.includes('OPEN_PALM')) {
        return 'Smart room interaction: Turning ceiling light ON and adjusting room illumination.';
      }
      if (gestures.includes('INDEX_POINT') && gestures.includes('CLOSED_FIST')) {
        return 'Smart room interaction: Turning ceiling light OFF into dim ambient.';
      }
      if (gestures.includes('THUMB_UP') && gestures.includes('OPEN_PALM')) {
        return 'Smart room interaction: Turning ceiling light and IoT smart buzzer ON.';
      }
      if (gestures.includes('THUMB_UP')) {
        return 'IoT Beacon: Engaging smart buzzer audio alarm.';
      }
      if (gestures.includes('THUMB_DOWN')) {
        return 'IoT Beacon: Disabling smart buzzer audio alarm.';
      }
      if (gestures.includes('VICTORY')) {
        return 'Entertainment: Toggling smart OLED television display.';
      }
    }

    // --- COMMUNICATION MODE COMPOUND REASONING ---
    if (mode === 'COMMUNICATION') {
      if (gestures.includes('OPEN_PALM') && gestures.includes('THUMB_UP')) {
        return 'Hello! I am doing well and agree with you.';
      }
      if (gestures.includes('INDEX_POINT') && gestures.includes('THUMB_DOWN')) {
        return 'I do not want this, please take it away.';
      }
      if (gestures.includes('OPEN_PALM') && gestures.includes('POINT_CHEST')) {
        return 'Hello, my name is here and I would like to talk with you.';
      }
      if (gestures.includes('OK_SIGN') && gestures.includes('THUMB_UP')) {
        return 'Everything is fully understood and I agree 100%.';
      }
      if (gestures.includes('OPEN_PALM')) return 'Hello, nice to meet you!';
      if (gestures.includes('THUMB_UP')) return 'Yes, I agree.';
      if (gestures.includes('THUMB_DOWN')) return 'No, I disagree.';
      if (gestures.includes('INDEX_POINT')) return 'I need this, please.';
      if (gestures.includes('OK_SIGN')) return 'Understood, all good.';
    }

    // --- LIBRARY MODE COMPOUND REASONING ---
    if (mode === 'LIBRARY') {
      if (gestures.includes('OPEN_PALM') && gestures.includes('THUMB_UP')) {
        return 'Thank you for keeping the study room quiet and respectful.';
      }
      if (gestures.includes('INDEX_POINT') && gestures.includes('POINT_CHEST')) {
        return 'Student requesting direct book assistance at desk.';
      }
      if (gestures.includes('CLOSED_FIST')) return 'Leaving study desk.';
      if (gestures.includes('INDEX_POINT')) return 'Need book search assistance.';
      if (gestures.includes('OPEN_PALM')) return 'Please be quiet in the study area.';
      if (gestures.includes('THUMB_UP')) return 'Thank you!';
    }

    // --- SPACE MODE COMPOUND REASONING ---
    if (mode === 'SPACE') {
      if (gestures.includes('THUMB_UP') && gestures.includes('OPEN_PALM')) {
        return 'EVA Spacewalk: All suit oxygen reserves and airlock pressure seals are 100% nominal.';
      }
      if (gestures.includes('INDEX_POINT') && gestures.includes('CLOSED_FIST')) {
        return 'Propulsion telemetry: RCS thruster pulse completed; station lock engaged.';
      }
      if (gestures.includes('THUMB_UP')) return 'Oxygen and suit telemetry nominal.';
      if (gestures.includes('INDEX_POINT')) return 'Firing RCS attitude thrusters.';
      if (gestures.includes('CLOSED_FIST')) return 'Holding station position.';
    }

    return `Action sequence verified: ${gestures.map((g) => g.replace(/_/g, ' ')).join(' then ')}.`;
  }

  /**
   * Calls Qwen / Queen / OpenAI compatible LLM endpoint for dynamic agentic sentence synthesis
   */
  async queryLlmApi(gestures, mode) {
    const prompt = `You are Agent 44, a context-aware AI assistant interpreting touchless sign gestures.
Current operational mode: ${mode}.
The user has executed the following consecutive gestures in sequence: [${gestures.join(', ')}].
Synthesize these gestures into ONE concise, natural, highly accurate sentence representing what the human is expressing.
Do not output quotes or explanations. Output ONLY the sentence.`;

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 60
      })
    });

    if (!response.ok) {
      throw new Error(`LLM HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notifyListeners() {
    this.listeners.forEach((fn) => fn(this.sequenceBuffer));
  }

  emitSynthesized(data) {
    this.listeners.forEach((fn) => {
      if (fn.onSynthesized) fn.onSynthesized(data);
    });
  }
}

export const agenticSynthesizer = new AgenticSynthesizerService();
