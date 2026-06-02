import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      await register({ name, email, password });
      setMessage('Registration successful! Check your email to verify your account.');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="ft-page flex items-center justify-center min-h-screen px-4 py-10">
      {/* Background accent blobs */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-8 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #CCFF00 0%, transparent 70%)', transform: 'translate(40%, -40%)' }}
      />
      <div
        className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-6 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF5C00 0%, transparent 70%)', transform: 'translate(-40%, 40%)' }}
      />

      <div className="relative z-10 w-full max-w-[420px] animate-slide-up">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-2">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="2" fill="#CCFF00" />
              <text x="18" y="26" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight="900" fontSize="22" fontStyle="italic" fill="#000">F</text>
            </svg>
            <span className="ft-title text-3xl tracking-widest text-neon-lime text-glow-lime">FitTrack</span>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#A0A0A0] font-display font-semibold mt-1">
            Begin Your Journey
          </p>
        </div>

        {/* Form Card */}
        <div className="ft-card ft-corner-tl ft-corner-br p-8">
          <h1 className="ft-title text-2xl text-white mb-1">Create Account</h1>
          <p className="text-[#A0A0A0] text-sm mb-6">Join the elite. Start tracking today.</p>

          {error && (
            <div className="mb-4 px-3 py-2 text-[#FF5C00] text-sm border border-[rgba(255,92,0,0.3)] bg-[rgba(255,92,0,0.06)] rounded-sm font-medium">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 px-3 py-2 text-neon-lime text-sm border border-[rgba(204,255,0,0.3)] bg-[rgba(204,255,0,0.06)] rounded-sm font-medium">
              {message}
            </div>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div>
              <label className="ft-label">Full Name</label>
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="ft-input"
                required
              />
            </div>

            <div>
              <label className="ft-label">Email</label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="ft-input"
                required
              />
            </div>

            <div>
              <label className="ft-label">Password</label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="ft-input"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="ft-label">Confirm Password</label>
              <input
                id="reg-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="ft-input"
                required
                minLength={6}
              />
            </div>

            <button
              id="register-submit"
              type="submit"
              className="ft-btn-primary w-full text-sm py-3 mt-2"
            >
              Create Account
            </button>
          </form>

          <div className="ft-divider" />

          <p className="text-center text-sm text-[#A0A0A0]">
            Already have an account?{' '}
            <button
              id="go-login"
              type="button"
              onClick={() => navigate('/login')}
              className="text-neon-lime font-display font-bold uppercase tracking-wider text-xs transition-colors hover:text-glow-lime"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
