import React, { useState } from 'react';
import { History, Trash2, ChevronDown, ChevronUp, CheckCircle, Clock } from 'lucide-react';
import { useCommandStore } from '../../store/useCommandStore';

export function ActionHistoryDrawer() {
  const history = useCommandStore((s) => s.history);
  const clearHistory = useCommandStore((s) => s.clearHistory);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <section
      className={`hud-card history-card ${isCollapsed ? 'collapsed' : ''}`}
      aria-labelledby="history-heading"
    >
      <div className="card-header history-header">
        <div className="card-title-group">
          <History size={15} className="text-cyan" />
          <h2 id="history-heading" className="card-title">
            ACTION HISTORY & DISPATCH LOG
          </h2>
          <span className="log-count-pill">{history.length} events</span>
        </div>

        <div className="header-btn-group">
          {history.length > 0 && !isCollapsed && (
            <button
              className="hud-mini-btn"
              onClick={clearHistory}
              title="Clear Action History"
              aria-label="Clear Action History"
            >
              <Trash2 size={13} />
              <span>Clear</span>
            </button>
          )}

          <button
            className="hud-mini-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Action History' : 'Collapse Action History'}
            aria-label={isCollapsed ? 'Expand Action History' : 'Collapse Action History'}
          >
            {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="history-scroll-area" tabIndex={0} role="region" aria-label="Action Event Log">
          {history.length === 0 ? (
            <div className="history-empty">
              <Clock size={20} className="text-muted mb-2" />
              <div>No actions logged yet. Send a command or gesture to begin.</div>
            </div>
          ) : (
            <ul className="history-list">
              {history.map((item) => (
                <li key={item.id} className="history-item">
                  <div className="item-status-icon">
                    <CheckCircle size={14} className="text-emerald" />
                  </div>

                  <div className="item-content">
                    <div className="item-top-row">
                      <span className="item-cmd">{item.command}</span>
                      <span className="item-target">{item.target}</span>
                      <span className="item-time">{item.timeString}</span>
                    </div>

                    <div className="item-desc">{item.message}</div>

                    <div className="item-bottom-row">
                      <span className="item-tag gesture-tag">
                        Gesture: <strong>{item.gesture}</strong>
                      </span>
                      <span className="item-tag conf-tag">
                        Confidence: <strong>{item.confidence}%</strong>
                      </span>
                      <span className="item-tag source-tag">
                        Src: <strong>{item.source}</strong>
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
