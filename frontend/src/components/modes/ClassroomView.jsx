import React, { useState } from 'react';
import {
  GraduationCap,
  Users,
  HelpCircle,
  FileText,
  Coffee,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Bell,
  Volume2,
  Sparkles,
  Check
} from 'lucide-react';
import { useAgent44Store } from '../../store/useAgent44Store';

const INITIAL_SEATS = [
  { id: '1A', name: 'Student 1A', status: 'normal', alert: null },
  { id: '1B', name: 'Student 1B', status: 'normal', alert: null },
  { id: '2A', name: 'Student 2A (Introvert)', status: 'doubt', alert: 'Has a doubt regarding step 3' },
  { id: '2B', name: 'Student 2B', status: 'normal', alert: null },
  { id: '3A', name: 'Student 3A', status: 'normal', alert: null },
  { id: '3B', name: 'Student 3B', status: 'sheet', alert: 'Needs extra answer sheet' },
  { id: '4A', name: 'Student 4A', status: 'normal', alert: null },
  { id: '4B (You)', name: 'Your Seat (4B)', status: 'normal', alert: null },
];

export function ClassroomView({ onOpenLearner }) {
  const [seats, setSeats] = useState(INITIAL_SEATS);
  const [requestsQueue, setRequestsQueue] = useState([
    { id: 1, seat: 'Seat 2A', type: 'Doubt / Question', detail: 'Silent question raised on calculus step 3', time: '1 min ago' },
    { id: 2, seat: 'Seat 3B', type: 'Stationery', detail: 'Requesting extra graph paper sheet', time: 'Just now' },
  ]);
  const [comprehensionScore, setComprehensionScore] = useState(88); // 88% comprehension
  const [viewRole, setViewRole] = useState('STUDENT'); // 'STUDENT' | 'TEACHER'

  const tracking = useAgent44Store((s) => s.tracking);
  const addToast = useAgent44Store((s) => s.addToast);
  const speakText = useAgent44Store((s) => s.speakText);

  const handleStudentSignal = (type, detail) => {
    const newReq = {
      id: Date.now(),
      seat: 'Your Seat (4B)',
      type,
      detail,
      time: 'Just now'
    };
    setRequestsQueue([newReq, ...requestsQueue]);

    // Update Seat 4B
    setSeats(seats.map(s => s.id === '4B (You)' ? { ...s, status: 'active', alert: detail } : s));

    addToast(`Teacher Dashboard Notified: ${type} from Seat 4B`, 'success');
    speakText(`Teacher alert: Seat 4B has a ${type.toLowerCase()}.`);
  };

  const handleAcknowledge = (reqId) => {
    setRequestsQueue(requestsQueue.filter(r => r.id !== reqId));
    addToast('Request acknowledged by Teacher. Assistance on the way!', 'info');
  };

  return (
    <div className="mode-view-overlay classroom-overlay">
      <div className="mode-view-card classroom-card">
        {/* Header */}
        <div className="mode-view-header">
          <div className="title-row">
            <GraduationCap size={22} className="text-cyan" />
            <div>
              <h2 className="mode-view-title">Classroom Mode — Introvert Student & Teacher Assist</h2>
              <p className="mode-view-desc">
                Enables shy or introverted students to silently signal doubts or stationery needs without vocal stress.
              </p>
            </div>
          </div>

          <div className="classroom-role-switch">
            <button
              className={`role-toggle-btn ${viewRole === 'STUDENT' ? 'active' : ''}`}
              onClick={() => setViewRole('STUDENT')}
            >
              Student Desk
            </button>
            <button
              className={`role-toggle-btn ${viewRole === 'TEACHER' ? 'active' : ''}`}
              onClick={() => setViewRole('TEACHER')}
            >
              Teacher HUD
            </button>
            <button className="mode-teach-btn" onClick={onOpenLearner} title="Teach gesture in Classroom mode">
              Teach
            </button>
          </div>
        </div>

        {viewRole === 'STUDENT' ? (
          /* Student Desk View */
          <div className="student-desk-panel">
            <div className="silent-signals-grid">
              <div
                className={`mode-action-card ${tracking.confirmedGesture === 'INDEX_POINT' ? 'active-triggered' : ''}`}
                onClick={() => handleStudentSignal('Doubt / Question', 'Silent question on current topic')}
              >
                <div className="action-card-top">
                  <div className="action-icon-box text-cyan">
                    <HelpCircle size={18} />
                  </div>
                  <span className="gesture-tag">☝️ RAISE INDEX</span>
                </div>
                <div className="action-card-title">Silent Doubt / Question</div>
                <div className="action-card-desc">Alerts teacher privately without drawing class attention</div>
                {tracking.confirmedGesture === 'INDEX_POINT' && (
                  <div className="action-active-badge"><Check size={12} /> SENT</div>
                )}
              </div>

              <div
                className={`mode-action-card ${tracking.confirmedGesture === 'OPEN_PALM' ? 'active-triggered' : ''}`}
                onClick={() => handleStudentSignal('Extra Sheet', 'Requesting extra answer paper sheet')}
              >
                <div className="action-card-top">
                  <div className="action-icon-box text-emerald">
                    <FileText size={18} />
                  </div>
                  <span className="gesture-tag">✋ RAISE PALM</span>
                </div>
                <div className="action-card-title">Need Extra Sheet / Paper</div>
                <div className="action-card-desc">Teacher aide quietly brings stationery to your desk</div>
                {tracking.confirmedGesture === 'OPEN_PALM' && (
                  <div className="action-active-badge"><Check size={12} /> SENT</div>
                )}
              </div>

              <div
                className={`mode-action-card ${tracking.confirmedGesture === 'CLOSED_FIST' ? 'active-triggered' : ''}`}
                onClick={() => handleStudentSignal('Restroom Break', 'Water or restroom break request')}
              >
                <div className="action-card-top">
                  <div className="action-icon-box text-amber">
                    <Coffee size={18} />
                  </div>
                  <span className="gesture-tag">✊ CLOSED FIST</span>
                </div>
                <div className="action-card-title">Restroom / Water Break</div>
                <div className="action-card-desc">Requests brief hall pass or water break</div>
                {tracking.confirmedGesture === 'CLOSED_FIST' && (
                  <div className="action-active-badge"><Check size={12} /> SENT</div>
                )}
              </div>

              <div
                className={`mode-action-card ${tracking.confirmedGesture === 'THUMB_UP' ? 'active-triggered' : ''}`}
                onClick={() => {
                  setComprehensionScore(Math.min(100, comprehensionScore + 2));
                  addToast('Feedback: Concept understood perfectly!', 'success');
                }}
              >
                <div className="action-card-top">
                  <div className="action-icon-box text-blue">
                    <ThumbsUp size={18} />
                  </div>
                  <span className="gesture-tag">👍 THUMBS UP</span>
                </div>
                <div className="action-card-title">Understood the Concept</div>
                <div className="action-card-desc">Anonymous positive pacing feedback to teacher</div>
              </div>

              <div
                className={`mode-action-card ${tracking.confirmedGesture === 'THUMB_DOWN' ? 'active-triggered' : ''}`}
                onClick={() => {
                  setComprehensionScore(Math.max(20, comprehensionScore - 4));
                  addToast('Feedback: Pacing is too fast, please repeat!', 'warning');
                }}
              >
                <div className="action-card-top">
                  <div className="action-icon-box text-rose">
                    <ThumbsDown size={18} />
                  </div>
                  <span className="gesture-tag">👎 THUMBS DOWN</span>
                </div>
                <div className="action-card-title">Pacing Too Fast / Repeat</div>
                <div className="action-card-desc">Asks teacher to review previous slide gently</div>
              </div>
            </div>
          </div>
        ) : (
          /* Teacher Live Observation Dashboard */
          <div className="teacher-dashboard-panel">
            {/* Comprehension Thermometer */}
            <div className="comprehension-banner">
              <div className="comp-label-row">
                <span className="comp-title">CLASS COMPREHENSION LEVEL</span>
                <span className="comp-score text-cyan">{comprehensionScore}%</span>
              </div>
              <div className="comp-track">
                <div className="comp-fill" style={{ width: `${comprehensionScore}%` }} />
              </div>
            </div>

            {/* Seat Grid */}
            <div className="classroom-seat-grid">
              {seats.map((s) => (
                <div key={s.id} className={`seat-box ${s.status}`}>
                  <span className="seat-id">{s.id}</span>
                  {s.alert && <span className="seat-alert-dot" title={s.alert} />}
                </div>
              ))}
            </div>

            {/* Silent Queue */}
            <div className="silent-requests-queue">
              <div className="queue-title">
                <Bell size={13} className="text-cyan" />
                <span>SILENT DOUBT & REQUEST QUEUE:</span>
              </div>
              {requestsQueue.map((req) => (
                <div key={req.id} className="queue-item">
                  <div className="queue-item-info">
                    <span className="queue-seat">{req.seat}</span>
                    <span className="queue-type">[{req.type}]</span>
                    <span className="queue-detail">{req.detail}</span>
                  </div>
                  <button
                    className="ack-btn"
                    onClick={() => handleAcknowledge(req.id)}
                    title="Acknowledge & Assist quietly"
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
