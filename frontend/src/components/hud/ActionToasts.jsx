import React from 'react';
import { useAgent44Store } from '../../store/useAgent44Store';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const TOAST_ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info
};

export function ActionToasts() {
  const toasts = useAgent44Store((s) => s.toasts);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="action-toasts-container" aria-live="polite" aria-label="Action Notifications">
      {toasts.map((toast) => {
        const Icon = TOAST_ICONS[toast.type] || Info;
        return (
          <div key={toast.id} className={`action-toast toast-${toast.type}`}>
            <Icon size={16} className="toast-icon" />
            <span className="toast-message">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
