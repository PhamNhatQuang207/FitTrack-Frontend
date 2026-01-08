import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { ArrowLeft, Calendar, Dumbbell, TrendingUp, Filter, ChevronDown, ChevronUp, Edit, CheckCircle, Trash2, Play } from 'lucide-react';
import dashboardBg from '../assets/icons/dashboard_background.jpg';

export default function WorkoutHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedSession, setExpandedSession] = useState(null);

  useEffect(() => {
    fetchWorkoutHistory();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [sessions, filterStatus]);

  const fetchWorkoutHistory = async () => {
    try {
      const response = await axiosClient.get('/workout-sessions');
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching workout history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSessions = () => {
    if (filterStatus === 'all') {
      setFilteredSessions(sessions);
    } else {
      setFilteredSessions(sessions.filter(s => s.status === filterStatus));
    }
  };

  const toggleExpand = (sessionId) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  const handleStartWorkout = (sessionId) => {
    navigate(`/workout/${sessionId}`);
  };

  const handleCompleteWorkout = async (sessionId) => {
    if (!window.confirm('Mark this workout as completed?')) return;
    
    try {
      await axiosClient.post(`/workout-sessions/${sessionId}/complete`);
      // Refresh the list
      fetchWorkoutHistory();
    } catch (error) {
      console.error('Error completing workout:', error);
      alert('Failed to complete workout');
    }
  };

  const handleDeleteWorkout = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this workout? This action cannot be undone.')) return;
    
    try {
      await axiosClient.delete(`/workout-sessions/${sessionId}`);
      // Refresh the list
      fetchWorkoutHistory();
    } catch (error) {
      console.error('Error deleting workout:', error);
      alert('Failed to delete workout');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'in-progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'planned': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculateTotalVolume = (session) => {
    let totalVolume = 0;
    session.exercises?.forEach(exercise => {
      exercise.actualSets?.forEach(set => {
        totalVolume += (set.weight || 0) * (set.reps || 0);
      });
    });
    return totalVolume;
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95)), url(${dashboardBg})`,
      }}
    >
      {/* Header */}
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
                {/* Session Header */}
                <div 
                  className="p-6 cursor-pointer"
                  onClick={() => toggleExpand(session.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <h3 className="text-lg md:text-xl font-bold text-white">{session.name}</h3>
                        <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 md:gap-6 mt-3 text-xs md:text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(session.date)}
                          {session.completedAt && ` at ${formatTime(session.completedAt)}`}
                        </div>
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-4 h-4" />
                          {session.exercises?.length || 0} exercises
                        </div>
                        {session.status === 'completed' && (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            {calculateTotalVolume(session).toLocaleString()} kg
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons for non-completed workouts */}
                    {session.status !== 'completed' && (
                      <div className="ml-4 flex gap-2">
                        {session.status === 'in-progress' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartWorkout(session.id);
                            }}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                            title="Continue Workout"
                          >
                            <Play className="w-4 h-4" />
                            Continue
                          </button>
                        )}
                        {session.status === 'planned' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartWorkout(session.id);
                            }}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                            title="Start Workout"
                          >
                            <Play className="w-4 h-4" />
                            Start
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteWorkout(session.id);
                          }}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                          title="Mark as Complete"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkout(session.id);
                          }}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                          title="Delete Workout"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    
                    <div className="ml-4">
                      {expandedSession === session.id ? (
                        <ChevronUp className="w-6 h-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Session Details */}
                {expandedSession === session.id && (
                  <div className="border-t border-gray-700 p-6 bg-gray-900/30">
                    {session.notes && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-300 mb-2">Notes:</p>
                        <p className="text-gray-400 text-sm">{session.notes}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm font-medium text-gray-300 mb-3">Exercises:</p>
                      <div className="space-y-3">
                        {session.exercises?.map((exercise, idx) => (
                          <div key={idx} className="bg-gray-800/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-white">{exercise.exerciseName}</h4>
                              <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                                {exercise.category}
                              </span>
                            </div>
                            
                            {/* Target vs Actual */}
                            <div className="text-sm text-gray-400">
                              {/* Display targets - handle both old and new format */}
                              {exercise.sets && exercise.sets.length > 0 ? (
                                <div>
                                  <span className="font-medium text-gray-300">Target:</span>
                                  <div className="mt-1 space-y-1">
                                    {exercise.sets.map((set, setIdx) => (
                                      <div key={setIdx} className="flex justify-between text-xs bg-gray-700/30 px-2 py-1 rounded">
                                        <span>Set {set.setNumber}:</span>
                                        <span>{set.targetReps} reps @ {set.targetWeight}kg</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                // Old format fallback
                                <div className="flex justify-between">
                                  <span>Target:</span>
                                  <span>{exercise.targetSets} sets × {exercise.targetReps} reps @ {exercise.targetWeight}kg</span>
                                </div>
                              )}
                              
                              {exercise.actualSets && exercise.actualSets.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-green-400 font-medium">Actual:</span>
                                  <div className="mt-1 space-y-1">
                                    {exercise.actualSets.map((set, setIdx) => (
                                      <div key={setIdx} className="flex justify-between text-xs bg-green-900/20 px-2 py-1 rounded border border-green-500/20">
                                        <span>Set {setIdx + 1}:</span>
                                        <span>{set.reps} reps @ {set.weight}kg</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
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
