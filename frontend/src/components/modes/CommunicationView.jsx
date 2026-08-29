import React from 'react';
import { MessageSquare, Hand, ThumbsUp, ThumbsDown, CheckCircle, HelpCircle, GraduationCap } from 'lucide-react';
import { useAgent44Store } from '../../store/useAgent44Store';

const COMM_PHRASES = [
  { gesture: 'OPEN_PALM', text: 'Hello! Nice to meet you.', icon: Hand },
  { gesture: 'THUMB_UP', text: 'Yes, I agree.', icon: ThumbsUp },
  { gesture: 'THUMB_DOWN', text: 'No, I disagree.', icon: ThumbsDown },
  { gesture: 'INDEX_POINT', text: 'I need this, please.', icon: HelpCircle },
  { gesture: 'POINT_CHEST', text: 'Me / I am speaking.', icon: Hand },
  { gesture: 'OK_SIGN', text: 'Understood, all good.', icon: CheckCircle },
];

export function CommunicationView({ onOpenLearner }) {
  const tracking = useAgent44Store((s) => s.tracking);
  const speakText = useAgent44Store((s) => s.speakText);
  const addToast = useAgent44Store((s) => s.addToast);

  return (
    <div className="mode-view-overlay communication-overlay">
      <div className="mode-view-card">
        <div className="mode-view-header">
          <div className="title-row">
            <MessageSquare size={20} className="text-emerald" />
            <div>
              <h2 className="mode-view-title">Deaf / Non-Verbal Communication</h2>
              <p className="mode-view-desc">
                Translates natural hand signs directly into voice speech and on-screen text.
              </p>
            </div>
          </div>

          <button
            className="mode-teach-btn"
            onClick={onOpenLearner}
            title="Teach gesture in Communication mode"
          >
            <GraduationCap size={14} />
            <span>Teach</span>
          </button>
        </div>

        {/* Live Subtitle Box */}
        <div className="speech-subtitle-display">
          <div className="subtitle-label">AGENT 44 VOCALIZER OUTPUT:</div>
          <div className="subtitle-text">
            {tracking.status === 'CONFIRMED' && tracking.intent
              ? tracking.intent
              : tracking.status === 'STABILIZING'
              ? 'Interpreting sign language phrase...'
              : 'Sign with your hand to vocalize speech'}
          </div>
        </div>

        <div className="mode-gesture-grid">
          {COMM_PHRASES.map((item) => {
            const Icon = item.icon;
            const isMatch = tracking.confirmedGesture === item.gesture;

            return (
              <div
                key={item.gesture}
                className={`mode-action-card comm-card ${isMatch ? 'active-triggered' : ''}`}
                onClick={() => {
                  speakText(item.text);
                  addToast(`Spoken: "${item.text}"`, 'success');
                }}
              >
                <div className="action-card-top">
                  <div className="action-icon-box">
                    <Icon size={18} className="text-emerald" />
                  </div>
                  <span className="gesture-tag">{item.gesture.replace(/_/g, ' ')}</span>
                </div>
                <div className="action-card-title">"{item.text}"</div>
                <div className="action-card-desc">Click to vocalize phrase</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
