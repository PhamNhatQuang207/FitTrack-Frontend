import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || pathToken;
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const isResetMode = !!token;

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      const response = await axiosClient.post('/auth/request-password-reset', { email });
      setMessage(response.data.message);
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const response = await axiosClient.post(`/auth/reset-password/${token}`, { password });
      setMessage(response.data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ft-page flex items-center justify-center min-h-screen px-4">
      {/* Accent blobs */}
      <div
        className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full opacity-8 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #CCFF00 0%, transparent 70%)', transform: 'translate(-40%, -40%)' }}
      />

      <div className="relative z-10 w-full max-w-[420px] animate-slide-up">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-2">
            <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="2" fill="#CCFF00" />
              <text x="18" y="26" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight="900" fontSize="22" fontStyle="italic" fill="#000">F</text>
            </svg>
            <span className="ft-title text-2xl tracking-widest text-neon-lime">FitTrack</span>
          </div>
        </div>

        <div className="ft-card ft-corner-tl ft-corner-br p-8">
          {/* Back link */}
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 mb-6 text-xs font-display font-bold uppercase tracking-widest transition-colors"
            style={{ color: '#A0A0A0' }}
            onMouseEnter={e => e.currentTarget.style.color = '#CCFF00'}
            onMouseLeave={e => e.currentTarget.style.color = '#A0A0A0'}
          >
            <ArrowLeft size={14} /> Back to Login
          </button>

          <h1 className="ft-title text-2xl text-white mb-1">
            {isResetMode ? 'Set New Password' : 'Reset Password'}
          </h1>
          <p className="text-sm mb-6" style={{ color: '#A0A0A0' }}>
            {isResetMode
              ? 'Enter your new password below.'
              : "Enter your email and we'll send a reset link."}
          </p>

          {error && (
            <div className="mb-4 px-3 py-2 text-[#FF5C00] text-sm border border-[rgba(255,92,0,0.3)] bg-[rgba(255,92,0,0.06)] rounded-sm font-medium">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 px-3 py-2 text-neon-lime text-sm border border-[rgba(204,255,0,0.3)] bg-[rgba(204,255,0,0.06)] rounded-sm font-medium flex items-center gap-2">
              <CheckCircle2 size={14} /> {message}
            </div>
          )}

          <form onSubmit={isResetMode ? handleResetPassword : handleRequestReset} className="flex flex-col gap-4">
            {!isResetMode ? (
              <div>
                <label className="ft-label">Email Address</label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="ft-input"
                  required
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="ft-label">New Password</label>
                  <input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="ft-input"
                    required
                  />
                </div>
                <div>
                  <label className="ft-label">Confirm Password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="ft-input"
                    required
                  />
                </div>
              </>
            )}

            <button
              id="reset-submit"
              type="submit"
              disabled={loading}
              className="ft-btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> {isResetMode ? 'Resetting...' : 'Sending...'}</>
              ) : (
                isResetMode ? 'Reset Password' : 'Send Reset Link'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
