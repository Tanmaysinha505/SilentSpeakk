import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Check, X, Volume2, Sparkles } from 'lucide-react';
import { voiceControlService } from '../../services/voiceControlService';

/**
 * VoiceControlBtn
 * Compact, interactive microphone trigger button with multi-state HUD feedback.
 * States: IDLE (🎤 Voice) | LISTENING (🎙 Listening...) | UNDERSTOOD (✓ Command) | ERROR (✕ Retry)
 */
export function VoiceControlBtn({ variant = 'topbar', className = '' }) {
  const [voiceState, setVoiceState] = useState({
    status: 'IDLE', // 'IDLE' | 'LISTENING' | 'UNDERSTOOD' | 'ERROR' | 'UNSUPPORTED'
    transcript: '',
    command: '',
    message: ''
  });

  useEffect(() => {
    const unsub = voiceControlService.subscribe((state) => {
      setVoiceState((prev) => ({
        ...prev,
        ...state
      }));
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handleClick = (e) => {
    e.stopPropagation();
    if (voiceState.status === 'LISTENING') {
      voiceControlService.stopListening();
    } else {
      voiceControlService.startListening();
    }
  };

  const isListening = voiceState.status === 'LISTENING';
  const isUnderstood = voiceState.status === 'UNDERSTOOD';
  const isError = voiceState.status === 'ERROR';

  return (
    <div className={`voice-control-wrapper ${variant} ${className}`}>
      <button
        className={`voice-mic-btn ${voiceState.status.toLowerCase()} ${isListening ? 'active-pulse' : ''}`}
        onClick={handleClick}
        title={
          isListening
            ? 'Listening... Click to stop'
            : isUnderstood
            ? `Understood: ${voiceState.command || voiceState.message}`
            : isError
            ? `Error: ${voiceState.message || 'Click to try again'}`
            : 'Click to speak a voice command (English / Hindi / Hinglish)'
        }
        aria-label="Voice Command Control"
      >
        {isListening ? (
          <>
            <span className="mic-wave-ring animate-ping" />
            <Mic size={14} className="text-cyan animate-bounce" />
            <span className="voice-btn-label">Listening...</span>
          </>
        ) : isUnderstood ? (
          <>
            <Check size={14} className="text-emerald" />
            <span className="voice-btn-label text-emerald">
              {voiceState.command ? voiceState.command.replace(/_/g, ' ') : 'Understood'}
            </span>
          </>
        ) : isError ? (
          <>
            <X size={14} className="text-rose" />
            <span className="voice-btn-label text-rose">Not Understood</span>
          </>
        ) : (
          <>
            <Mic size={14} className="text-cyan" />
            <span className="voice-btn-label">Voice</span>
          </>
        )}
      </button>

      {/* Floating mini-tooltip when active/listening */}
      {isListening && (
        <div className="voice-listening-popover">
          <div className="voice-popover-header">
            <span className="listening-dot animate-pulse" />
            <span>Speak Command (e.g. "Light on", "Pankha band karo", "Open door")</span>
          </div>
        </div>
      )}

      {/* Floating error feedback hint */}
      {isError && (
        <div className="voice-error-popover">
          <span>{voiceState.message || 'Try saying: Light on, Fan off, AC on'}</span>
        </div>
      )}
    </div>
  );
}
