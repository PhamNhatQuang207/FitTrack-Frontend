import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { ArrowLeft, Save, Plus, Trash2, X, Check, Search, Trash, ChevronDown } from "lucide-react";
import ErrorBoundary from "../components/ErrorBoundary";

const DAYS = [
  { id: 0, name: 'Monday' }, { id: 1, name: 'Tuesday' }, { id: 2, name: 'Wednesday' },
  { id: 3, name: 'Thursday' }, { id: 4, name: 'Friday' }, { id: 5, name: 'Saturday' }, { id: 6, name: 'Sunday' }
];

const MUSCLE_GROUPS = [
  { id: 'abdominals', name: 'Abdominals' }, { id: 'biceps', name: 'Biceps' },
  { id: 'calves', name: 'Calves' }, { id: 'chest', name: 'Chest' },
  { id: 'forearms', name: 'Forearms' }, { id: 'glutes', name: 'Glutes' },
  { id: 'hamstrings', name: 'Hamstrings' }, { id: 'lats', name: 'Lats' },
  { id: 'lower_back', name: 'Lower Back' }, { id: 'middle_back', name: 'Middle Back' },
  { id: 'quadriceps', name: 'Quadriceps' }, { id: 'shoulders', name: 'Shoulders' },
  { id: 'traps', name: 'Traps' }, { id: 'triceps', name: 'Triceps' }
];

