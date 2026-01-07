import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import gymImage from '../assets/background.jpg';

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
      await register({
        name,
        email,
        password
      });
      setMessage('Registration successful! Please check your email to verify your account.');
      // Don't auto-redirect - user needs to verify email first
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div
      className="w-full h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: `url(${gymImage})` }}
    >
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      {/* Register Form */}
      <form
        onSubmit={handleRegister}
        className="relative z-10 bg-white/10 backdrop-blur-lg border border-white/10 shadow-lg w-[400px] rounded-xl px-8 py-10 text-white flex flex-col"
      >
        <h3 className="text-3xl font-medium text-center mb-6">Create Account</h3>
        
        {error && <p className="text-red-400 text-sm mb-2 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</p>}
        {message && <p className="text-green-300 text-sm mb-2 bg-green-500/10 border border-green-500/20 rounded px-3 py-2">{message}</p>}
        
        <label className="mt-2 text-white text-sm font-medium">Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          className="bg-white/20 text-white px-3 py-2 rounded-md mt-1 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400"
          required
        />

        <label className="mt-4 text-white text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="bg-white/20 text-white px-3 py-2 rounded-md mt-1 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400"
          required
        />

        <label className="mt-4 text-white text-sm font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password (min 6 characters)"
          className="bg-white/20 text-white px-3 py-2 rounded-md mt-1 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400"
          required
          minLength={6}
        />

        <label className="mt-4 text-white text-sm font-medium">Confirm Password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter password"
          className="bg-white/20 text-white px-3 py-2 rounded-md mt-1 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400"
          required
          minLength={6}
        />

        <button className="mt-8 bg-white text-black py-3 rounded-md font-semibold hover:bg-gray-200 transition">
          Register
        </button>

        <p className="mt-6 text-center text-sm text-gray-300">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-blue-300 hover:underline"
          >
            Login here
          </button>
        </p>
      </form>
    </div>
  );
}
