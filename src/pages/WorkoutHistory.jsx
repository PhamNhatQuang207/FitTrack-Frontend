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

// Shared page header
function PageHeader({ title, subtitle }) {
  const navigate = useNavigate();
  return (
    <div className="ft-header px-4 md:px-8 py-0">
      <div className="max-w-6xl mx-auto flex items-center h-16 gap-4">
        <button
          id="back-btn"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 transition-colors group"
          style={{ color: '#A0A0A0' }}
          onMouseEnter={e => e.currentTarget.style.color = '#CCFF00'}
          onMouseLeave={e => e.currentTarget.style.color = '#A0A0A0'}
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="hidden md:inline font-display font-bold uppercase tracking-widest text-xs">Dashboard</span>
        </button>
        <div className="flex-1 text-center">
          <h1
            className="ft-title text-2xl md:text-3xl"
            style={{ color: '#CCFF00' }}
          >
            {title}
          </h1>
          {subtitle && <p className="text-xs hidden md:block mt-0.5" style={{ color: '#A0A0A0' }}>{subtitle}</p>}
        </div>
        <div className="w-20 hidden md:block" />
      </div>
    </div>
  );
}

export default function WorkoutHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => { fetchSessions(); }, []);

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
      prev.includes(sessionId) ? prev.filter(id => id !== sessionId) : [...prev, sessionId]
    );
  };

  const handleStartWorkout = (sessionId) => navigate(`/workout/${sessionId}`);

  const handleCompleteWorkout = async (sessionId) => {
    if (!window.confirm('Mark this workout as complete?')) return;
    try {
      await axiosClient.patch(`/workout-sessions/${sessionId}/complete`);
      fetchSessions();
    } catch (error) {
      console.error('Error completing workout:', error);
    }
  };

  const handleDeleteWorkout = async (sessionId) => {
    if (!window.confirm('Delete this workout? This action cannot be undone.')) return;
    try {
      await axiosClient.delete(`/workout-sessions/${sessionId}`);
      fetchSessions();
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':   return <span className="ft-badge-lime">Completed</span>;
      case 'in-progress': return <span className="ft-badge-orange">In Progress</span>;
      default:            return <span className="ft-badge-gray">Planned</span>;
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (dateString) =>
    new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const calculateTotalVolume = (session) => {
    if (!session.exercises) return 0;
    return session.exercises.reduce((total, exercise) => {
      return total + (exercise.actualSets || []).reduce((sum, set) => sum + (set.weight * set.reps), 0);
    }, 0);
  };

  const filteredSessions = sessions.filter(session => {
    if (filterStatus === 'all') return true;
    return session.status === filterStatus;
  });

  const STATUS_FILTERS = ['all', 'completed', 'in-progress', 'planned'];

  return (
    <div className="ft-page min-h-screen">
      <PageHeader title="Workout History" subtitle="View and manage your workout sessions" />

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Section label */}
        <div className="mb-6 animate-slide-up">
          <p className="ft-label">// Filter Sessions</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Filter size={14} style={{ color: '#A0A0A0' }} />
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                id={`filter-${status}`}
                onClick={() => setFilterStatus(status)}
                className="font-display font-bold uppercase tracking-wider text-xs px-4 py-1.5 transition-all"
                style={{
                  background: filterStatus === status ? '#CCFF00' : 'rgba(10,10,10,0.9)',
                  color: filterStatus === status ? '#000' : '#A0A0A0',
                  border: `1px solid ${filterStatus === status ? '#CCFF00' : '#1A1A1A'}`,
                  borderRadius: '2px',
                  boxShadow: filterStatus === status ? '0 0 10px rgba(204,255,0,0.4)' : 'none',
                }}
              >
                {status === 'all' ? 'All' : status.replace('-', ' ')}
              </button>
            ))}
            <span className="ml-auto text-xs font-mono-sport" style={{ color: '#A0A0A0' }}>
              {filteredSessions.length} found
            </span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="ft-loader" />
          </div>
        )}

        {/* Empty */}
        {!loading && filteredSessions.length === 0 && (
          <div
            className="text-center py-20 animate-slide-up"
            style={{ border: '1px dashed rgba(204,255,0,0.15)', borderRadius: '2px' }}
          >
            <Dumbbell size={40} style={{ color: '#1A1A1A', margin: '0 auto 16px' }} />
            <p className="ft-title text-2xl text-white mb-2">No Workouts Found</p>
            <p className="text-sm" style={{ color: '#A0A0A0' }}>
              {filterStatus !== 'all'
                ? `No ${filterStatus} workouts to display`
                : 'Start your first workout to see it here!'}
            </p>
          </div>
        )}

        {/* Sessions list */}
        {!loading && filteredSessions.length > 0 && (
          <div className="space-y-3">
            {filteredSessions.map((session, idx) => {
              const isExpanded = expandedSessions.includes(session.id);
              const volume = calculateTotalVolume(session);
              return (
                <div
                  key={session.id}
                  className="overflow-hidden animate-slide-up"
                  style={{
                    background: 'rgba(10,10,10,0.95)',
                    border: '1px solid rgba(204,255,0,0.12)',
                    borderRadius: '2px',
                    animationDelay: `${idx * 0.04}s`,
                    animationFillMode: 'both',
                  }}
                >
                  {/* Card header */}
                  <div className="p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3
                            className="font-display font-black italic uppercase text-white text-lg leading-none"
                          >
                            {session.name}
                          </h3>
                          {getStatusBadge(session.status)}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: '#A0A0A0' }}>
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {formatDate(session.date)}
                            {session.completedAt && <span style={{ color: '#555' }}>• {formatTime(session.completedAt)}</span>}
                          </span>
                          <span className="flex items-center gap-1">
                            <Dumbbell size={11} />
                            {session.exercises?.length || 0} exercises
                          </span>
                          {session.status === 'completed' && volume > 0 && (
                            <span className="flex items-center gap-1">
                              <TrendingUp size={11} />
                              {volume.toLocaleString()} kg
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExpand(session.id)}
                        className="p-2 flex-shrink-0 transition-colors"
                        style={{ border: '1px solid #1A1A1A', borderRadius: '2px', color: '#A0A0A0' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#CCFF00'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#1A1A1A'}
                      >
                        <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Action buttons */}
                    {session.status !== 'completed' && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {session.status === 'in-progress' && (
                          <button
                            onClick={() => handleStartWorkout(session.id)}
                            className="ft-btn-secondary flex items-center gap-2 text-xs"
                            style={{ padding: '6px 14px' }}
                          >
                            <Play size={12} /> Continue
                          </button>
                        )}
                        {session.status === 'planned' && (
                          <button
                            onClick={() => handleStartWorkout(session.id)}
                            className="ft-btn-primary flex items-center gap-2 text-xs"
                            style={{ padding: '6px 14px' }}
                          >
                            <Play size={12} /> Start Workout
                          </button>
                        )}
                        <button
                          onClick={() => handleCompleteWorkout(session.id)}
                          className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-wider transition-colors"
                          style={{ padding: '6px 14px', border: '1px solid rgba(204,255,0,0.3)', borderRadius: '2px', color: '#CCFF00', background: 'rgba(204,255,0,0.06)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(204,255,0,0.12)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(204,255,0,0.06)'}
                        >
                          <CheckCircle size={12} /> <span className="hidden sm:inline">Mark Complete</span>
                        </button>
                        <button
                          onClick={() => handleDeleteWorkout(session.id)}
                          className="ml-auto flex items-center gap-2 text-xs font-display font-bold uppercase tracking-wider transition-colors"
                          style={{ padding: '6px 14px', border: '1px solid rgba(255,92,0,0.3)', borderRadius: '2px', color: '#FF5C00', background: 'rgba(255,92,0,0.06)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,92,0,0.12)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,92,0,0.06)'}
                        >
                          <Trash2 size={12} /> <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded exercise details */}
                  {isExpanded && (
                    <div
                      className="px-4 md:px-5 pb-4 animate-slide-up"
                      style={{ borderTop: '1px solid rgba(204,255,0,0.1)' }}
                    >
                      <p className="ft-label mt-4 mb-3">// Exercises</p>
                      {session.exercises && session.exercises.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {session.exercises.map((exercise, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between px-3 py-2"
                              style={{ background: 'rgba(204,255,0,0.03)', border: '1px solid rgba(204,255,0,0.08)', borderRadius: '2px' }}
                            >
                              <span className="font-display font-bold italic uppercase text-sm text-white">{exercise.exerciseName}</span>
                              <div className="flex items-center gap-2">
                                {exercise.category && <span className="ft-badge-gray" style={{ fontSize: '10px' }}>{exercise.category}</span>}
                                {exercise.actualSets?.length > 0 && (
                                  <span className="font-mono-sport text-xs" style={{ color: '#CCFF00' }}>
                                    {exercise.actualSets.length} sets
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: '#555' }}>No exercises logged</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
