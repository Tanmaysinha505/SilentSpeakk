/**
 * VoiceControlService
 * Lightweight, event-driven Speech Recognition service for Agent 44.
 * Uses browser-native Web Speech API. Completely isolated from the
 * MediaPipe gesture loop with zero continuous polling or overhead.
 */
import { parseVoiceCommand } from './voiceCommandParser';
import { useCommandStore } from '../store/useCommandStore';
import { useAgent44Store } from '../store/useAgent44Store';
import { audioFeedback } from './audioFeedback';

class VoiceControlService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isSupported = false;
    this.timeoutId = null;

    // Debounce guard: Prevent duplicate execution of exact same command within 2 seconds
    this.lastExecutedCommand = null;
    this.lastExecutedTime = 0;
    this.debounceWindowMs = 2000;

    // Subscribed UI listeners
    this.listeners = new Set();

    this.initRecognition();
  }

  initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.info('[VoiceControl] Web Speech API not supported in this browser.');
      this.isSupported = false;
      return;
    }

    this.isSupported = true;

    try {
      this.recognition = new SpeechRecognition();
      // Configure strictly event-driven non-continuous single-shot recognition
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = 'en-IN'; // Highly robust for English, Hindi, and Hinglish accents

      this.recognition.onstart = () => {
        this.isListening = true;
        this.notify({ status: 'LISTENING', message: 'Listening...' });
        audioFeedback.playTone(720, 'sine', 0.08, 0.04);
      };

      this.recognition.onresult = (event) => {
        this.clearSafetyTimeout();
        this.isListening = false;

        if (event.results && event.results.length > 0) {
          const transcript = event.results[0][0].transcript;
          const confidence = event.results[0][0].confidence || 1.0;
          console.log(`[VoiceControl] Heard: "${transcript}" (Conf: ${Math.round(confidence * 100)}%)`);
          this.handleSpeechTranscript(transcript);
        } else {
          this.notify({ status: 'ERROR', message: 'No speech recognized. Try again.' });
        }
      };

      this.recognition.onerror = (event) => {
        this.clearSafetyTimeout();
        this.isListening = false;
        console.warn('[VoiceControl] Speech error:', event.error);

        let msg = 'Speech error';
        if (event.error === 'no-speech') {
          msg = 'No speech detected';
        } else if (event.error === 'not-allowed') {
          msg = 'Microphone permission denied';
        } else if (event.error === 'network') {
          msg = 'Speech network error';
        } else {
          msg = `Voice error: ${event.error}`;
        }

        this.notify({ status: 'ERROR', message: msg });
        audioFeedback.playWarning();
      };

      this.recognition.onend = () => {
        this.clearSafetyTimeout();
        this.isListening = false;
        // If not already in an active feedback state, return to IDLE
        setTimeout(() => {
          if (!this.isListening) {
            this.notify({ status: 'IDLE', message: '' });
          }
        }, 2200);
      };
    } catch (e) {
      console.warn('[VoiceControl] Failed to initialize SpeechRecognition:', e);
      this.isSupported = false;
    }
  }

  /**
   * Starts event-driven speech capture for a single command.
   */
  startListening() {
    if (!this.isSupported || !this.recognition) {
      useAgent44Store.getState().addToast('Speech Recognition not supported in this browser.', 'warning');
      this.notify({ status: 'UNSUPPORTED', message: 'Web Speech API not supported' });
      return;
    }

    if (this.isListening) {
      this.stopListening();
      return;
    }

    try {
      this.recognition.start();
      // Safety timeout: auto stop if user remains silent for 7 seconds
      this.timeoutId = setTimeout(() => {
        if (this.isListening) {
          this.stopListening();
          this.notify({ status: 'ERROR', message: 'Listening timed out' });
        }
      }, 7000);
    } catch (err) {
      console.warn('[VoiceControl] Start error:', err);
      this.isListening = false;
    }
  }

  /**
   * Stops active speech recognition.
   */
  stopListening() {
    this.clearSafetyTimeout();
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListening = false;
  }

  clearSafetyTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Evaluates speech transcript against fast rule parser and command executor.
   */
  handleSpeechTranscript(rawTranscript) {
    const activeRoomId = useCommandStore.getState().activeRoomId || 'room1';
    const parsed = parseVoiceCommand(rawTranscript, activeRoomId);

    if (parsed && parsed.command) {
      const now = Date.now();

      // 1. Debounce check for identical command within 2 seconds
      if (
        this.lastExecutedCommand === parsed.command &&
        (now - this.lastExecutedTime < this.debounceWindowMs)
      ) {
        console.log(`[VoiceControl] Debounced duplicate command "${parsed.command}"`);
        this.notify({
          status: 'UNDERSTOOD',
          transcript: rawTranscript,
          command: parsed.command,
          message: `${parsed.command} (Debounced)`
        });
        return;
      }

      this.lastExecutedCommand = parsed.command;
      this.lastExecutedTime = now;

      // 2. Dispatch command through the central Command Executor
      const meta = {
        source: 'Voice Control Engine',
        speechText: rawTranscript,
        roomId: parsed.targetRoomId,
        matchType: parsed.matchType
      };

      console.log(`[VoiceControl] Executing: ${parsed.command} on ${parsed.targetRoomId} (${parsed.feedback})`);
      const res = useCommandStore.getState().dispatchCommand(parsed.command, meta);

      if (res && res.message && !res.noop) {
        useAgent44Store.getState().addToast(`🎤 Voice: "${rawTranscript}" ➔ ${res.message}`, 'success');
      }

      this.notify({
        status: 'UNDERSTOOD',
        transcript: rawTranscript,
        command: parsed.command,
        message: parsed.feedback || res.message
      });
    } else {
      // 3. Command not recognized by local parser
      console.info(`[VoiceControl] Unrecognized speech: "${rawTranscript}"`);
      audioFeedback.playWarning();
      useAgent44Store.getState().addToast(`🎤 Unrecognized: "${rawTranscript}". Try: Light on, Fan off, AC on`, 'warning');

      this.notify({
        status: 'ERROR',
        transcript: rawTranscript,
        message: 'Try saying: Light on, Fan off, AC on, Darwaza kholo'
      });
    }
  }

  /**
   * Subscriber mechanism for React components.
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(state) {
    this.listeners.forEach((fn) => fn(state));
  }
}

export const voiceControlService = new VoiceControlService();
