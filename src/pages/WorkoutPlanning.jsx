import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { ArrowLeft, Search, Save, Plus, Trash2, CheckCircle2 } from "lucide-react";
import ErrorBoundary from "../components/ErrorBoundary";

// Muscle group data (icons kept, colors removed)
import chestIcon from "../assets/icons/muscle/chest.png";
import shouldersIcon from "../assets/icons/muscle/shoulders.png";
import bicepsIcon from "../assets/icons/muscle/biceps.png";
import tricepsIcon from "../assets/icons/muscle/triceps.png";
import latsIcon from "../assets/icons/muscle/lats.png";
import middleBackIcon from "../assets/icons/muscle/middleback.png";
import lowerBackIcon from "../assets/icons/muscle/lowerback.png";
import trapsIcon from "../assets/icons/muscle/trap.png";
import absIcon from "../assets/icons/muscle/abdo.png";
import quadsIcon from "../assets/icons/muscle/quads.png";
import hamstringsIcon from "../assets/icons/muscle/hamstrings.png";
import glutesIcon from "../assets/icons/muscle/glutes.png";
import calvesIcon from "../assets/icons/muscle/calves.png";
import forearmsIcon from "../assets/icons/muscle/forearms.png";

const muscleGroupData = [
  { id: 'chest', name: 'Chest', icon: chestIcon },
  { id: 'shoulders', name: 'Shoulders', icon: shouldersIcon },
  { id: 'biceps', name: 'Biceps', icon: bicepsIcon },
  { id: 'triceps', name: 'Triceps', icon: tricepsIcon },
  { id: 'lats', name: 'Lats', icon: latsIcon },
  { id: 'middle_back', name: 'Middle Back', icon: middleBackIcon },
  { id: 'lower_back', name: 'Lower Back', icon: lowerBackIcon },
  { id: 'traps', name: 'Traps', icon: trapsIcon },
  { id: 'abdominals', name: 'Abdominals', icon: absIcon },
  { id: 'quadriceps', name: 'Quadriceps', icon: quadsIcon },
  { id: 'hamstrings', name: 'Hamstrings', icon: hamstringsIcon },
  { id: 'glutes', name: 'Glutes', icon: glutesIcon },
  { id: 'calves', name: 'Calves', icon: calvesIcon },
  { id: 'forearms', name: 'Forearms', icon: forearmsIcon },
];

