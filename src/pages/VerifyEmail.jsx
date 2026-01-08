import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import gymImage from '../assets/background.jpg';

export default function VerifyEmail() {
  const { token: pathToken } = useParams(); // From /verify-email/:token
  const [searchParams] = useSearchParams(); // From /verify-email?token=...
  const token = searchParams.get('token') || pathToken; // Support both formats
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const hasVerified = useRef(false); // Prevent double verification in StrictMode

  useEffect(() => {
    if (!hasVerified.current) {
      hasVerified.current = true;
      verifyEmail();
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await axiosClient.get(`/auth/verify-email/${token}`);
      setStatus('success');
      setMessage(response.data.message);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || 'Verification failed. Please try again.');
    }
  };

  return (
    <div
      className="w-full h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: `url(${gymImage})` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      {/* Verification Card */}
      <div className="relative z-10 bg-white/10 backdrop-blur-lg border border-white/10 shadow-lg w-[450px] rounded-xl px-8 py-10 text-white flex flex-col items-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-400 animate-spin mb-4" />
            <h2 className="text-2xl font-bold mb-2">Verifying Your Email</h2>
            <p className="text-gray-300 text-center">Please wait while we verify your email address...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
            <p className="text-gray-300 text-center mb-6">{message}</p>
            <Link
              to="/login"
              className="w-full py-3 bg-green-500 hover:bg-green-600 rounded-md font-semibold text-center transition-colors"
            >
              Go to Login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <XCircle className="w-12 h-12 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Verification Failed</h2>
            <p className="text-gray-300 text-center mb-6">{message}</p>
            <div className="flex gap-3 w-full">
              <Link
                to="/register"
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-md font-semibold text-center transition-colors"
              >
                Register Again
              </Link>
              <Link
                to="/login"
                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold text-center transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
