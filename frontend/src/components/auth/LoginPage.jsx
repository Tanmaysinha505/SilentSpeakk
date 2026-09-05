import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  User,
  LogIn,
  Activity,
  Sparkles,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((s) => s.login);
  const loginError = useAuthStore((s) => s.loginError);
  const [localError, setLocalError] = useState('');

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setLocalError('');
    const res = login(username, password);
    if (!res.success) {
      setLocalError(res.message);
    }
  };

  const handleQuickLogin = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setLocalError('');
    login(user, pass);
  };

  return (
    <div className="login-fullscreen-wrapper">
      {/* Background Animated Cyber Ambient Lights */}
      <div className="login-bg-glow glow-cyan" />
      <div className="login-bg-glow glow-purple" />

      <div className="login-card">
        {/* Header Branding */}
        <div className="login-brand-header">
          <div className="login-brand-orb">
            <Activity size={24} className="text-cyan animate-pulse" />
          </div>
          <h1 className="login-title">
            AGENT <span>44</span>
          </h1>
          <p className="login-subtitle">
            AI-POWERED MULTI-ROOM SMART HOME DIGITAL TWIN
          </p>
        </div>

        {/* User Role Selection Cards */}
        <div className="login-roles-grid">
          {/* Admin Card */}
          <button
            type="button"
            className="role-card admin-card"
            onClick={() => handleQuickLogin('tanmay', 'agent44')}
          >
            <div className="role-card-header">
              <div className="role-icon-box admin-icon">
                <Cpu size={18} className="text-emerald" />
              </div>
              <div className="role-info">
                <span className="role-title">ADMIN ACCESS</span>
                <span className="role-badge hw-badge">FULL HARDWARE</span>
              </div>
            </div>
            <p className="role-desc">
              Physical ESP32 Master Room (GPIO 2, 25, 26, 33) + All Digital Twins.
            </p>
            <div className="role-quick-btn">
              <span>Login as <strong>tanmay</strong></span>
              <ArrowRight size={14} />
            </div>
          </button>

          {/* Guest Card */}
          <button
            type="button"
            className="role-card guest-card"
            onClick={() => handleQuickLogin('guest', 'guest44')}
          >
            <div className="role-card-header">
              <div className="role-icon-box guest-icon">
                <Layers size={18} className="text-cyan" />
              </div>
              <div className="role-info">
                <span className="role-title">GUEST ACCESS</span>
                <span className="role-badge twin-badge">SIMULATION ONLY</span>
              </div>
            </div>
            <p className="role-desc">
              Interactive 3D Digital Twins (Rooms 2–4) + Master Room live status viewing.
            </p>
            <div className="role-quick-btn">
              <span>Explore as <strong>guest</strong></span>
              <ArrowRight size={14} />
            </div>
          </button>
        </div>

        <div className="login-divider">
          <span>OR SIGN IN MANUALLY</span>
        </div>

        {/* Manual Login Form */}
        <form onSubmit={handleManualSubmit} className="login-form">
          {(localError || loginError) && (
            <div className="login-error-alert" role="alert">
              <span>{localError || loginError}</span>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="username-input" className="input-label">Username</label>
            <div className="input-field-wrapper">
              <User size={15} className="input-icon text-cyan" />
              <input
                id="username-input"
                type="text"
                className="login-input"
                placeholder="tanmay or guest"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password-input" className="input-label">Password</label>
            <div className="input-field-wrapper">
              <Lock size={15} className="input-icon text-cyan" />
              <input
                id="password-input"
                type="password"
                className="login-input"
                placeholder="agent44 or guest44"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button type="submit" className="login-submit-btn">
            <LogIn size={16} />
            <span>ENTER AGENT 44</span>
          </button>
        </form>

        {/* Footer info */}
        <div className="login-footer">
          <span>ESP32 RTDB // MEDIAPIPE VISION // THREE.JS DIGITAL TWIN</span>
        </div>
      </div>
    </div>
  );
}
