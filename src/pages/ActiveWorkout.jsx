import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { ArrowLeft, Check, X, CheckCircle2, Circle, Edit3, Search, Plus, Minus } from "lucide-react";

export default function ActiveWorkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [bodyMetrics, setBodyMetrics] = useState({ weight: "", bodyFat: "" });
  const [setInputs, setSetInputs] = useState({});
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchSession(); }, [id]);

  useEffect(() => {
    if (session && session.exercises) {
      const initialInputs = {};
      session.exercises.forEach((exercise, exIndex) => {
        initialInputs[exIndex] = {};
        const numSets = exercise.targetSets || (exercise.sets ? exercise.sets.length : 3);
        for (let setIndex = 0; setIndex < numSets; setIndex++) {
          const actualSet = exercise.actualSets?.find(s => s.setNumber === setIndex + 1);
          if (actualSet) {
            initialInputs[exIndex][setIndex] = { reps: actualSet.reps, weight: actualSet.weight };
          } else {
            initialInputs[exIndex][setIndex] = {
              reps: exercise.sets?.[setIndex]?.targetReps || exercise.targetReps || 0,
              weight: exercise.sets?.[setIndex]?.targetWeight || exercise.targetWeight || 0,
            };
          }
        }
      });
      setSetInputs(initialInputs);
    }
  }, [session]);

  const fetchSession = async () => {
    try {
      const response = await axiosClient.get(`/workout-sessions/${id}`);
      setSession(response.data);
      if (response.data.status === 'planned') {
        await axiosClient.patch(`/workout-sessions/${id}/start`);
      }
    } catch (error) {
      alert("Failed to load workout session");
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSetInputChange = (exerciseIndex, setIndex, field, value) => {
    setSetInputs(prev => ({
      ...prev,
      [exerciseIndex]: { ...prev[exerciseIndex], [setIndex]: { ...prev[exerciseIndex]?.[setIndex], [field]: value } }
    }));
  };

  const handleToggleSet = async (exerciseIndex, setIndex) => {
    const newSession = { ...session };
    const exercise = newSession.exercises[exerciseIndex];
    if (!exercise.actualSets) exercise.actualSets = [];
    const existingSetIndex = exercise.actualSets.findIndex(s => s.setNumber === setIndex + 1);
    if (existingSetIndex >= 0) {
      exercise.actualSets.splice(existingSetIndex, 1);
    } else {
      const inputValues = setInputs[exerciseIndex]?.[setIndex];
      exercise.actualSets.push({ setNumber: setIndex + 1, reps: inputValues?.reps || exercise.targetReps || 0, weight: inputValues?.weight || exercise.targetWeight || 0, completed: true });
    }
    setSession(newSession);
    try {
      await axiosClient.put(`/workout-sessions/${id}`, { exercises: newSession.exercises });
    } catch (error) {
      console.error("Error updating session:", error);
    }
  };

  const handleCompleteWorkout = () => setShowMetricsModal(true);
  const handleSkipMetrics = async () => await completeWorkoutSession();
  const handleSaveMetrics = async () => {
    try {
      const updates = {};
      if (bodyMetrics.weight) updates.weight = parseFloat(bodyMetrics.weight);
      if (bodyMetrics.bodyFat) updates.bodyFat = parseFloat(bodyMetrics.bodyFat);
      if (Object.keys(updates).length > 0) await axiosClient.post('/users/progress', updates);
      await completeWorkoutSession();
    } catch (error) {
      await completeWorkoutSession();
    }
  };

  const completeWorkoutSession = async () => {
    try {
      await axiosClient.patch(`/workout-sessions/${id}/complete`);
      if (session.weeklyScheduleId && session.dayOfWeek !== undefined) {
        try {
          await axiosClient.patch(`/weekly-schedules/${session.weeklyScheduleId}/complete-day`, {
            dayOfWeek: session.dayOfWeek,
            workoutData: { exercises: session.exercises }
          });
        } catch (error) { /* don't fail overall */ }
      }
      if (session.weeklyScheduleId) navigate('/weekly-schedule');
      else navigate('/dashboard');
    } catch (error) {
      alert("Failed to complete workout");
    }
  };

  const handleManageExercises = async () => {
    try {
      const response = await axiosClient.get('/exercises');
      setAvailableExercises(response.data);
      setShowExerciseModal(true);
    } catch (error) { alert("Failed to load exercises"); }
  };

  const handleAddExercise = (exercise) => {
    const updatedExercises = [...session.exercises];
    const existing = updatedExercises.find(ex => ex.exerciseId?.toString() === exercise._id || ex.exerciseName === exercise.name);
    if (existing) { alert("Exercise already added"); return; }
    updatedExercises.push({ exerciseId: exercise._id, exerciseName: exercise.name, category: exercise.category, targetSets: 3, targetReps: 10, targetWeight: 0, completed: false, actualSets: [] });
    setSession({ ...session, exercises: updatedExercises });
  };

  const handleRemoveExercise = (exerciseIndex) => {
    const updatedExercises = session.exercises.filter((_, idx) => idx !== exerciseIndex);
    setSession({ ...session, exercises: updatedExercises });
  };

  const handleUpdateSets = (exerciseIndex, change) => {
    const updatedExercises = [...session.exercises];
    updatedExercises[exerciseIndex].targetSets = Math.max(1, (updatedExercises[exerciseIndex].targetSets || 3) + change);
    setSession({ ...session, exercises: updatedExercises });
  };

  const handleSaveExercises = async () => {
    try {
      await axiosClient.put(`/workout-sessions/${id}`, { exercises: session.exercises });
      await fetchSession();
      setShowExerciseModal(false);
      setSearchQuery('');
    } catch (error) { alert("Failed to save exercises"); }
  };

  const isSetCompleted = (exercise, setIndex) => exercise.actualSets?.some(s => s.setNumber === setIndex + 1);
  const getExerciseProgress = (exercise) => {
    const completed = exercise.actualSets?.length || 0;
    const total = exercise.sets ? exercise.sets.length : (exercise.targetSets || 0);
    return `${completed}/${total}`;
  };
  const isExerciseComplete = (exercise) => {
    const total = exercise.sets ? exercise.sets.length : (exercise.targetSets || 0);
    return (exercise.actualSets?.length || 0) >= total;
  };

  if (loading) {
    return (
      <div className="ft-page min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="ft-loader mx-auto mb-4" />
          <p className="ft-label">Loading Workout...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const currentExercise = session.exercises[currentExerciseIndex];
  const totalExercises = session.exercises.length;
  const completedExercises = session.exercises.filter(ex => isExerciseComplete(ex)).length;
  const overallProgress = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  return (
    <div className="ft-page min-h-screen">
      {/* Header */}
      <div className="ft-header px-4 md:px-8 py-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-16 gap-4">
          <button
            id="back-btn"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 transition-colors group"
            style={{ color: '#A0A0A0' }}
            onMouseEnter={e => e.currentTarget.style.color = '#CCFF00'}
            onMouseLeave={e => e.currentTarget.style.color = '#A0A0A0'}
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          </button>

          <div className="text-center flex-1">
            <h1 className="ft-title text-lg md:text-2xl text-white leading-none">{session.name}</h1>
            <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>
              {completedExercises}/{totalExercises} exercises done
            </p>
          </div>

          <button
            id="manage-exercises-btn"
            onClick={handleManageExercises}
            className="ft-btn-secondary flex items-center gap-2 text-xs"
            style={{ padding: '7px 12px' }}
          >
            <Edit3 size={13} /> <span className="hidden sm:inline">Manage</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 w-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${overallProgress}%`, background: '#CCFF00', boxShadow: '0 0 6px rgba(204,255,0,0.6)' }}
          />
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-6">

        {/* Current exercise card */}
        <div
          className="mb-5 p-5 md:p-6 animate-slide-up"
          style={{ background: 'rgba(10,10,10,0.98)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: '2px' }}
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
            <div>
              <p className="ft-label mb-1">// Exercise {currentExerciseIndex + 1} of {totalExercises}</p>
              <h2 className="ft-title text-3xl md:text-4xl text-white">{currentExercise.exerciseName}</h2>
              <p className="text-xs mt-1" style={{ color: '#A0A0A0' }}>{currentExercise.category}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="font-mono-sport font-bold text-4xl leading-none" style={{ color: '#CCFF00', fontFamily: "'JetBrains Mono', monospace" }}>
                {getExerciseProgress(currentExercise)}
              </p>
              <p className="text-xs mt-1 ft-label">sets done</p>
            </div>
          </div>

          {/* Per-set targets */}
          {currentExercise.sets && currentExercise.sets.length > 0 && (
            <div
              className="mb-5 p-3 grid grid-cols-3 gap-2 text-xs"
              style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '2px' }}
            >
              {currentExercise.sets.map((set, idx) => (
                <div key={idx} className="text-center">
                  <p className="ft-label mb-0.5">S{set.setNumber}</p>
                  <p className="font-mono-sport" style={{ color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>
                    {set.targetReps}r @ {set.targetWeight}kg
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Sets checklist */}
          <div className="space-y-2.5">
            {Array.from({ length: currentExercise.targetSets || (currentExercise.sets ? currentExercise.sets.length : 3) }).map((_, index) => {
              const isCompleted = isSetCompleted(currentExercise, index);
              const inputValues = setInputs[currentExerciseIndex]?.[index] || { reps: 0, weight: 0 };
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 transition-all"
                  style={{
                    background: isCompleted ? 'rgba(204,255,0,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isCompleted ? 'rgba(204,255,0,0.3)' : '#111'}`,
                    borderRadius: '2px',
                  }}
                >
                  <button
                    onClick={() => handleToggleSet(currentExerciseIndex, index)}
                    className="flex-shrink-0 focus:outline-none"
                  >
                    {isCompleted
                      ? <CheckCircle2 size={20} style={{ color: '#CCFF00' }} />
                      : <Circle size={20} style={{ color: '#333' }} />
                    }
                  </button>

                  <span className="font-mono-sport text-xs w-10 flex-shrink-0" style={{ color: isCompleted ? '#CCFF00' : '#555', fontFamily: "'JetBrains Mono', monospace" }}>
                    S{index + 1}
                  </span>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <input
                      type="number"
                      value={inputValues.reps}
                      onChange={(e) => handleSetInputChange(currentExerciseIndex, index, 'reps', parseInt(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.stopPropagation()}
                      disabled={isCompleted}
                      className="ft-input w-14 text-center text-sm py-1.5 px-1 font-mono-sport"
                      style={{ fontFamily: "'JetBrains Mono', monospace", opacity: isCompleted ? 0.5 : 1 }}
                    />
                    <span className="text-xs" style={{ color: '#555' }}>reps</span>
                    <span className="text-xs" style={{ color: '#333' }}>@</span>
                    <input
                      type="number"
                      step="0.5"
                      value={inputValues.weight}
                      onChange={(e) => handleSetInputChange(currentExerciseIndex, index, 'weight', parseFloat(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.stopPropagation()}
                      disabled={isCompleted}
                      className="ft-input w-14 text-center text-sm py-1.5 px-1 font-mono-sport"
                      style={{ fontFamily: "'JetBrains Mono', monospace", opacity: isCompleted ? 0.5 : 1 }}
                    />
                    <span className="text-xs" style={{ color: '#555' }}>kg</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Prev / Next */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              id="prev-exercise-btn"
              onClick={() => setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))}
              disabled={currentExerciseIndex === 0}
              className="ft-btn-ghost py-3 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              id="next-exercise-btn"
              onClick={() => setCurrentExerciseIndex(Math.min(totalExercises - 1, currentExerciseIndex + 1))}
              disabled={currentExerciseIndex === totalExercises - 1}
              className="ft-btn-ghost py-3 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Exercise overview */}
        <div
          className="mb-5 p-5 animate-slide-up"
          style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2px' }}
        >
          <p className="ft-label mb-3">// All Exercises</p>
          <div className="space-y-1.5">
            {session.exercises.map((exercise, index) => {
              const isComplete = isExerciseComplete(exercise);
              const isCurrent = index === currentExerciseIndex;
              return (
                <button
                  key={index}
                  onClick={() => setCurrentExerciseIndex(index)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between transition-all"
                  style={{
                    background: isCurrent ? 'rgba(204,255,0,0.08)' : isComplete ? 'rgba(204,255,0,0.04)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isCurrent ? 'rgba(204,255,0,0.4)' : isComplete ? 'rgba(204,255,0,0.15)' : '#111'}`,
                    borderRadius: '2px',
                  }}
                >
                  <div className="flex items-center gap-3">
                    {isComplete
                      ? <CheckCircle2 size={16} style={{ color: '#CCFF00', flexShrink: 0 }} />
                      : <Circle size={16} style={{ color: isCurrent ? '#CCFF00' : '#333', flexShrink: 0 }} />
                    }
                    <div>
                      <p className="font-display font-bold italic uppercase text-sm text-white leading-none">{exercise.exerciseName}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#555' }}>{exercise.category}</p>
                    </div>
                  </div>
                  <span className="font-mono-sport text-xs" style={{ color: isComplete ? '#CCFF00' : '#555', fontFamily: "'JetBrains Mono', monospace" }}>
                    {getExerciseProgress(exercise)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Complete button */}
        <button
          id="complete-workout-btn"
          onClick={handleCompleteWorkout}
          className="ft-btn-primary w-full py-4 flex items-center justify-center gap-2 text-base animate-slide-up"
        >
          <Check size={18} /> Complete Workout
        </button>
      </main>

      {/* Body Metrics Modal */}
      {showMetricsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm p-6"
            style={{ background: '#050505', border: '1px solid rgba(204,255,0,0.2)', borderRadius: '2px' }}
          >
            <h2 className="ft-title text-2xl text-white mb-1">Update Body Metrics</h2>
            <p className="text-sm mb-5" style={{ color: '#A0A0A0' }}>Track your progress! (Optional)</p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="ft-label">Weight (kg)</label>
                <input type="number" step="0.1" placeholder="Current weight" value={bodyMetrics.weight}
                  onChange={(e) => setBodyMetrics({ ...bodyMetrics, weight: e.target.value })} className="ft-input" />
              </div>
              <div>
                <label className="ft-label">Body Fat (%)</label>
                <input type="number" step="0.1" placeholder="Body fat percentage" value={bodyMetrics.bodyFat}
                  onChange={(e) => setBodyMetrics({ ...bodyMetrics, bodyFat: e.target.value })} className="ft-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleSkipMetrics} className="ft-btn-ghost py-3 text-xs">Skip</button>
              <button onClick={handleSaveMetrics} className="ft-btn-primary py-3 text-xs">Save & Complete</button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Management Modal */}
      {showExerciseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            style={{ background: '#050505', border: '1px solid rgba(204,255,0,0.2)', borderRadius: '2px' }}
          >
            <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(204,255,0,0.1)' }}>
              <div>
                <h2 className="ft-title text-2xl text-white">Manage Exercises</h2>
                <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>Add or remove exercises from your workout</p>
              </div>
              <button onClick={() => setShowExerciseModal(false)} style={{ color: '#A0A0A0' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#A0A0A0'}>
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid md:grid-cols-2 gap-5">
                {/* Available */}
                <div>
                  <p className="ft-label mb-3">// Available Exercises</p>
                  <div className="relative mb-3">
                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                    <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className="ft-input" style={{ paddingLeft: '32px' }} />
                  </div>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {availableExercises.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || ex.category.toLowerCase().includes(searchQuery.toLowerCase())).map((exercise, idx) => (
                      <div key={exercise._id || idx} className="flex items-center justify-between px-4 py-3 transition-all"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #111', borderRadius: '2px' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(204,255,0,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#111'}
                      >
                        <div>
                          <p className="font-display font-bold italic uppercase text-sm text-white">{exercise.name}</p>
                          <p className="text-xs" style={{ color: '#555' }}>{exercise.category}</p>
                        </div>
                        <button onClick={() => handleAddExercise(exercise)} className="ft-btn-primary text-xs" style={{ padding: '5px 12px' }}>Add</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Current */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="ft-label mb-0">// Current Exercises</p>
                    <span className="font-mono-sport text-xs" style={{ color: '#CCFF00', fontFamily: "'JetBrains Mono', monospace" }}>{session.exercises.length}</span>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {session.exercises.length === 0
                      ? <p className="text-center py-10 ft-label">No exercises</p>
                      : session.exercises.map((exercise, index) => (
                        <div key={index} className="p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #111', borderRadius: '2px' }}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-display font-bold italic uppercase text-sm text-white">{exercise.exerciseName}</p>
                              <p className="text-xs" style={{ color: '#555' }}>{exercise.category}</p>
                            </div>
                            <button onClick={() => handleRemoveExercise(index)} style={{ color: '#FF5C00', padding: '4px 8px', fontSize: '11px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(255,92,0,0.3)', borderRadius: '2px' }}>
                              Remove
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-2 px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '2px' }}>
                            <span className="text-xs ft-label mb-0">Sets:</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleUpdateSets(index, -1)} className="w-6 h-6 flex items-center justify-center transition-colors" style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: '2px', color: '#A0A0A0' }}>
                                <Minus size={10} />
                              </button>
                              <span className="font-mono-sport font-bold text-sm w-6 text-center" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#CCFF00' }}>{exercise.targetSets || 3}</span>
                              <button onClick={() => handleUpdateSets(index, 1)} className="w-6 h-6 flex items-center justify-center transition-colors" style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: '2px', color: '#A0A0A0' }}>
                                <Plus size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(204,255,0,0.1)' }}>
              <button onClick={() => setShowExerciseModal(false)} className="ft-btn-ghost px-6 py-2.5 text-xs">Cancel</button>
              <button onClick={handleSaveExercises} className="ft-btn-primary px-6 py-2.5 text-xs">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
