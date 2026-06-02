import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import {
  ArrowLeft, Play, CheckCircle2, Calendar as CalendarIcon,
  Edit2, RefreshCcw, X as XIcon, Save
} from "lucide-react";

export default function WeeklyCalendar() {
  const navigate = useNavigate();
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [swapSourceDay, setSwapSourceDay] = useState(null);
  const [editingWorkoutName, setEditingWorkoutName] = useState({});

  useEffect(() => { fetchCurrentSchedule(); }, []);

  const fetchCurrentSchedule = async () => {
    try {
      const response = await axiosClient.get('/weekly-schedules/current');
      setCurrentSchedule(response.data);
    } catch (error) {
      setCurrentSchedule(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkout = async (day) => {
    try {
      const response = await axiosClient.post('/workout-sessions', {
        name: day.workout.name,
        date: day.date,
        exercises: day.workout.exercises,
        status: 'planned',
        weeklyScheduleId: currentSchedule.id,
        dayOfWeek: day.dayOfWeek
      });
      navigate(`/workout/${response.data.sessionId}`);
    } catch (error) {
      alert("Failed to start workout");
    }
  };

  const handleCompleteWeek = async () => {
    if (!window.confirm("Mark this week as complete?")) return;
    try {
      await axiosClient.patch(`/weekly-schedules/${currentSchedule.id}/complete`);
      navigate('/weekly-plan-library');
    } catch (error) {
      alert("Failed to complete week");
    }
  };

  const handleDismissWeek = async () => {
    if (!window.confirm("Dismiss this weekly schedule?")) return;
    try {
      await axiosClient.patch(`/weekly-schedules/${currentSchedule.id}/complete`);
      navigate('/weekly-plan-library');
    } catch (error) {
      alert("Failed to dismiss week");
    }
  };

  const handleMarkComplete = async (day) => {
    try {
      await axiosClient.patch(`/weekly-schedules/${currentSchedule.id}/complete-day`, {
        dayOfWeek: day.dayOfWeek,
        workoutData: { exercises: [] }
      });
      const response = await axiosClient.get('/weekly-schedules/current');
      setCurrentSchedule(response.data);
    } catch (error) {
      alert("Failed to mark workout as complete");
    }
  };

  const handleSwapDays = async (day) => {
    if (!swapSourceDay) {
      setSwapSourceDay(day);
    } else {
      try {
        await axiosClient.patch(`/weekly-schedules/${currentSchedule.id}/update-day`, {
          action: 'swap',
          dayOfWeek: swapSourceDay.dayOfWeek,
          targetDayOfWeek: day.dayOfWeek
        });
        const response = await axiosClient.get('/weekly-schedules/current');
        setCurrentSchedule(response.data);
        setSwapSourceDay(null);
      } catch (error) {
        alert("Failed to swap days");
        setSwapSourceDay(null);
      }
    }
  };

  const handleToggleRestDay = async (day) => {
    const action = day.isRestDay ? 'Converting to workout day' : 'Converting to rest day';
    if (!window.confirm(`${action}?`)) return;
    try {
      await axiosClient.patch(`/weekly-schedules/${currentSchedule.id}/update-day`, {
        action: 'toggleRest',
        dayOfWeek: day.dayOfWeek
      });
      const response = await axiosClient.get('/weekly-schedules/current');
      setCurrentSchedule(response.data);
    } catch (error) {
      alert("Failed to toggle rest day");
    }
  };

  const cancelEditMode = () => { setEditMode(false); setSwapSourceDay(null); setEditingWorkoutName({}); };

  const saveAllChanges = async () => {
    const changesCount = Object.keys(editingWorkoutName).length;
    if (changesCount === 0) { setEditMode(false); return; }
    try {
      for (const dayOfWeek in editingWorkoutName) {
        const day = currentSchedule.days.find(d => d.dayOfWeek === parseInt(dayOfWeek));
        if (day && !day.isRestDay) await handleSaveWorkoutName(day);
      }
      setEditMode(false);
      setEditingWorkoutName({});
    } catch (error) {
      alert('Failed to save some changes');
    }
  };

  const handleWorkoutNameChange = (dayOfWeek, newName) => {
    setEditingWorkoutName(prev => ({ ...prev, [dayOfWeek]: newName }));
  };

  const handleSaveWorkoutName = async (day) => {
    const newName = editingWorkoutName[day.dayOfWeek];
    if (!newName || newName === day.workout?.name) {
      setEditingWorkoutName(prev => { const u = { ...prev }; delete u[day.dayOfWeek]; return u; });
      return;
    }
    try {
      await axiosClient.patch(`/weekly-schedules/${currentSchedule.id}/update-day`, {
        action: 'updateWorkoutName',
        dayOfWeek: day.dayOfWeek,
        workoutName: newName
      });
      await fetchCurrentSchedule();
      setEditingWorkoutName(prev => { const u = { ...prev }; delete u[day.dayOfWeek]; return u; });
    } catch (error) {
      alert('Failed to update workout name');
    }
  };

  const isToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    const dayDate = new Date(dateStr).toISOString().split('T')[0];
    return today === dayDate;
  };

  if (loading) {
    return (
      <div className="ft-page min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="ft-loader mx-auto mb-4" />
          <p className="ft-label">Loading Schedule...</p>
        </div>
      </div>
    );
  }

  if (!currentSchedule) {
    return (
      <div className="ft-page min-h-screen flex flex-col items-center justify-center px-4">
        <div
          className="text-center p-8 max-w-sm w-full animate-slide-up"
          style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: '2px' }}
        >
          <CalendarIcon size={40} style={{ color: '#1A1A1A', margin: '0 auto 16px' }} />
          <h2 className="ft-title text-2xl text-white mb-2">No Active Plan</h2>
          <p className="text-sm mb-6" style={{ color: '#A0A0A0' }}>You haven't started a weekly schedule yet.</p>
          <button onClick={() => navigate('/weekly-plan-library')} className="ft-btn-primary w-full mb-3">
            Create or Start a Plan
          </button>
          <button onClick={() => navigate('/dashboard')} className="ft-btn-ghost w-full text-xs">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const progressPct = Math.round((currentSchedule.completedDays / currentSchedule.totalWorkoutDays) * 100);

  return (
    <div className="ft-page min-h-screen">
      {/* Header */}
      <div className="ft-header px-4 md:px-8 py-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 gap-4">
          <button
            id="back-btn"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 transition-colors group"
            style={{ color: '#A0A0A0' }}
            onMouseEnter={e => e.currentTarget.style.color = '#CCFF00'}
            onMouseLeave={e => e.currentTarget.style.color = '#A0A0A0'}
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="hidden md:inline font-display font-bold uppercase tracking-widest text-xs">Dashboard</span>
          </button>

          <div className="text-center">
            <h1 className="ft-title text-xl md:text-2xl text-white leading-none">
              {currentSchedule.weeklyPlanName}
            </h1>
            <p className="text-xs mt-0.5 uppercase tracking-widest font-display font-bold" style={{ color: '#CCFF00' }}>
              Week {currentSchedule.weekNumber}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {editMode ? (
              Object.keys(editingWorkoutName).length > 0 ? (
                <button id="save-changes-btn" onClick={saveAllChanges} className="ft-btn-primary flex items-center gap-2 text-xs" style={{ padding: '7px 14px' }}>
                  <Save size={13} /> Save
                </button>
              ) : (
                <button id="cancel-edit-btn" onClick={cancelEditMode} className="ft-btn-ghost flex items-center gap-2 text-xs" style={{ padding: '7px 14px' }}>
                  <XIcon size={13} /> Cancel
                </button>
              )
            ) : (
              <button id="edit-btn" onClick={() => setEditMode(true)} className="ft-btn-secondary flex items-center gap-2 text-xs" style={{ padding: '7px 14px' }}>
                <Edit2 size={13} /> Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Progress bar */}
        <div
          className="mb-6 p-4 animate-slide-up"
          style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: '2px' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="ft-label mb-0">// Weekly Progress</p>
            <span className="font-mono-sport text-sm" style={{ color: '#CCFF00', fontFamily: "'JetBrains Mono', monospace" }}>
              {currentSchedule.completedDays} / {currentSchedule.totalWorkoutDays}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: '#CCFF00', boxShadow: '0 0 8px rgba(204,255,0,0.5)' }}
            />
          </div>
          <p className="text-xs mt-1 text-right" style={{ color: '#A0A0A0' }}>{progressPct}% complete</p>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
          {currentSchedule.days.map((day, index) => {
            const isTodayDay = isToday(day.date);
            const isCompleted = day.workout?.isCompleted;
            const isRest = day.isRestDay;

            const borderColor = isTodayDay
              ? '#CCFF00'
              : isCompleted
              ? 'rgba(204,255,0,0.3)'
              : 'rgba(255,255,255,0.06)';

            return (
              <div
                key={index}
                className="flex flex-col overflow-hidden animate-slide-up"
                style={{
                  background: 'rgba(10,10,10,0.95)',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '2px',
                  boxShadow: isTodayDay ? '0 0 16px rgba(204,255,0,0.2)' : 'none',
                  animationDelay: `${index * 0.04}s`,
                  animationFillMode: 'both',
                }}
              >
                {/* Day header */}
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{
                    background: isTodayDay ? 'rgba(204,255,0,0.08)' : 'rgba(255,255,255,0.02)',
                    borderBottom: `1px solid ${borderColor}`,
                  }}
                >
                  <span className="font-display font-black italic uppercase text-white text-base">{day.dayName}</span>
                  <div className="flex items-center gap-2">
                    {isTodayDay && <span className="ft-badge-lime" style={{ fontSize: '9px' }}>Today</span>}
                    <span className="text-xs font-mono-sport" style={{ color: '#A0A0A0' }}>
                      {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Day body */}
                <div className="p-4 flex-1 flex flex-col">
                  {isRest ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-6 gap-2">
                      <span style={{ fontSize: '1.5rem' }}>🛌</span>
                      <span className="ft-label text-center">Rest Day</span>
                      {editMode && (
                        <div className="mt-3 w-full space-y-2">
                          <button
                            onClick={() => handleSwapDays(day)}
                            className="w-full flex items-center justify-center gap-2 py-2 font-display font-bold uppercase tracking-wider text-xs transition-colors"
                            style={{
                              background: swapSourceDay?.dayOfWeek === day.dayOfWeek ? 'rgba(204,255,0,0.2)' : 'rgba(204,255,0,0.06)',
                              border: '1px solid rgba(204,255,0,0.3)',
                              borderRadius: '2px',
                              color: '#CCFF00',
                            }}
                          >
                            <RefreshCcw size={12} />
                            {swapSourceDay?.dayOfWeek === day.dayOfWeek ? 'Selected' : swapSourceDay ? 'Swap Here' : 'Swap Day'}
                          </button>
                          <button
                            onClick={() => handleToggleRestDay(day)}
                            className="w-full py-2 font-display font-bold uppercase tracking-wider text-xs transition-colors"
                            style={{ background: 'rgba(255,92,0,0.06)', border: '1px solid rgba(255,92,0,0.3)', borderRadius: '2px', color: '#FF5C00' }}
                          >
                            Make Workout Day
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col">
                      {editMode ? (
                        <input
                          type="text"
                          value={editingWorkoutName[day.dayOfWeek] ?? day.workout.name}
                          onChange={(e) => handleWorkoutNameChange(day.dayOfWeek, e.target.value)}
                          onBlur={() => handleSaveWorkoutName(day)}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                          className="ft-input font-display font-black italic uppercase text-lg mb-1"
                          placeholder="Workout name"
                        />
                      ) : (
                        <h3 className="font-display font-black italic uppercase text-white text-lg leading-tight mb-1">{day.workout.name}</h3>
                      )}
                      <p className="text-xs mb-4" style={{ color: '#A0A0A0' }}>
                        {day.workout.exercises?.length || 0} exercises
                      </p>

                      <div className="mt-auto">
                        {editMode ? (
                          <div className="space-y-2">
                            <button
                              onClick={() => handleSwapDays(day)}
                              className="w-full flex items-center justify-center gap-2 py-2.5 font-display font-bold uppercase tracking-wider text-xs transition-colors"
                              style={{
                                background: swapSourceDay?.dayOfWeek === day.dayOfWeek ? 'rgba(204,255,0,0.2)' : 'rgba(204,255,0,0.06)',
                                border: '1px solid rgba(204,255,0,0.3)',
                                borderRadius: '2px',
                                color: '#CCFF00',
                              }}
                            >
                              <RefreshCcw size={12} />
                              {swapSourceDay?.dayOfWeek === day.dayOfWeek ? 'Selected' : swapSourceDay ? 'Swap Here' : 'Swap Day'}
                            </button>
                            <button
                              onClick={() => handleToggleRestDay(day)}
                              className="w-full py-2.5 font-display font-bold uppercase tracking-wider text-xs transition-colors"
                              style={{ background: 'rgba(255,92,0,0.06)', border: '1px solid rgba(255,92,0,0.3)', borderRadius: '2px', color: '#FF5C00' }}
                            >
                              Make Rest Day
                            </button>
                          </div>
                        ) : isCompleted ? (
                          <div
                            className="flex items-center justify-center gap-2 w-full py-2.5 font-display font-bold uppercase tracking-wider text-xs"
                            style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.3)', borderRadius: '2px', color: '#CCFF00' }}
                          >
                            <CheckCircle2 size={13} /> Completed
                          </div>
                        ) : day.workout.exercises?.length > 0 ? (
                          <button
                            onClick={() => handleStartWorkout(day)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 font-display font-bold uppercase tracking-wider text-xs transition-colors"
                            style={{
                              background: isTodayDay ? '#CCFF00' : 'rgba(204,255,0,0.06)',
                              border: isTodayDay ? 'none' : '1px solid rgba(204,255,0,0.3)',
                              borderRadius: '2px',
                              color: isTodayDay ? '#000' : '#CCFF00',
                              boxShadow: isTodayDay ? '0 0 12px rgba(204,255,0,0.4)' : 'none',
                            }}
                          >
                            <Play size={12} /> Start Workout
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkComplete(day)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 font-display font-bold uppercase tracking-wider text-xs transition-colors"
                            style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.3)', borderRadius: '2px', color: '#CCFF00' }}
                          >
                            <CheckCircle2 size={12} /> Mark Complete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom actions */}
        {!editMode && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-slide-up">
            <button
              id="dismiss-week-btn"
              onClick={handleDismissWeek}
              className="ft-btn-ghost flex items-center justify-center gap-2 px-8 py-3 text-xs"
            >
              <XIcon size={14} /> Dismiss Week
            </button>
            <button
              id="complete-week-btn"
              onClick={handleCompleteWeek}
              className="ft-btn-primary flex items-center justify-center gap-2 px-8 py-3 text-xs"
            >
              <CheckCircle2 size={14} /> Complete Week
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
