import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || pathToken;
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const hasVerified = useRef(false);

  const verifyEmail = useCallback(async () => {
    try {
      const response = await axiosClient.get(`/auth/verify-email/${token}`);
      setStatus('success');
      setMessage(response.data.message);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Verification failed. Please try again.');
    }
  }, [token]);

  useEffect(() => {
    if (!hasVerified.current) {
      hasVerified.current = true;
      verifyEmail();
    }
  }, [verifyEmail]);

  return (
    <div className="ft-page flex items-center justify-center min-h-screen px-4">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(204,255,0,0.08) 0%, transparent 60%)' }}
      />

      <div className="relative z-10 w-full max-w-[420px] animate-slide-up">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3">
            <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="2" fill="#CCFF00" />
              <text x="18" y="26" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight="900" fontSize="22" fontStyle="italic" fill="#000">F</text>
            </svg>
            <span className="ft-title text-2xl tracking-widest text-neon-lime">FitTrack</span>
          </div>
        </div>

        <div className="ft-card ft-corner-tl ft-corner-br p-8 text-center">
          {status === 'loading' && (
            <>
              <div
                className="w-16 h-16 flex items-center justify-center mx-auto mb-5"
                style={{ border: '1px solid rgba(204,255,0,0.3)', borderRadius: '2px', background: 'rgba(204,255,0,0.06)' }}
              >
                <Loader2 size={28} style={{ color: '#CCFF00' }} className="animate-spin" />
              </div>
              <h1 className="ft-title text-2xl text-white mb-2">Verifying Email</h1>
              <p className="text-sm" style={{ color: '#A0A0A0' }}>Please wait while we verify your email address...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div
                className="w-16 h-16 flex items-center justify-center mx-auto mb-5"
                style={{ border: '1px solid rgba(204,255,0,0.4)', borderRadius: '2px', background: 'rgba(204,255,0,0.08)', boxShadow: '0 0 20px rgba(204,255,0,0.2)' }}
              >
                <CheckCircle2 size={28} style={{ color: '#CCFF00' }} />
              </div>
              <h1 className="ft-title text-2xl text-neon-lime mb-2">Email Verified!</h1>
              <p className="text-sm mb-6" style={{ color: '#A0A0A0' }}>{message}</p>
              <Link
                to="/login"
                className="ft-btn-primary block w-full py-3 text-center no-underline"
              >
                Go to Login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div
                className="w-16 h-16 flex items-center justify-center mx-auto mb-5"
                style={{ border: '1px solid rgba(255,92,0,0.4)', borderRadius: '2px', background: 'rgba(255,92,0,0.08)' }}
              >
                <XCircle size={28} style={{ color: '#FF5C00' }} />
              </div>
              <h1 className="ft-title text-2xl text-white mb-2">Verification Failed</h1>
              <p className="text-sm mb-6" style={{ color: '#A0A0A0' }}>{message}</p>
              <div className="flex gap-3">
                <Link
                  to="/register"
                  className="flex-1 py-3 text-center font-display font-bold uppercase tracking-wider text-xs no-underline transition-colors"
                  style={{ background: '#FF5C00', color: '#000', borderRadius: '2px' }}
                >
                  Register Again
                </Link>
                <Link
                  to="/login"
                  className="flex-1 py-3 text-center font-display font-bold uppercase tracking-wider text-xs no-underline transition-colors"
                  style={{ border: '1px solid #1A1A1A', color: '#A0A0A0', borderRadius: '2px' }}
                >
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
