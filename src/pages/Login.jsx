import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await login({ email, password });
      setMessage('Logged in successfully!');
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ft-page flex items-center justify-center min-h-screen px-4">
      {/* Background accent blobs */}
      <div
        className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #CCFF00 0%, transparent 70%)', transform: 'translate(-40%, -40%)' }}
      />
      <div
        className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-8 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF5C00 0%, transparent 70%)', transform: 'translate(40%, 40%)' }}
      />

      <div className="relative z-10 w-full max-w-[420px] animate-slide-up">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-3 mb-2">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="2" fill="#CCFF00" />
              <text x="18" y="26" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight="900" fontSize="22" fontStyle="italic" fill="#000">F</text>
            </svg>
            <span className="ft-title text-3xl tracking-widest text-neon-lime text-glow-lime">FitTrack</span>
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#A0A0A0] font-display font-semibold mt-1">
            Train Smart. Track Hard.
          </p>
        </div>

        {/* Form Card */}
        <div className="ft-card ft-corner-tl ft-corner-br p-8">
          <h1 className="ft-title text-2xl text-white mb-1">Login</h1>
          <p className="text-[#A0A0A0] text-sm mb-6">Enter your credentials to continue</p>

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

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="ft-label">Email</label>
              <input
                id="login-email"
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
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="ft-input"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => navigate('/reset-password')}
                className="text-xs text-[#A0A0A0] hover:text-neon-lime transition-colors font-display font-semibold uppercase tracking-wider"
              >
                Forgot Password?
              </button>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="ft-btn-primary w-full text-sm py-3 mt-2"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin inline-block" />
                  Logging in...
                </span>
              ) : 'Log In'}
            </button>
          </form>

          <div className="ft-divider" />

          <p className="text-center text-sm text-[#A0A0A0]">
            No account yet?{' '}
            <button
              id="go-register"
              type="button"
              onClick={() => navigate('/register')}
              className="text-neon-lime hover:text-glow-lime font-display font-bold uppercase tracking-wider text-xs transition-colors"
            >
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
