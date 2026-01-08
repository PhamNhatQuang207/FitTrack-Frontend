import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import axiosClient from "../api/axiosClient";
import { Dumbbell, TrendingUp, Calendar, Zap, User, ClipboardList, Play } from "lucide-react";
import dashboardBg from "../assets/icons/dashboard_background.jpg";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    currentWeight: null,
    weeklyWorkouts: 0,
    streak: 0,
    plannedSessions: 0
  });
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [plannedWorkouts, setPlannedWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch active weekly schedule
      try {
        const scheduleRes = await axiosClient.get('/weekly-schedules/current');
        setActiveSchedule(scheduleRes.data);
      } catch (e) {
        setActiveSchedule(null);
      }

      // Fetch user progress
      const progressRes = await axiosClient.get('/users/progress');
      const progressData = progressRes.data;
      
      // Fetch workout sessions (legacy & stats)
      const sessionsRes = await axiosClient.get('/workout-sessions');
      const sessions = sessionsRes.data;

      // Calculate stats
      const currentWeight = progressData.weightHistory?.length > 0
        ? progressData.weightHistory[progressData.weightHistory.length - 1].value
        : null;

      // Get workouts from this week - simplified logic using activeSchedule if available
      const completedSessions = sessions.filter(s => s.status === 'completed');
      
      const weeklyWorkouts = activeSchedule 
        ? activeSchedule.completedDays 
        : completedSessions.filter(s => {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return new Date(s.date) >= oneWeekAgo;
          }).length;
          
      const planned = sessions.filter(s => s.status === 'planned');

      setStats({
        totalWorkouts: completedSessions.length,
        currentWeight,
        weeklyWorkouts,
        streak: weeklyWorkouts, // Placeholder logic
        plannedSessions: planned.length
      });
      
      setPlannedWorkouts(planned);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleWeeklyActionClick = () => {
    if (activeSchedule) {
      navigate("/weekly-schedule");
    } else {
      navigate("/weekly-plan-library");
    }
  };

  const handleProgressTrackingClick = () => {
    navigate("/progress-tracking");
  };

  return (
    <div
      className="min-h-screen w-full text-white bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(17, 24, 39, 0.85), rgba(31, 41, 55, 0.85)), url(${dashboardBg})`,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
      }}
    >
      {/* Header Section */}
      <header className="w-full px-8 py-6 flex justify-between items-center">
        <div
          className="flex items-center space-x-3 cursor-pointer group flex-1"
          onClick={handleProfileClick}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Welcome back</p>
            <p className="font-semibold text-lg">{user?.name || 'User'}</p>
          </div>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent flex-1 text-center">
          FitTrack
        </h1>
        <div className="flex-1"></div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-fade-in">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm p-6 rounded-xl border border-blue-500/30 hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-blue-400" />
                <span className="text-3xl font-bold">{stats.weeklyWorkouts}</span>
              </div>
              <p className="text-sm text-gray-300">This Week</p>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-sm p-6 rounded-xl border border-green-500/30 hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-2">
                <Dumbbell className="w-8 h-8 text-green-400" />
                <span className="text-3xl font-bold">{stats.totalWorkouts}</span>
              </div>
              <p className="text-sm text-gray-300">Total Completed</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-sm p-6 rounded-xl border border-purple-500/30 hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-purple-400" />
                <span className="text-3xl font-bold">{stats.currentWeight ? `${stats.currentWeight}kg` : '--'}</span>
              </div>
              <p className="text-sm text-gray-300">Current Weight</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 backdrop-blur-sm p-6 rounded-xl border border-amber-500/30 hover:scale-105 transition-transform">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-8 h-8 text-amber-400" />
                <span className="text-3xl font-bold">{activeSchedule ? 'Active' : 'Empty'}</span>
              </div>
              <p className="text-sm text-gray-300">Weekly Plan</p>
            </div>
          </div>
        )}

        {/* Main Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-8">
          {/* Weekly Schedule / Planning Card */}
          <div
            className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md p-8 rounded-2xl cursor-pointer 
                     hover:from-gray-700/80 hover:to-gray-800/80 transition-all duration-300 transform hover:-translate-y-2 
                     shadow-xl hover:shadow-2xl border border-gray-700/50 hover:border-blue-500/50 overflow-hidden"
            onClick={handleWeeklyActionClick}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ClipboardList className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {activeSchedule ? 'Current Weekly Schedule' : 'Weekly Planning'}
              </h2>
              <p className="text-gray-400 mb-4">
                {activeSchedule 
                  ? `Continue your "${activeSchedule.weeklyPlanName}" workouts. ${activeSchedule.completedDays}/${activeSchedule.totalWorkoutDays} completed.`
                  : "Create or start a weekly workout plan"}
              </p>
              {activeSchedule && (
                <div className="w-full bg-gray-700/50 rounded-full h-2 mt-4">
                   <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${(activeSchedule.completedDays / activeSchedule.totalWorkoutDays) * 100}%` }}
                   />
                </div>
              )}
            </div>
          </div>

          {/* Single Workout Planning Card */}
          <div
            className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md p-8 rounded-2xl cursor-pointer 
                     hover:from-gray-700/80 hover:to-gray-800/80 transition-all duration-300 transform hover:-translate-y-2 
                     shadow-xl hover:shadow-2xl border border-gray-700/50 hover:border-green-500/50 overflow-hidden"
            onClick={() => navigate('/workout-planning')}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Dumbbell className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Single Workout
              </h2>
              <p className="text-gray-400 mb-4">
                Plan a one-time workout session
              </p>
              {stats.plannedSessions > 0 && (
                <p className="text-sm text-green-400">
                  {stats.plannedSessions} session{stats.plannedSessions !== 1 ? 's' : ''} planned
                </p>
              )}
             </div>
          </div>

          {/* Workout History Card */}
          <div
            className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md p-8 rounded-2xl cursor-pointer 
                     hover:from-gray-700/80 hover:to-gray-800/80 transition-all duration-300 transform hover:-translate-y-2 
                     shadow-xl hover:shadow-2xl border border-gray-700/50 hover:border-orange-500/50 overflow-hidden"
            onClick={() => navigate('/workout-history')}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                Workout History
              </h2>
              <p className="text-gray-400 mb-4">
                View your past workout sessions and track progress
              </p>
              {stats.totalWorkouts > 0 && (
                <p className="text-sm text-orange-400">
                  {stats.totalWorkouts} workout{stats.totalWorkouts !== 1 ? 's' : ''} logged
                </p>
              )}
            </div>
          </div>
          </div>

          {/* Progress Tracking Card */}
          <div
            className="group relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md p-8 rounded-2xl cursor-pointer 
                     hover:from-gray-700/80 hover:to-gray-800/80 transition-all duration-300 transform hover:-translate-y-2 
                     shadow-xl hover:shadow-2xl border border-gray-700/50 hover:border-purple-500/50 overflow-hidden"
            onClick={handleProgressTrackingClick}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Progress Tracking
              </h2>
              <p className="text-gray-400 mb-4">
                Monitor your fitness journey and track measurements
              </p>
              {stats.totalWorkouts > 0 && (
                <p className="text-sm text-purple-400">
                  {stats.totalWorkouts} workout{stats.totalWorkouts !== 1 ? 's' : ''} completed
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Planned Workouts Section (Legacy/Individual) */}
        {plannedWorkouts.length > 0 && (
          <div className="max-w-5xl mx-auto mt-8">
            <h2 className="text-2xl font-bold mb-4">Individual Planned Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plannedWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 hover:border-blue-500/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{workout.name}</h3>
                      <p className="text-sm text-gray-400">
                        {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/workout/${workout.id}`)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {workout.exercises.slice(0, 3).map((ex, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-700/50 rounded-full text-xs">
                        {ex.exerciseName}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer Quote */}
      <footer className="fixed bottom-0 w-full py-6 bg-gradient-to-t from-black/50 to-transparent">
        <div className="text-center italic text-gray-300 font-medium">
          "Today's effort is tomorrow's result!"
        </div>
      </footer>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
