import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, Volume2, Settings2, ArrowRight, CheckCircle, Key } from 'lucide-react';
import { agenticSynthesizer } from '../../services/agenticSynthesizer';
import { useAgent44Store } from '../../store/useAgent44Store';

export function AgenticSentenceCard() {
  const [sequence, setSequence] = useState([]);
  const [lastSynthesized, setLastSynthesized] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [apiKey, setApiKey] = useState(agenticSynthesizer.apiKey);
  const [apiEndpoint, setApiEndpoint] = useState(agenticSynthesizer.apiEndpoint);
  const [modelName, setModelName] = useState(agenticSynthesizer.modelName);
  const [useApi, setUseApi] = useState(agenticSynthesizer.useApi);

  const speakText = useAgent44Store((s) => s.speakText);

  useEffect(() => {
    const unsub = agenticSynthesizer.subscribe((seq) => {
      setSequence([...seq]);
    });

    agenticSynthesizer.listeners.forEach((fn) => {});
    // Add synthesized listener
    const synthListener = (data) => {
      setLastSynthesized(data);
    };
    synthListener.onSynthesized = (data) => {
      setLastSynthesized(data);
    };
    agenticSynthesizer.subscribe(synthListener);

    return () => unsub();
  }, []);

  const handleSaveConfig = (e) => {
    e.preventDefault();
    agenticSynthesizer.setApiConfig({ apiKey, apiEndpoint, modelName, useApi });
    setShowConfig(false);
  };

  return (
    <div className="agentic-ai-banner-container" aria-label="Agentic AI Reasoning Banner">
      <div className="agentic-ai-card">
        {/* Header row */}
        <div className="agentic-header">
          <div className="agentic-title-box">
            <Bot size={18} className="text-cyan animate-pulse" />
            <span className="agentic-brand">AGENTIC AI</span>
            <span className="agentic-badge">SENTENCE SYNTHESIZER</span>
          </div>

          <div className="agentic-header-actions">
            <button
              className="agentic-icon-btn"
              onClick={() => setShowConfig(!showConfig)}
              title="Configure Qwen / LLM API Key"
              aria-label="Configure LLM API"
            >
              <Settings2 size={14} />
            </button>
          </div>
        </div>

        {/* Live Sequence Chain */}
        <div className="agentic-chain-row">
          <span className="chain-label">GESTURE CHAIN:</span>
          {sequence.length === 0 ? (
            <span className="chain-empty">Make 1 or 2 gestures in sequence (e.g. Fist + Chest Point)...</span>
          ) : (
            <div className="chain-pills">
              {sequence.map((item, idx) => (
                <React.Fragment key={idx}>
                  <span className="chain-pill">
                    {item.gesture.replace(/_/g, ' ')}
                  </span>
                  {idx < sequence.length - 1 && (
                    <ArrowRight size={12} className="text-cyan chain-arrow" />
                  )}
                </React.Fragment>
              ))}
              <span className="chain-joining-pulse">Joining meaning...</span>
            </div>
          )}
        </div>

        {/* Complete Synthesized Sentence Output */}
        {lastSynthesized && (
          <div className="agentic-sentence-output">
            <div className="sentence-text-box">
              <Sparkles size={16} className="text-emerald glow-icon flex-shrink-0" />
              <p className="synthesized-text">
                "{lastSynthesized.sentence}"
              </p>
            </div>
            <button
              className="speak-replay-btn"
              onClick={() => speakText(lastSynthesized.sentence)}
              title="Replay Voice Vocalizer"
              aria-label="Replay vocalizer"
            >
              <Volume2 size={15} />
            </button>
          </div>
        )}

        {/* API Settings Modal / Dropdown */}
        {showConfig && (
          <form onSubmit={handleSaveConfig} className="agentic-config-form">
            <div className="config-title">
              <Key size={14} className="text-cyan" />
              <span>QWEN / LLM API REASONER SETTINGS</span>
            </div>
            <label className="config-check-label">
              <input
                type="checkbox"
                checked={useApi}
                onChange={(e) => setUseApi(e.target.checked)}
              />
              <span>Enable External Qwen / LLM Reasoning (Falls back to offline if unset)</span>
            </label>

            <input
              type="password"
              className="hud-input"
              placeholder="Qwen / Queen API Key (e.g. sk-xxxx)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />

            <input
              type="text"
              className="hud-input"
              placeholder="API Endpoint (Default: DashScope Qwen)"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
            />

            <input
              type="text"
              className="hud-input"
              placeholder="Model Name (e.g. qwen-turbo / qwen-plus)"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />

            <div className="config-btn-row">
              <button type="submit" className="hud-btn hud-btn-sim">
                Save LLM Config
              </button>
              <button
                type="button"
                className="hud-btn"
                onClick={() => setShowConfig(false)}
              >
                Close
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
