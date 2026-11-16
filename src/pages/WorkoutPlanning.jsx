import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import axiosClient from "../api/axiosClient";
import { exerciseAPI, muscleGroupAPI } from "../api";
import { invalidateWorkoutAndAnalytics, queryKeys } from "../lib/queryClient";
import { ArrowLeft, Search, Save, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import ErrorBoundary from "../components/ErrorBoundary";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { getApiErrorMessage, getLocalizedExerciseName, getLocalizedField, getLocalizedMuscleGroupName } from "../utils/localize";

// Muscle group data (icons kept, colors removed)
import chestIcon from "../assets/icons/muscle/chest.png";
import shouldersIcon from "../assets/icons/muscle/shoulders.png";
import bicepsIcon from "../assets/icons/muscle/biceps.png";
import tricepsIcon from "../assets/icons/muscle/triceps.png";
import latsIcon from "../assets/icons/muscle/lats.png";
import lowerBackIcon from "../assets/icons/muscle/lowerback.png";
import trapsIcon from "../assets/icons/muscle/trap.png";
import absIcon from "../assets/icons/muscle/abdo.png";
import quadsIcon from "../assets/icons/muscle/quads.png";
import hamstringsIcon from "../assets/icons/muscle/hamstrings.png";
import glutesIcon from "../assets/icons/muscle/glutes.png";
import adductorIcon from "../assets/icons/muscle/adductor.png";
import calvesIcon from "../assets/icons/muscle/calves.png";
import forearmsIcon from "../assets/icons/muscle/forearms.png";

const DEFAULT_MUSCLE_GROUPS = [
  { id: 'chest', name: 'Chest', icon: chestIcon },
  { id: 'shoulders', name: 'Shoulders', icon: shouldersIcon },
  { id: 'biceps', name: 'Biceps', icon: bicepsIcon },
  { id: 'triceps', name: 'Triceps', icon: tricepsIcon },
  { id: 'lats', name: 'Lats', icon: latsIcon },
  { id: 'lower_back', name: 'Lower Back', icon: lowerBackIcon },
  { id: 'traps', name: 'Traps', icon: trapsIcon },
  { id: 'abdominals', name: 'Abdominals', icon: absIcon },
  { id: 'quadriceps', name: 'Quadriceps', icon: quadsIcon },
  { id: 'hamstrings', name: 'Hamstrings', icon: hamstringsIcon },
  { id: 'glutes', name: 'Glutes', icon: glutesIcon },
  { id: 'adductor', name: 'Adductor', icon: adductorIcon },
  { id: 'calves', name: 'Calves', icon: calvesIcon },
  { id: 'forearms', name: 'Forearms', icon: forearmsIcon },
];

const LOCAL_ICON_BY_SLUG = Object.fromEntries(DEFAULT_MUSCLE_GROUPS.map((g) => [g.id, g.icon]));

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
  const { t, i18n } = useTranslation(['workout', 'errors']);
  const lang = i18n.resolvedLanguage || 'en';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workoutNameInputRef = useRef(null);
  const workoutNameCardRef = useRef(null);
  const muscleGroupsSectionRef = useRef(null);
  const scrollLockRef = useRef({ until: 0, y: 0 });
  const [step, setStep] = useState(1);
  const [workoutName, setWorkoutName] = useState("");
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState([]);
  const [workoutExercises, setWorkoutExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorField, setErrorField] = useState(null);

  const { data: rawMuscleGroups } = useQuery({
    queryKey: queryKeys.muscleGroups,
    queryFn: muscleGroupAPI.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const muscleGroupData = useMemo(() => {
    if (!Array.isArray(rawMuscleGroups) || rawMuscleGroups.length === 0) {
      return DEFAULT_MUSCLE_GROUPS;
    }
    return rawMuscleGroups.map((g) => ({
      id: g.slug,
      name: g.name,
      translations: g.translations,
      icon: g.iconUrl || LOCAL_ICON_BY_SLUG[g.slug] || chestIcon,
    }));
  }, [rawMuscleGroups]);

  const exerciseQueries = useQueries({
    queries: selectedMuscleGroups.map((group) => ({
      queryKey: queryKeys.exercises.byCategory(group.id),
      queryFn: () => exerciseAPI.getByCategory(group.id),
      enabled: step === 2 && selectedMuscleGroups.length > 0,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const availableExercises = useMemo(
    () => exerciseQueries.flatMap((q) => (Array.isArray(q.data) ? q.data : [])),
    [exerciseQueries]
  );

  const exercisesLoading = exerciseQueries.some((q) => q.isLoading);

  const createWorkoutMutation = useMutation({
    mutationFn: (payload) => axiosClient.post('/workout-sessions', payload),
    onSuccess: async () => {
      await invalidateWorkoutAndAnalytics(queryClient);
      navigate('/dashboard');
    },
    onError: (error) => {
      setErrorMessage(getApiErrorMessage(error, t, t('workout:planning.errors.saveFailed')));
    },
  });

  const handleMuscleGroupToggle = (group) => {
    const isSelected = selectedMuscleGroups.find(g => g.id === group.id);
    if (isSelected) setSelectedMuscleGroups(selectedMuscleGroups.filter(g => g.id !== group.id));
    else {
      setSelectedMuscleGroups([...selectedMuscleGroups, group]);
      if (errorField === 'muscleGroups') {
        setErrorMessage("");
        setErrorField(null);
      }
    }
  };

  const handleAddExercise = (exercise) => {
    if (workoutExercises.find(ex => ex.exerciseId === exercise.id)) return;
    if (errorField === 'exercises') {
      setErrorMessage("");
      setErrorField(null);
    }
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

  // Guard against Chromium scrolling off-screen focused input back into view when IME commits on blur/click
  const restoreLockedScroll = useCallback(() => {
    const { until, y } = scrollLockRef.current;
    if (performance.now() < until && window.scrollY !== y) {
      window.scrollTo?.({ top: y, behavior: 'instant' });
    }
  }, []);

  const lockScrollIfInputOffscreen = useCallback(() => {
    const inputEl = workoutNameInputRef.current;
    if (!inputEl) return;
    const rect = inputEl.getBoundingClientRect();
    if (rect.top < 80) {
      scrollLockRef.current = { until: performance.now() + 450, y: window.scrollY };
      queueMicrotask(restoreLockedScroll);
    }
  }, [restoreLockedScroll]);

  const unlockScroll = useCallback(() => {
    scrollLockRef.current.until = 0;
  }, []);

  useEffect(() => {
    const handleScroll = () => restoreLockedScroll();
    const handleUserInput = (e) => {
      if (e.type === 'keydown' && (e.isComposing || e.key === 'Process')) return;
      unlockScroll();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleUserInput, { passive: true });
    window.addEventListener('touchstart', handleUserInput, { passive: true });
    window.addEventListener('keydown', handleUserInput, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleUserInput);
      window.removeEventListener('touchstart', handleUserInput);
      window.removeEventListener('keydown', handleUserInput);
    };
  }, [restoreLockedScroll, unlockScroll]);

  const handleNextToExercises = () => {
    unlockScroll();
    if (!workoutName.trim()) {
      setErrorMessage(t('workout:planning.errors.nameRequiredContinue'));
      setErrorField("workoutName");
      workoutNameInputRef.current?.focus({ preventScroll: true });
      requestAnimationFrame(() => {
        workoutNameCardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    if (selectedMuscleGroups.length === 0) {
      setErrorMessage(t('workout:planning.errors.muscleGroupRequired'));
      setErrorField("muscleGroups");
      requestAnimationFrame(() => {
        muscleGroupsSectionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    setErrorMessage("");
    setErrorField(null);
    setStep(2);
    window.scrollTo?.(0, 0);
  };

  const handleSaveWorkout = () => {
    if (!workoutName.trim()) {
      setStep(1);
      setErrorMessage(t('workout:planning.errors.nameRequiredSave'));
      setErrorField("workoutName");
      return;
    }
    if (workoutExercises.length === 0) {
      setErrorMessage(t('workout:planning.errors.exerciseRequiredSave'));
      setErrorField("exercises");
      return;
    }
    setErrorMessage("");
    setErrorField(null);
    createWorkoutMutation.mutate({ name: workoutName.trim(), exercises: workoutExercises, notes: "" });
  };

  const filteredExercises = availableExercises.filter(ex => {
    const q = searchTerm.toLowerCase();
    return (
      ex.name.toLowerCase().includes(q) ||
      (ex.translations?.vi?.name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="ft-page min-h-screen">
      {/* Header */}
      <div className="ft-header px-4 md:px-8 py-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 gap-4">
          <button
            id="back-btn"
            type="button"
            onClick={() => {
              if (step > 1) {
                unlockScroll();
                setStep(step - 1);
                setErrorMessage("");
                setErrorField(null);
                window.scrollTo?.({ top: 0, behavior: 'smooth' });
              } else {
                navigate("/dashboard");
              }
            }}
            className="flex items-center gap-2 transition-colors group"
            style={{ color: '#A0A0A0' }}
            onMouseEnter={e => e.currentTarget.style.color = '#CCFF00'}
            onMouseLeave={e => e.currentTarget.style.color = '#A0A0A0'}
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="hidden md:inline font-display font-bold uppercase tracking-widest text-xs">
              {step === 1 ? t('workout:planning.backToDashboard') : t('workout:planning.back')}
            </span>
          </button>

          <StepIndicator current={step} />

          <LanguageSwitcher />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">

        {step === 2 && errorMessage && (
          <div
            id="workout-error-banner"
            role="alert"
            className="mb-6 px-4 py-3 flex items-center gap-3 text-sm font-medium animate-slide-up"
            style={{
              color: '#FF5C00',
              background: 'rgba(255, 92, 0, 0.1)',
              border: '1px solid rgba(255, 92, 0, 0.45)',
              borderRadius: '2px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── STEP 1: Name + Muscle Groups ── */}
        {step === 1 && (
          <div className="animate-slide-up">
            <p className="ft-label mb-1">{t('workout:planning.stepEyebrow', { current: 1, total: 2 })}</p>
            <h1 className="ft-title text-4xl md:text-5xl text-white mb-1">{t('workout:planning.step1Title')}</h1>
            <p className="text-sm mb-8" style={{ color: '#A0A0A0' }}>{t('workout:planning.step1Subtitle')}</p>

            {/* Workout Name */}
            <div
              ref={workoutNameCardRef}
              className="p-5 mb-8"
              style={{
                scrollMarginTop: '96px',
                background: 'rgba(10,10,10,0.92)',
                border: errorField === 'workoutName' ? '1px solid #FF5C00' : '1px solid rgba(204,255,0,0.15)',
                boxShadow: errorField === 'workoutName' ? '0 0 12px rgba(255,92,0,0.2)' : 'none',
                borderRadius: '2px',
              }}
            >
              <label className="ft-label" htmlFor="workout-name-input">
                {t('workout:planning.workoutNameLabel')} <span style={{ color: '#FF5C00' }}>*</span>
              </label>
              <input
                ref={workoutNameInputRef}
                id="workout-name-input"
                type="text"
                placeholder={t('workout:planning.workoutNamePlaceholder')}
                value={workoutName}
                onChange={(e) => {
                  setWorkoutName(e.target.value);
                  if (errorField === 'workoutName' && e.target.value.trim()) {
                    setErrorMessage("");
                    setErrorField(null);
                  }
                }}
                onCompositionEnd={lockScrollIfInputOffscreen}
                onBlur={lockScrollIfInputOffscreen}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleNextToExercises();
                  }
                }}
                className="ft-input text-lg"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontStyle: 'italic',
                  fontWeight: 700,
                  borderColor: errorField === 'workoutName' ? '#FF5C00' : undefined,
                }}
              />
              {errorField === 'workoutName' && (
                <p className="text-xs mt-2 font-medium" style={{ color: '#FF5C00' }}>
                  {t('workout:planning.workoutNameRequiredInline')}
                </p>
              )}
            </div>

            {/* Muscle Groups */}
            <div
              ref={muscleGroupsSectionRef}
              className="mb-8"
              style={{ scrollMarginTop: '96px' }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="ft-label">{t('workout:planning.selectMuscleGroups')} <span style={{ color: '#FF5C00' }}>*</span></p>
                <span className="font-mono-sport text-xs" style={{ color: '#CCFF00', fontFamily: "'JetBrains Mono', monospace" }}>
                  {t('workout:planning.selectedCount', { count: selectedMuscleGroups.length })}
                </span>
              </div>
              {errorField === 'muscleGroups' && (
                <p className="text-xs mb-3 font-medium" style={{ color: '#FF5C00' }}>
                  {t('workout:planning.muscleGroupsRequiredInline')}
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {muscleGroupData.map((group) => {
                  const isSelected = !!selectedMuscleGroups.find(g => g.id === group.id);
                  const localizedGroupName = getLocalizedField(group, 'name', lang);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      id={`muscle-${group.id}`}
                      onPointerDown={lockScrollIfInputOffscreen}
                      onClick={() => handleMuscleGroupToggle(group)}
                      className="relative aspect-square flex flex-col items-center justify-center p-4 transition-all"
                      style={{
                        background: isSelected ? 'rgba(204,255,0,0.1)' : 'rgba(10,10,10,0.95)',
                        border: `1px solid ${isSelected ? '#CCFF00' : errorField === 'muscleGroups' ? 'rgba(255,92,0,0.45)' : '#1A1A1A'}`,
                        borderRadius: '2px',
                        boxShadow: isSelected ? '0 0 12px rgba(204,255,0,0.3)' : 'none',
                        transform: isSelected ? 'translateY(-2px)' : 'none',
                      }}
                    >
                      <img src={group.icon} alt={localizedGroupName} className="w-10 h-10 object-contain mb-2"
                        style={{ filter: isSelected ? 'none' : 'grayscale(0.4) brightness(0.7)' }}
                      />
                      <span
                        className="font-display font-bold uppercase text-xs text-center leading-tight"
                        style={{ color: isSelected ? '#CCFF00' : '#A0A0A0' }}
                      >
                        {localizedGroupName}
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

            {errorMessage && (
              <div
                id="workout-error-banner"
                role="alert"
                className="mb-4 px-4 py-3 flex items-center gap-3 text-sm font-medium animate-slide-up"
                style={{
                  color: '#FF5C00',
                  background: 'rgba(255, 92, 0, 0.1)',
                  border: '1px solid rgba(255, 92, 0, 0.45)',
                  borderRadius: '2px',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              id="next-step-btn"
              type="button"
              onPointerDown={lockScrollIfInputOffscreen}
              onClick={handleNextToExercises}
              className="ft-btn-primary w-full py-4 text-base"
            >
              {t('workout:planning.nextAddExercises')}
            </button>
          </div>
        )}

        {/* ── STEP 2: Exercise Selection ── */}
        {step === 2 && (
          <div className="animate-slide-up">
            <p className="ft-label mb-1">{t('workout:planning.stepEyebrow', { current: 2, total: 2 })}</p>
            <h1 className="ft-title text-3xl md:text-4xl text-white mb-1">{workoutName}</h1>
            <p className="text-sm mb-6" style={{ color: '#A0A0A0' }}>
              {t('workout:planning.fromGroups', { groups: selectedMuscleGroups.map(g => getLocalizedField(g, 'name', lang)).join(', ') })}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Available exercises */}
              <div>
                <p className="ft-label mb-3">{t('workout:planning.availableExercises')}</p>
                <div className="relative mb-3">
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                  <input
                    type="text"
                    placeholder={t('workout:planning.searchExercisesPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ft-input"
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
                {exercisesLoading ? (
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
                            <p className="font-display font-bold italic uppercase text-sm text-white">{getLocalizedField(exercise, 'name', lang)}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#555' }}>{getLocalizedMuscleGroupName(exercise.category, rawMuscleGroups, lang)} • {exercise.equipment}</p>
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
                  <p className="ft-label">{t('workout:planning.yourExercises')}</p>
                  <span className="font-mono-sport text-xs" style={{ color: '#CCFF00', fontFamily: "'JetBrains Mono', monospace" }}>
                    {t('workout:planning.addedCount', { count: workoutExercises.length })}
                  </span>
                </div>

                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {workoutExercises.length === 0 && (
                    <div
                      className="text-center py-16"
                      style={{ border: '1px dashed rgba(204,255,0,0.1)', borderRadius: '2px' }}
                    >
                      <p className="ft-label">{t('workout:planning.noExercisesTitle')}</p>
                      <p className="text-xs mt-1" style={{ color: '#555' }}>{t('workout:planning.noExercisesSubtitle')}</p>
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
                          <h3 className="font-display font-black italic uppercase text-white">{getLocalizedExerciseName(exercise, availableExercises, lang)}</h3>
                          <p className="text-xs" style={{ color: '#A0A0A0' }}>{getLocalizedMuscleGroupName(exercise.category, rawMuscleGroups, lang)}</p>
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
                          <p className="ft-label mb-0">{t('workout:planning.sets')}</p>
                          <button
                            onClick={() => handleAddSet(index)}
                            className="flex items-center gap-1 text-xs font-display font-bold uppercase tracking-wider transition-colors"
                            style={{ color: '#CCFF00' }}
                          >
                            <Plus size={11} /> {t('workout:planning.addSet')}
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
                                  placeholder={t('workout:planning.repsPlaceholder')}
                                />
                                <p className="text-[9px] text-center mt-0.5" style={{ color: '#555' }}>{t('workout:planning.repsUnit')}</p>
                              </div>
                              <div className="flex-1">
                                <input
                                  type="number" min="0" step="0.5"
                                  value={set.targetWeight || ''}
                                  onChange={(e) => handleSetChange(index, setIdx, 'targetWeight', e.target.value)}
                                  className="ft-input text-center text-xs py-1"
                                  style={{ paddingLeft: '4px', paddingRight: '4px' }}
                                  placeholder={t('workout:planning.weightPlaceholder')}
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

                <button
                  id="save-workout-btn"
                  onClick={handleSaveWorkout}
                  disabled={createWorkoutMutation.isPending}
                  className="ft-btn-primary w-full mt-4 py-3.5 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Save size={16} />
                  {createWorkoutMutation.isPending ? t('workout:planning.saving') : t('workout:planning.saveWorkoutPlan')}
                </button>
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
