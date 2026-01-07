import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import gymImage from '../assets/background.jpg';

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
      
      // Redirect to dashboard after successful login
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div
      className="w-full h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: `url(${gymImage})` }}
    >
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      <form
        onSubmit={handleLogin}
        className="relative z-10 bg-white/10 backdrop-blur-lg border border-white/10 shadow-lg w-[400px] rounded-xl px-8 py-10 text-white flex flex-col"
      >
        <h3 className="text-3xl font-medium text-center mb-4">
          Login
        </h3>

        {error && <p className="text-red-400 text-sm text-center mb-2">{error}</p>}
        {message && <p className="text-green-300 text-sm text-center mb-2">{message}</p>}

        <label className="mt-2 text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="bg-white/20 text-white px-3 py-2 rounded-md mt-1 placeholder-gray-300"
          required
        />

        <label className="mt-4 text-sm font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="bg-white/20 text-white px-3 py-2 rounded-md mt-1 placeholder-gray-300"
          required
        />

        <button
          type="submit"
          className="mt-8 bg-white text-black py-2 rounded-md font-semibold hover:bg-gray-200 transition"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-300">
          Forgot your password?{' '}
          <button
            type="button"
            onClick={() => navigate('/reset-password')}
            className="text-blue-300 hover:underline"
          >
            Reset it here
          </button>
        </p>

        <p className="mt-4 text-center text-sm text-gray-300">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-blue-300 hover:underline"
          >
            Register here
          </button>
        </p>
      </form>
    </div>
  );
}