// Step indicator
function StepIndicator({ current, total = 2 }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <React.Fragment key={step}>
          <div
            className="w-7 h-7 flex items-center justify-center font-mono-sport font-bold text-xs transition-all"
            style={{
              background: current >= step ? '#CCFF00' : 'rgba(255,255,255,0.05)',
              color: current >= step ? '#000' : '#555',
              border: `1px solid ${current >= step ? '#CCFF00' : '#1A1A1A'}`,
              borderRadius: '2px',
              boxShadow: current >= step ? '0 0 8px rgba(204,255,0,0.4)' : 'none',
            }}
          >
            {step}
          </div>
          {step < total && (
            <div
              className="w-8 h-0.5 transition-all"
              style={{ background: current > step ? '#CCFF00' : '#1A1A1A' }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function WorkoutPlanningContent() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [workoutName, setWorkoutName] = useState("");
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState([]);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [workoutExercises, setWorkoutExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchExercisesForSelectedGroups = useCallback(async () => {
    setLoading(true);
    try {
      const allExercises = [];
      for (const group of selectedMuscleGroups) {
        const response = await axiosClient.get(`/exercises/category/${group.id}`);
        allExercises.push(...response.data);
      }
      setAvailableExercises(allExercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMuscleGroups]);

  useEffect(() => {
    if (step === 2 && selectedMuscleGroups.length > 0) fetchExercisesForSelectedGroups();
  }, [step, fetchExercisesForSelectedGroups]);

  const handleMuscleGroupToggle = (group) => {
    const isSelected = selectedMuscleGroups.find(g => g.id === group.id);
    if (isSelected) setSelectedMuscleGroups(selectedMuscleGroups.filter(g => g.id !== group.id));
    else setSelectedMuscleGroups([...selectedMuscleGroups, group]);
  };

  const handleAddExercise = (exercise) => {
    if (workoutExercises.find(ex => ex.exerciseId === exercise.id)) return;
    setWorkoutExercises([...workoutExercises, {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      category: exercise.category,
      sets: [
        { setNumber: 1, targetReps: 10, targetWeight: 0 },
        { setNumber: 2, targetReps: 10, targetWeight: 0 },
        { setNumber: 3, targetReps: 10, targetWeight: 0 },
      ],
    }]);
  };

  const handleRemoveExercise = (index) => {
    const newExercises = [...workoutExercises];
    newExercises.splice(index, 1);
    setWorkoutExercises(newExercises);
  };

  const handleSetChange = (exerciseIndex, setIndex, field, value) => {
    const newExercises = [...workoutExercises];
    newExercises[exerciseIndex].sets[setIndex][field] = parseFloat(value) || 0;
    setWorkoutExercises(newExercises);
  };

  const handleAddSet = (exerciseIndex) => {
    const newExercises = [...workoutExercises];
    const exercise = newExercises[exerciseIndex];
    const lastSet = exercise.sets[exercise.sets.length - 1] || { targetReps: 10, targetWeight: 0 };
    newExercises[exerciseIndex].sets.push({ setNumber: exercise.sets.length + 1, targetReps: lastSet.targetReps, targetWeight: lastSet.targetWeight });
    setWorkoutExercises(newExercises);
  };

  const handleRemoveSet = (exerciseIndex, setIndex) => {
    const newExercises = [...workoutExercises];
    if (newExercises[exerciseIndex].sets.length > 1) {
      newExercises[exerciseIndex].sets.splice(setIndex, 1);
      newExercises[exerciseIndex].sets.forEach((set, idx) => { set.setNumber = idx + 1; });
      setWorkoutExercises(newExercises);
    }
  };

  const handleNextToExercises = () => {
    if (!workoutName.trim()) { alert("Please enter a workout name"); return; }
    if (selectedMuscleGroups.length === 0) { alert("Please select at least one muscle group"); return; }
    setStep(2);
  };

  const handleSaveWorkout = async () => {
    if (workoutExercises.length === 0) { alert("Please add at least one exercise"); return; }
    setLoading(true);
    try {
      await axiosClient.post('/workout-sessions', { name: workoutName, exercises: workoutExercises, notes: "" });
      navigate('/dashboard');
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save workout");
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = availableExercises.filter(ex =>
    ex.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="ft-page min-h-screen">
      {/* Header */}
      <div className="ft-header px-4 md:px-8 py-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 gap-4">
          <button
            id="back-btn"
            onClick={() => { if (step > 1) setStep(step - 1); else navigate("/dashboard"); }}
            className="flex items-center gap-2 transition-colors group"
            style={{ color: '#A0A0A0' }}
            onMouseEnter={e => e.currentTarget.style.color = '#CCFF00'}
            onMouseLeave={e => e.currentTarget.style.color = '#A0A0A0'}
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="hidden md:inline font-display font-bold uppercase tracking-widest text-xs">
              {step === 1 ? 'Dashboard' : 'Back'}
            </span>
          </button>

          <StepIndicator current={step} />

          <div className="w-20 hidden md:block" />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">

        {/* ── STEP 1: Name + Muscle Groups ── */}
        {step === 1 && (
          <div className="animate-slide-up">
            <p className="ft-label mb-1">// Step 1 of 2</p>
            <h1 className="ft-title text-4xl md:text-5xl text-white mb-1">Create Workout</h1>
            <p className="text-sm mb-8" style={{ color: '#A0A0A0' }}>Name your workout and select target muscle groups</p>

            {/* Workout Name */}
            <div
              className="p-5 mb-8"
              style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: '2px' }}
            >
              <label className="ft-label">Workout Name</label>
              <input
                id="workout-name-input"
                type="text"
                placeholder="e.g. Push Day A, Full Body Strength, Leg Day..."
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                className="ft-input text-lg"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic', fontWeight: 700 }}
              />
            </div>

            {/* Muscle Groups */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <p className="ft-label">// Select Muscle Groups</p>
                <span className="font-mono-sport text-xs" style={{ color: '#CCFF00', fontFamily: "'JetBrains Mono', monospace" }}>
                  {selectedMuscleGroups.length} selected
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {muscleGroupData.map((group) => {
                  const isSelected = !!selectedMuscleGroups.find(g => g.id === group.id);
                  return (
                    <button
                      key={group.id}
                      id={`muscle-${group.id}`}
                      onClick={() => handleMuscleGroupToggle(group)}
                      className="relative aspect-square flex flex-col items-center justify-center p-4 transition-all"
                      style={{
                        background: isSelected ? 'rgba(204,255,0,0.1)' : 'rgba(10,10,10,0.95)',
                        border: `1px solid ${isSelected ? '#CCFF00' : '#1A1A1A'}`,
                        borderRadius: '2px',
                        boxShadow: isSelected ? '0 0 12px rgba(204,255,0,0.3)' : 'none',
                        transform: isSelected ? 'translateY(-2px)' : 'none',
                      }}
                    >
                      <img src={group.icon} alt={group.name} className="w-10 h-10 object-contain mb-2"
                        style={{ filter: isSelected ? 'none' : 'grayscale(0.4) brightness(0.7)' }}
                      />
                      <span
                        className="font-display font-bold uppercase text-xs text-center leading-tight"
                        style={{ color: isSelected ? '#CCFF00' : '#A0A0A0' }}
                      >
                        {group.name}
                      </span>
                      {isSelected && (
                        <div
                          className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center"
                          style={{ background: '#CCFF00', borderRadius: '50%' }}
                        >
                          <CheckCircle2 size={10} style={{ color: '#000' }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              id="next-step-btn"
              onClick={handleNextToExercises}
              disabled={!workoutName.trim() || selectedMuscleGroups.length === 0}
              className="ft-btn-primary w-full py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next: Add Exercises →
            </button>
          </div>
        )}

        {/* ── STEP 2: Exercise Selection ── */}
        {step === 2 && (
          <div className="animate-slide-up">
            <p className="ft-label mb-1">// Step 2 of 2</p>
            <h1 className="ft-title text-3xl md:text-4xl text-white mb-1">{workoutName}</h1>
            <p className="text-sm mb-6" style={{ color: '#A0A0A0' }}>
              From: {selectedMuscleGroups.map(g => g.name).join(', ')}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Available exercises */}
              <div>
                <p className="ft-label mb-3">// Available Exercises</p>
                <div className="relative mb-3">
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                  <input
                    type="text"
                    placeholder="Search exercises..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ft-input"
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="ft-loader" />
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                    {filteredExercises.map((exercise) => {
                      const isAdded = !!workoutExercises.find(ex => ex.exerciseId === exercise.id);
                      return (
                        <button
                          key={exercise.id}
                          onClick={() => handleAddExercise(exercise)}
                          disabled={isAdded}
                          className="w-full px-4 py-3 text-left flex items-center justify-between transition-all"
                          style={{
                            background: isAdded ? 'rgba(204,255,0,0.04)' : 'rgba(10,10,10,0.9)',
                            border: `1px solid ${isAdded ? 'rgba(204,255,0,0.2)' : '#1A1A1A'}`,
                            borderRadius: '2px',
                            opacity: isAdded ? 0.6 : 1,
                            cursor: isAdded ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <div>
                            <p className="font-display font-bold italic uppercase text-sm text-white">{exercise.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#555' }}>{exercise.category} • {exercise.equipment}</p>
                          </div>
                          {isAdded
                            ? <CheckCircle2 size={16} style={{ color: '#CCFF00', flexShrink: 0 }} />
                            : <Plus size={16} style={{ color: '#A0A0A0', flexShrink: 0 }} />
                          }
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected exercises */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="ft-label">// Your Exercises</p>
                  <span className="font-mono-sport text-xs" style={{ color: '#CCFF00', fontFamily: "'JetBrains Mono', monospace" }}>
                    {workoutExercises.length} added
                  </span>
                </div>

                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {workoutExercises.length === 0 && (
                    <div
                      className="text-center py-16"
                      style={{ border: '1px dashed rgba(204,255,0,0.1)', borderRadius: '2px' }}
                    >
                      <p className="ft-label">No exercises added yet</p>
                      <p className="text-xs mt-1" style={{ color: '#555' }}>Select from the left panel</p>
                    </div>
                  )}
                  {workoutExercises.map((exercise, index) => (
                    <div
                      key={`exercise-${exercise.exerciseId}-${index}`}
                      className="p-4"
                      style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: '2px' }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-display font-black italic uppercase text-white">{exercise.exerciseName}</h3>
                          <p className="text-xs" style={{ color: '#A0A0A0' }}>{exercise.category}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveExercise(index)}
                          className="p-1.5 transition-colors"
                          style={{ color: '#FF5C00' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,92,0,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Sets config */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="ft-label mb-0">Sets</p>
                          <button
                            onClick={() => handleAddSet(index)}
                            className="flex items-center gap-1 text-xs font-display font-bold uppercase tracking-wider transition-colors"
                            style={{ color: '#CCFF00' }}
                          >
                            <Plus size={11} /> Add Set
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {exercise.sets.map((set, setIdx) => (
                            <div
                              key={setIdx}
                              className="flex items-center gap-2 px-3 py-2"
                              style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '2px' }}
                            >
                              <span className="font-mono-sport text-xs w-10" style={{ color: '#555', fontFamily: "'JetBrains Mono', monospace" }}>
                                S{set.setNumber}
                              </span>
                              <div className="flex-1">
                                <input
                                  type="number" min="1"
                                  value={set.targetReps}
                                  onChange={(e) => handleSetChange(index, setIdx, 'targetReps', e.target.value)}
                                  className="ft-input text-center text-xs py-1"
                                  style={{ paddingLeft: '4px', paddingRight: '4px' }}
                                  placeholder="Reps"
                                />
                                <p className="text-[9px] text-center mt-0.5" style={{ color: '#555' }}>reps</p>
                              </div>
                              <div className="flex-1">
                                <input
                                  type="number" min="0" step="0.5"
                                  value={set.targetWeight || ''}
                                  onChange={(e) => handleSetChange(index, setIdx, 'targetWeight', e.target.value)}
                                  className="ft-input text-center text-xs py-1"
                                  style={{ paddingLeft: '4px', paddingRight: '4px' }}
                                  placeholder="Weight"
                                />
                                <p className="text-[9px] text-center mt-0.5" style={{ color: '#555' }}>kg</p>
                              </div>
                              {exercise.sets.length > 1 && (
                                <button
                                  onClick={() => handleRemoveSet(index, setIdx)}
                                  className="p-1 transition-colors"
                                  style={{ color: '#FF5C00' }}
                                >
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

                {workoutExercises.length > 0 && (
                  <button
                    id="save-workout-btn"
                    onClick={handleSaveWorkout}
                    disabled={loading}
                    className="ft-btn-primary w-full mt-4 py-3.5 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Save size={16} />
                    {loading ? 'Saving...' : 'Save Workout Plan'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function WorkoutPlanning() {
  return (
    <ErrorBoundary>
      <WorkoutPlanningContent />
    </ErrorBoundary>
  );
}
