import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { queryClient, queryKeys } from './lib/queryClient';

import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import WorkoutPlanning from './pages/WorkoutPlanning';
import WeeklyPlanBuilder from './pages/WeeklyPlanBuilder';
import WeeklyPlanLibrary from './pages/WeeklyPlanLibrary';
import WeeklyCalendar from './pages/WeeklyCalendar';
import ProgressTracking from './pages/ProgressTracking';
import ActiveWorkout from './pages/ActiveWorkout';
import WorkoutHistory from './pages/WorkoutHistory';
import AiCoachWidget from './components/AiCoachWidget';

import axiosClient from './api/axiosClient';
import { siteConfigAPI } from './api';
import { usePreventImeScrollJump } from './hooks/usePreventImeScrollJump';

function AppContent() {
  usePreventImeScrollJump();
  // Wake up Render server on initial load
  React.useEffect(() => {
    const wakeUpServer = async () => {
      try {
        await axiosClient.get('/health');
        console.log('Server is awake 🟢');
      } catch (error) {
        console.log('Server wake-up failed (it might be sleeping) 🔴', error);
      }
    };
    wakeUpServer();
  }, []);

  const { data: siteConfig } = useQuery({
    queryKey: queryKeys.siteConfig,
    queryFn: siteConfigAPI.get,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  React.useEffect(() => {
    if (siteConfig?.heroBackgroundUrl) {
      document.documentElement.style.setProperty('--ft-hero-bg', `url("${siteConfig.heroBackgroundUrl}")`);
    }
  }, [siteConfig]);

  const announcement = siteConfig?.announcementBanner || '';

  return (
    <AuthProvider>
      {announcement && (
        <div
          className="w-full px-4 py-2 text-center text-xs font-semibold tracking-wider uppercase"
          style={{ background: '#CCFF00', color: '#000' }}
        >
          {announcement}
        </div>
      )}
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workout-planning"
            element={
              <ProtectedRoute>
                <WorkoutPlanning />
              </ProtectedRoute>
            }
          />
          <Route
            path="/weekly-planning/:id?"
            element={
              <ProtectedRoute>
                <WeeklyPlanBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/weekly-plan-library"
            element={
              <ProtectedRoute>
                <WeeklyPlanLibrary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workout-history"
            element={
              <ProtectedRoute>
                <WorkoutHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/weekly-schedule"
            element={
              <ProtectedRoute>
                <WeeklyCalendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress-tracking"
            element={
              <ProtectedRoute>
                <ProgressTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workout/:id"
            element={
              <ProtectedRoute>
                <ActiveWorkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/photos"
            element={
              <div className="h-screen flex items-center justify-center text-white bg-gray-900">
                Photos page coming soon...
              </div>
            }
          />
        </Routes>
        <AiCoachWidget />
      </Router>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
