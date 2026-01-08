import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { 
  ArrowLeft, 
  Calendar, 
  Dumbbell, 
  TrendingUp, 
  Play, 
  CheckCircle, 
  Trash2, 
  ChevronDown,
  Filter
} from 'lucide-react';
import dashboardBg from '../assets/icons/dashboard_background.jpg';

export default function WorkoutHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await axiosClient.get('/workout-sessions');
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (sessionId) => {
    setExpandedSessions(prev =>
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const handleStartWorkout = (sessionId) => {
    navigate(`/active-workout/${sessionId}`);
  };

  const handleCompleteWorkout = async (sessionId) => {
    if (!window.confirm('Mark this workout as complete?')) return;
    
    try {
      await axiosClient.patch(`/workout-sessions/${sessionId}/complete`);
      fetchSessions();
    } catch (error) {
      console.error('Error completing workout:', error);
      alert('Failed to complete workout');
    }
  };

  const handleDeleteWorkout = async (sessionId) => {
    if (!window.confirm('Delete this workout? This action cannot be undone.')) return;
    
    try {
      await axiosClient.delete(`/workout-sessions/${sessionId}`);
      fetchSessions();
    } catch (error) {
      console.error('Error deleting workout:', error);
      alert('Failed to delete workout');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 border-green-500 text-green-400';
      case 'in-progress':
        return 'bg-blue-500/20 border-blue-500 text-blue-400';
      case 'planned':
        return 'bg-gray-500/20 border-gray-500 text-gray-400';
      default:
        return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateTotalVolume = (session) => {
    if (!session.exercises) return 0;
    return session.exercises.reduce((total, exercise) => {
      const exerciseVolume = (exercise.actualSets || []).reduce((sum, set) => {
        return sum + (set.weight * set.reps);
      }, 0);
      return total + exerciseVolume;
    }, 0);
  };

  const filteredSessions = sessions.filter(session => {
    if (filterStatus === 'all') return true;
    return session.status === filterStatus;
  });

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95)), url(${dashboardBg})`,
      }}
    >
      <div className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex justify-start">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2 text-white hover:text-blue-400 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium hidden md:inline">Back to Dashboard</span>
              </button>
            </div>
            
            <div className="flex-1 text-center">
              <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                Workout History
              </h1>
              <p className="text-gray-400 mt-1 text-sm hidden md:block">View and manage your workout sessions</p>
            </div>
            
            <div className="flex-1"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filter Tabs */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-gray-300 font-medium">Filter by Status</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {['all', 'completed', 'in-progress', 'planned'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-400">
            {filteredSessions.length} workout{filteredSessions.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading workout history...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredSessions.length === 0 && (
          <div className="text-center py-12">
            <Dumbbell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No workouts found</p>
            <p className="text-gray-500 text-sm mt-2">
              {filterStatus !== 'all' 
                ? `No ${filterStatus} workouts to display`
                : 'Start your first workout to see it here!'}
            </p>
          </div>
        )}

        {/* Workout Sessions List */}
        {!loading && filteredSessions.length > 0 && (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-all"
              >
                {/* Session Card */}
                <div className="p-4 md:p-6">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg md:text-xl font-bold text-white">{session.name}</h3>
                        <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                      </div>
                      
                      {/* Info Row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>{formatDate(session.date)}</span>
                          {session.completedAt && <span className="text-gray-500">• {formatTime(session.completedAt)}</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Dumbbell className="w-4 h-4 flex-shrink-0" />
                          <span>{session.exercises?.length || 0} exercises</span>
                        </div>
                        {session.status === 'completed' && (
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 flex-shrink-0" />
                            <span>{calculateTotalVolume(session).toLocaleString()} kg</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Expand Button */}
                    <button
                      onClick={() => toggleExpand(session.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                    >
                      <ChevronDown className={`w-5 h-5 transition-transform ${expandedSessions.includes(session.id) ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Action Buttons */}
                  {session.status !== 'completed' && (
                    <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-gray-700/50">
                      {session.status === 'in-progress' && (
                        <button
                          onClick={() => handleStartWorkout(session.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm font-medium transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Continue
                        </button>
                      )}
                      {session.status === 'planned' && (
                        <button
                          onClick={() => handleStartWorkout(session.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white text-sm font-medium transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          Start Workout
                        </button>
                      )}
                      <button
                        onClick={() => handleCompleteWorkout(session.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white text-sm font-medium transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Complete</span>
                      </button>
                      <button
                        onClick={() => handleDeleteWorkout(session.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-medium transition-colors ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {expandedSessions.includes(session.id) && (
                  <div className="px-4 md:px-6 pb-4 md:pb-6 border-t border-gray-700/50">
                    <div className="pt-4">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">Exercises</h4>
                      {session.exercises && session.exercises.length > 0 ? (
                        <div className="space-y-2">
                          {session.exercises.map((exercise, idx) => (
                            <div key={idx} className="bg-gray-700/30 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-white">{exercise.exerciseName}</span>
                                <span className="text-xs text-gray-400">{exercise.category}</span>
                              </div>
                              {exercise.actualSets && exercise.actualSets.length > 0 && (
                                <div className="mt-2 text-xs text-gray-400">
                                  {exercise.actualSets.length} sets completed
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No exercises logged</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