function WeeklyPlanBuilderContent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [planName, setPlanName] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState(
    DAYS.map(day => ({ ...day, isRestDay: false, workout: { name: "", exercises: [] } }))
  );
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(null);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("all");
  const [showMuscleGroupDropdown, setShowMuscleGroupDropdown] = useState(false);

  const loadPlan = useCallback(async (planId) => {
    setLoading(true);
    try {
      const response = await axiosClient.get(`/weekly-plans/${planId}`);
      const plan = response.data;
      setPlanName(plan.name);
      setDescription(plan.description || "");
      const loadedSchedule = DAYS.map(day => {
        const planDay = plan.days.find(d => d.dayOfWeek === day.id);
        if (planDay && planDay.workout && planDay.workout.exercises) {
          const normalizedExercises = planDay.workout.exercises.map(ex => {
            if (ex.sets && Array.isArray(ex.sets)) return ex;
            if (ex.targetSets && ex.targetReps !== undefined) {
              const sets = [];
              for (let i = 1; i <= ex.targetSets; i++) sets.push({ setNumber: i, targetReps: ex.targetReps, targetWeight: ex.targetWeight || 0 });
              return { ...ex, sets };
            }
            return { ...ex, sets: [{ setNumber: 1, targetReps: 10, targetWeight: 0 }, { setNumber: 2, targetReps: 10, targetWeight: 0 }, { setNumber: 3, targetReps: 10, targetWeight: 0 }] };
          });
          return { ...day, isRestDay: planDay.isRestDay, workout: { ...planDay.workout, exercises: normalizedExercises } };
        }
        return { ...day, isRestDay: false, workout: { name: "", exercises: [] } };
      });
      setSchedule(loadedSchedule);
      setIsEditMode(true);
    } catch (error) {
      alert("Failed to load plan");
      navigate('/weekly-plan-library');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { if (id) loadPlan(id); }, [id, loadPlan]);

  const fetchExercises = useCallback(async () => {
    try {
      const url = selectedMuscleGroup === 'all' ? '/exercises' : `/exercises/category/${selectedMuscleGroup}`;
      const response = await axiosClient.get(url);
      setAvailableExercises(response.data);
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMuscleGroup]);

  useEffect(() => { if (showExerciseModal) fetchExercises(); }, [showExerciseModal, fetchExercises]);

  const handleDayUpdate = (index, field, value) => {
    const newSchedule = [...schedule];
    if (field === 'isRestDay') {
      newSchedule[index].isRestDay = value;
      if (value) { newSchedule[index].workout.name = "Rest Day"; newSchedule[index].workout.exercises = []; }
      else if (newSchedule[index].workout.name === "Rest Day") newSchedule[index].workout.name = "";
    } else if (field === 'workoutName') {
      newSchedule[index].workout.name = value;
    }
    setSchedule(newSchedule);
  };

  const handleConfigureDay = (dayIndex) => { setActiveDayIndex(dayIndex); setShowExerciseModal(true); setSearchTerm(""); setSelectedMuscleGroup("all"); };

  const handleAddExercise = (exercise) => {
    const newSchedule = [...schedule];
    const dayExercises = newSchedule[activeDayIndex].workout.exercises;
    if (dayExercises.find(ex => ex.exerciseId === exercise.id)) { alert("Exercise already added"); return; }
    dayExercises.push({ exerciseId: exercise.id, exerciseName: exercise.name, category: exercise.category, sets: [{ setNumber: 1, targetReps: 10, targetWeight: 0 }, { setNumber: 2, targetReps: 10, targetWeight: 0 }, { setNumber: 3, targetReps: 10, targetWeight: 0 }] });
    setSchedule(newSchedule);
  };

  const handleRemoveExercise = (exerciseId) => {
    const newSchedule = [...schedule];
    newSchedule[activeDayIndex].workout.exercises = newSchedule[activeDayIndex].workout.exercises.filter(ex => ex.exerciseId !== exerciseId);
    setSchedule(newSchedule);
  };

  const handleSetChange = (exerciseId, setIndex, field, value) => {
    const newSchedule = [...schedule];
    const exercise = newSchedule[activeDayIndex].workout.exercises.find(ex => ex.exerciseId === exerciseId);
    if (exercise && exercise.sets) { exercise.sets[setIndex][field] = parseFloat(value) || 0; setSchedule(newSchedule); }
  };

  const handleAddSet = (exerciseId) => {
    const newSchedule = [...schedule];
    const exercise = newSchedule[activeDayIndex].workout.exercises.find(ex => ex.exerciseId === exerciseId);
    if (exercise && exercise.sets) {
      const lastSet = exercise.sets[exercise.sets.length - 1] || { targetReps: 10, targetWeight: 0 };
      exercise.sets.push({ setNumber: exercise.sets.length + 1, targetReps: lastSet.targetReps, targetWeight: lastSet.targetWeight });
      setSchedule(newSchedule);
    }
  };

  const handleRemoveSet = (exerciseId, setIndex) => {
    const newSchedule = [...schedule];
    const exercise = newSchedule[activeDayIndex].workout.exercises.find(ex => ex.exerciseId === exerciseId);
    if (exercise && exercise.sets && exercise.sets.length > 1) {
      exercise.sets.splice(setIndex, 1);
      exercise.sets.forEach((set, idx) => { set.setNumber = idx + 1; });
      setSchedule(newSchedule);
    }
  };

  const handleSavePlan = async () => {
    if (!planName.trim()) { alert("Please enter a plan name"); return; }
    setLoading(true);
    try {
      const transformedDays = schedule.map(day => ({ dayOfWeek: day.id, dayName: day.name, isRestDay: day.isRestDay, workout: day.workout }));
      if (isEditMode && id) await axiosClient.put(`/weekly-plans/${id}`, { name: planName, description, days: transformedDays });
      else await axiosClient.post('/weekly-plans', { name: planName, description, days: transformedDays });
      navigate('/weekly-plan-library');
    } catch (error) {
      alert("Failed to save plan: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!window.confirm(`Delete "${planName}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await axiosClient.delete(`/weekly-plans/${id}`);
      navigate('/weekly-plan-library');
    } catch (error) {
      alert("Failed to delete plan");
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = availableExercises.filter(ex => ex.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const activeDay = activeDayIndex !== null ? schedule[activeDayIndex] : null;

  return (
    <div className="ft-page min-h-screen">
      {/* Header */}
      <div className="ft-header px-4 md:px-8 py-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-16 gap-4">
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

          <h1 className="ft-title text-xl md:text-2xl text-neon-lime">
            {isEditMode ? 'Edit Plan' : 'New Weekly Plan'}
          </h1>

          <div className="flex items-center gap-2">
            {isEditMode && (
              <button
                id="delete-plan-btn"
                onClick={handleDeletePlan}
                disabled={loading}
                className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-wider px-3 py-2 transition-colors disabled:opacity-50"
                style={{ border: '1px solid rgba(255,92,0,0.3)', borderRadius: '2px', color: '#FF5C00', background: 'rgba(255,92,0,0.06)' }}
              >
                <Trash size={13} /> <span className="hidden md:inline">Delete</span>
              </button>
            )}
            <button
              id="save-plan-btn"
              onClick={handleSavePlan}
              disabled={loading}
              className="ft-btn-primary flex items-center gap-2 text-xs disabled:opacity-50"
              style={{ padding: '8px 16px' }}
            >
              <Save size={13} /> <span className="hidden md:inline">{isEditMode ? 'Update Plan' : 'Save Plan'}</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {/* Plan info */}
        <div
          className="p-5 mb-6 animate-slide-up"
          style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: '2px' }}
        >
          <p className="ft-label mb-4">// Plan Details</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="ft-label">Plan Name</label>
              <input
                id="plan-name-input"
                type="text"
                placeholder="e.g. PPL Split, Push/Pull/Legs..."
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className="ft-input font-display font-bold italic uppercase"
              />
            </div>
            <div>
              <label className="ft-label">Description (Optional)</label>
              <input
                id="plan-desc-input"
                type="text"
                placeholder="Goal: Hypertrophy, Strength..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="ft-input"
              />
            </div>
          </div>
        </div>

        {/* Weekly schedule */}
        <p className="ft-label mb-3">// Weekly Schedule</p>
        <div className="space-y-3 animate-slide-up">
          {schedule.map((day, index) => (
            <div
              key={day.id}
              className="p-4 transition-all"
              style={{
                background: day.isRestDay ? 'rgba(5,5,5,0.8)' : 'rgba(10,10,10,0.95)',
                border: `1px solid ${day.isRestDay ? '#0D0D0D' : 'rgba(204,255,0,0.12)'}`,
                borderRadius: '2px',
              }}
            >
              <div className="flex flex-wrap items-center gap-4">
                {/* Day label */}
                <div
                  className="w-14 h-14 flex items-center justify-center flex-shrink-0 font-display font-black italic uppercase text-xs text-center leading-tight"
                  style={{
                    background: day.isRestDay ? 'rgba(255,255,255,0.03)' : 'rgba(204,255,0,0.08)',
                    border: `1px solid ${day.isRestDay ? '#111' : 'rgba(204,255,0,0.2)'}`,
                    borderRadius: '2px',
                    color: day.isRestDay ? '#333' : '#CCFF00',
                  }}
                >
                  {day.name.slice(0, 3)}
                </div>

                {/* Workout name input */}
                {!day.isRestDay && (
                  <input
                    type="text"
                    placeholder="Workout Name (e.g. Push Day)"
                    value={day.workout.name}
                    onChange={(e) => handleDayUpdate(index, 'workoutName', e.target.value)}
                    className="ft-input flex-1 font-display font-bold italic uppercase"
                    style={{ minWidth: '120px' }}
                  />
                )}

                {day.isRestDay && (
                  <span className="flex-1 font-display font-bold uppercase text-sm" style={{ color: '#333' }}>Rest Day</span>
                )}

                {/* Rest toggle */}
                <label
                  className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0"
                  htmlFor={`rest-toggle-${day.id}`}
                >
                  <div
                    className="w-5 h-5 flex items-center justify-center transition-colors"
                    style={{
                      background: day.isRestDay ? '#FF5C00' : 'transparent',
                      border: `1px solid ${day.isRestDay ? '#FF5C00' : '#333'}`,
                      borderRadius: '2px',
                    }}
                  >
                    {day.isRestDay && <Check size={12} style={{ color: '#fff' }} />}
                  </div>
                  <input
                    id={`rest-toggle-${day.id}`}
                    type="checkbox"
                    className="hidden"
                    checked={day.isRestDay}
                    onChange={(e) => handleDayUpdate(index, 'isRestDay', e.target.checked)}
                  />
                  <span className="text-xs font-display font-bold uppercase tracking-wider" style={{ color: '#555' }}>Rest</span>
                </label>

                {/* Configure button */}
                {!day.isRestDay && (
                  <button
                    id={`configure-day-${day.id}`}
                    onClick={() => handleConfigureDay(index)}
                    className="flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider px-3 py-2 transition-colors flex-shrink-0"
                    style={{ border: '1px solid rgba(204,255,0,0.3)', borderRadius: '2px', color: '#CCFF00', background: 'rgba(204,255,0,0.06)' }}
                  >
                    <Plus size={12} /> Exercises ({day.workout.exercises.length})
                  </button>
                )}
              </div>

              {/* Exercise badges */}
              {!day.isRestDay && day.workout.exercises.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 ml-[4.5rem]">
                  {day.workout.exercises.map((ex, idx) => (
                    <span key={idx} className="ft-badge-lime text-[10px]">{ex.exerciseName}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Exercise Modal */}
      {showExerciseModal && activeDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
            style={{ background: '#050505', border: '1px solid rgba(204,255,0,0.2)', borderRadius: '2px' }}
          >
            {/* Modal header */}
            <div
              className="p-5 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(204,255,0,0.1)' }}
            >
              <div>
                <h2 className="ft-title text-2xl text-white">
                  {activeDay.name} — {activeDay.workout.name || 'Configure Exercises'}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>Add and configure exercises for this day</p>
              </div>
              <button
                onClick={() => setShowExerciseModal(false)}
                className="p-2 transition-colors"
                style={{ color: '#A0A0A0' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = '#A0A0A0'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Available exercises */}
                <div>
                  <p className="ft-label mb-3">// Available Exercises</p>
                  <div className="space-y-2 mb-4">
                    <div className="relative">
                      <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                      <input
                        type="text"
                        placeholder="Search exercises..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="ft-input"
                        style={{ paddingLeft: '32px' }}
                      />
                    </div>
                    {/* Muscle group dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowMuscleGroupDropdown(!showMuscleGroupDropdown)}
                        className="ft-input w-full flex items-center justify-between cursor-pointer"
                      >
                        <span>{selectedMuscleGroup === 'all' ? 'All Muscle Groups' : MUSCLE_GROUPS.find(g => g.id === selectedMuscleGroup)?.name || 'Select Group'}</span>
                        <ChevronDown size={14} style={{ color: '#555', transform: showMuscleGroupDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>
                      {showMuscleGroupDropdown && (
                        <div
                          className="absolute z-50 w-full mt-1 max-h-56 overflow-y-auto"
                          style={{ background: '#0A0A0A', border: '1px solid rgba(204,255,0,0.2)', borderRadius: '2px' }}
                        >
                          {[{ id: 'all', name: 'All Muscle Groups' }, ...MUSCLE_GROUPS].map(group => (
                            <button
                              key={group.id}
                              onClick={() => { setSelectedMuscleGroup(group.id); setShowMuscleGroupDropdown(false); }}
                              className="w-full px-4 py-2.5 text-left text-sm font-display font-bold uppercase tracking-wider transition-colors"
                              style={{
                                color: selectedMuscleGroup === group.id ? '#CCFF00' : '#A0A0A0',
                                background: selectedMuscleGroup === group.id ? 'rgba(204,255,0,0.08)' : 'transparent',
                              }}
                            >
                              {group.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                    {filteredExercises.map(exercise => (
                      <button
                        key={exercise.id}
                        onClick={() => handleAddExercise(exercise)}
                        className="w-full px-4 py-3 text-left flex items-center justify-between transition-all"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #111', borderRadius: '2px' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(204,255,0,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#111'}
                      >
                        <div>
                          <p className="font-display font-bold italic uppercase text-sm text-white">{exercise.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#555' }}>{exercise.category}</p>
                        </div>
                        <Plus size={14} style={{ color: '#CCFF00', flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected exercises */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="ft-label mb-0">// Your Exercises</p>
                    <span className="font-mono-sport text-xs" style={{ color: '#CCFF00', fontFamily: "'JetBrains Mono', monospace" }}>
                      {activeDay.workout.exercises.length} added
                    </span>
                  </div>
                  {activeDay.workout.exercises.length === 0 ? (
                    <div className="text-center py-16" style={{ border: '1px dashed rgba(204,255,0,0.1)', borderRadius: '2px' }}>
                      <p className="ft-label">No exercises added</p>
                      <p className="text-xs mt-1" style={{ color: '#555' }}>Click exercises from the left</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {activeDay.workout.exercises.map((exercise) => (
                        <div key={exercise.exerciseId} className="p-4" style={{ background: 'rgba(204,255,0,0.04)', border: '1px solid rgba(204,255,0,0.12)', borderRadius: '2px' }}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-display font-black italic uppercase text-white text-sm">{exercise.exerciseName}</h3>
                              <p className="text-xs" style={{ color: '#A0A0A0' }}>{exercise.category}</p>
                            </div>
                            <button onClick={() => handleRemoveExercise(exercise.exerciseId)} className="p-1 transition-colors" style={{ color: '#FF5C00' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="ft-label mb-0">Sets</p>
                              <button onClick={() => handleAddSet(exercise.exerciseId)} className="flex items-center gap-1 text-xs font-display font-bold uppercase tracking-wider" style={{ color: '#CCFF00' }}>
                                <Plus size={11} /> Add Set
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {exercise.sets && exercise.sets.map((set, setIdx) => (
                                <div key={setIdx} className="flex items-center gap-2 px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '2px' }}>
                                  <span className="font-mono-sport text-xs w-8 flex-shrink-0" style={{ color: '#555', fontFamily: "'JetBrains Mono', monospace" }}>S{set.setNumber}</span>
                                  <div className="flex-1">
                                    <input type="number" min="1" value={set.targetReps} onChange={(e) => handleSetChange(exercise.exerciseId, setIdx, 'targetReps', e.target.value)} className="ft-input text-center text-xs py-1 px-1" placeholder="Reps" />
                                    <p className="text-[9px] text-center mt-0.5" style={{ color: '#555' }}>reps</p>
                                  </div>
                                  <div className="flex-1">
                                    <input type="number" min="0" step="0.5" value={set.targetWeight || ''} onChange={(e) => handleSetChange(exercise.exerciseId, setIdx, 'targetWeight', e.target.value)} className="ft-input text-center text-xs py-1 px-1" placeholder="kg" />
                                    <p className="text-[9px] text-center mt-0.5" style={{ color: '#555' }}>kg</p>
                                  </div>
                                  {exercise.sets.length > 1 && (
                                    <button onClick={() => handleRemoveSet(exercise.exerciseId, setIdx)} style={{ color: '#FF5C00' }}>
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="p-5 flex justify-end" style={{ borderTop: '1px solid rgba(204,255,0,0.1)' }}>
              <button onClick={() => setShowExerciseModal(false)} className="ft-btn-primary px-8 py-2.5 text-sm">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WeeklyPlanBuilder() {
  return <ErrorBoundary><WeeklyPlanBuilderContent /></ErrorBoundary>;
}
