import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import axiosClient from "../api/axiosClient";
import { exerciseAPI, muscleGroupAPI, workoutSessionAPI } from "../api";
import { invalidateWorkoutAndAnalytics, queryKeys } from "../lib/queryClient";
import { ArrowLeft, Check, X, CheckCircle2, Circle, Edit3, Search, Plus, Minus } from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { getApiErrorMessage, getLocalizedExerciseName, getLocalizedField, getLocalizedMuscleGroupName } from "../utils/localize";

// How many sets an exercise has. `targetSets` is what the Manage modal edits, so
// it is authoritative; the plan's per-set `sets` array is only a fallback for
// sessions saved before targetSets existed. Every read must go through here --
// reading the two in the opposite order is what made a set count lowered from 3
// to 2 still render "2/3 sets done".
const getTotalSets = (exercise) =>
  exercise.targetSets || (exercise.sets ? exercise.sets.length : 3);

export default function ActiveWorkout() {
  const { t, i18n } = useTranslation(['workout', 'errors']);
  const lang = i18n.resolvedLanguage || 'en';
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const startedRef = useRef(null);
  const [session, setSession] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [bodyMetrics, setBodyMetrics] = useState({ weight: "", bodyFat: "" });
  const [setInputs, setSetInputs] = useState({});
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sessionQuery = useQuery({
    queryKey: queryKeys.workoutSessions.detail(id),
    queryFn: () => workoutSessionAPI.getById(id),
    enabled: Boolean(id),
  });

  const exercisesQuery = useQuery({
    queryKey: queryKeys.exercises.all,
    queryFn: exerciseAPI.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const muscleGroupsQuery = useQuery({
    queryKey: queryKeys.muscleGroups,
    queryFn: muscleGroupAPI.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const availableExercises = Array.isArray(exercisesQuery.data) ? exercisesQuery.data : [];
  const muscleGroupsCatalog = Array.isArray(muscleGroupsQuery.data) ? muscleGroupsQuery.data : [];
  const loading = sessionQuery.isLoading && !session;

  useEffect(() => {
    if (sessionQuery.data) {
      setSession(sessionQuery.data);
      if (sessionQuery.data.status === 'planned' && startedRef.current !== id) {
        startedRef.current = id;
        axiosClient.patch(`/workout-sessions/${id}/start`).catch(() => {});
      }
    }
  }, [sessionQuery.data, id]);

  useEffect(() => {
    if (sessionQuery.isError) {
      alert(getApiErrorMessage(sessionQuery.error, t, t('workout:active.alerts.loadSessionFailed')));
      navigate('/dashboard');
    }
  }, [sessionQuery.isError, sessionQuery.error, navigate, t]);

  useEffect(() => {
    if (session && session.exercises) {
      const initialInputs = {};
      session.exercises.forEach((exercise, exIndex) => {
        initialInputs[exIndex] = {};
        const numSets = getTotalSets(exercise);
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
      await Promise.all([
        invalidateWorkoutAndAnalytics(queryClient),
        queryClient.invalidateQueries({ queryKey: queryKeys.workoutSessions.detail(id) }),
      ]);
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
      await Promise.all([
        invalidateWorkoutAndAnalytics(queryClient),
        queryClient.invalidateQueries({ queryKey: queryKeys.workoutSessions.detail(id) }),
      ]);
      if (session.weeklyScheduleId) navigate('/weekly-schedule');
      else navigate('/dashboard');
    } catch (error) {
      alert(getApiErrorMessage(error, t, t('workout:active.alerts.completeFailed')));
    }
  };

  const handleManageExercises = async () => {
    try {
      await queryClient.ensureQueryData({
        queryKey: queryKeys.exercises.all,
        queryFn: exerciseAPI.getAll,
        staleTime: 5 * 60 * 1000,
      });
      setShowExerciseModal(true);
    } catch (error) { alert(getApiErrorMessage(error, t, t('workout:active.alerts.loadExercisesFailed'))); }
  };

  const handleAddExercise = (exercise) => {
    // GET /exercises returns the id as `id` and explicitly blanks `_id`, so read
    // `id` first. Reading `_id` alone yielded undefined, which both stored every
    // exercise with no id and made `ex.exerciseId?.toString() === exercise._id`
    // compare undefined to undefined -- true. One id-less exercise in the session
    // therefore matched every candidate, so nothing could be added a second time.
    const newId = exercise.id || exercise._id;
    const isDuplicate = session.exercises.some(ex =>
      (newId && ex.exerciseId && ex.exerciseId.toString() === newId.toString()) ||
      ex.exerciseName === exercise.name
    );
    if (isDuplicate) { alert(t('workout:active.alerts.alreadyAdded')); return; }
    setSession({
      ...session,
      exercises: [...session.exercises, {
        exerciseId: newId, exerciseName: exercise.name, category: exercise.category,
        targetSets: 3, targetReps: 10, targetWeight: 0, completed: false, actualSets: []
      }]
    });
  };

  const handleRemoveExercise = (exerciseIndex) => {
    const updatedExercises = session.exercises.filter((_, idx) => idx !== exerciseIndex);
    setSession({ ...session, exercises: updatedExercises });
  };

  const handleUpdateSets = (exerciseIndex, change) => {
    const updatedExercises = [...session.exercises];
    const exercise = { ...updatedExercises[exerciseIndex] };
    const newTotal = Math.max(1, getTotalSets(exercise) + change);
    exercise.targetSets = newTotal;

    // Drop completions that now point past the last set, or a workout logged as
    // 3/3 and then cut to 2 sets would read "3/2 sets done" and stay complete.
    // `sets` is left intact so the per-set targets survive raising the count again.
    if (exercise.actualSets) {
      exercise.actualSets = exercise.actualSets.filter(s => s.setNumber <= newTotal);
    }

    updatedExercises[exerciseIndex] = exercise;
    setSession({ ...session, exercises: updatedExercises });
  };

  const handleSaveExercises = async () => {
    try {
      await axiosClient.put(`/workout-sessions/${id}`, { exercises: session.exercises });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workoutSessions.detail(id) }),
        invalidateWorkoutAndAnalytics(queryClient),
      ]);
      setShowExerciseModal(false);
      setSearchQuery('');
    } catch (error) { alert(getApiErrorMessage(error, t, t('workout:active.alerts.saveExercisesFailed'))); }
  };

  const isSetCompleted = (exercise, setIndex) => exercise.actualSets?.some(s => s.setNumber === setIndex + 1);
  const getExerciseProgress = (exercise) => {
    const completed = exercise.actualSets?.length || 0;
    return `${completed}/${getTotalSets(exercise)}`;
  };
  const isExerciseComplete = (exercise) =>
    (exercise.actualSets?.length || 0) >= getTotalSets(exercise);

  if (loading) {
    return (
      <div className="ft-page min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="ft-loader mx-auto mb-4" />
          <p className="ft-label">{t('workout:active.loading')}</p>
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
        <div className="max-w-6xl mx-auto ft-header-grid">
          <div className="flex items-center justify-start min-w-0">
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
          </div>

          <div className="min-w-0 text-center">
            <h1 className="ft-title text-lg md:text-2xl text-white leading-none truncate">{session.name}</h1>
            <p className="text-xs mt-0.5 truncate" style={{ color: '#A0A0A0' }}>
              {t('workout:active.exercisesDone', { completed: completedExercises, total: totalExercises })}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 min-w-0">
            <LanguageSwitcher />
            <button
              id="manage-exercises-btn"
              onClick={handleManageExercises}
              className="ft-btn-secondary flex items-center gap-2 text-xs whitespace-nowrap"
              style={{ padding: '7px 12px' }}
            >
              <Edit3 size={13} /> <span className="hidden sm:inline">{t('workout:active.manage')}</span>
            </button>
          </div>
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
              <p className="ft-label mb-1">{t('workout:active.exerciseCounter', { current: currentExerciseIndex + 1, total: totalExercises })}</p>
              <h2 className="ft-title text-3xl md:text-4xl text-white">{getLocalizedExerciseName(currentExercise, availableExercises, lang)}</h2>
              <p className="text-xs mt-1" style={{ color: '#A0A0A0' }}>{getLocalizedMuscleGroupName(currentExercise.category, muscleGroupsCatalog, lang)}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="font-mono-sport font-bold text-4xl leading-none" style={{ color: '#CCFF00', fontFamily: "'JetBrains Mono', monospace" }}>
                {getExerciseProgress(currentExercise)}
              </p>
              <p className="text-xs mt-1 ft-label">{t('workout:active.setsDone')}</p>
            </div>
          </div>

          {/* Per-set targets */}
          {currentExercise.sets && currentExercise.sets.length > 0 && (
            <div
              className="mb-5 p-3 grid grid-cols-3 gap-2 text-xs"
              style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '2px' }}
            >
              {/* Sliced, not stored trimmed: showing all 3 chips beside a 2-set
                  checklist reads as a bug, but the extra target is kept on the
                  document so raising the count back restores it. */}
              {currentExercise.sets.slice(0, getTotalSets(currentExercise)).map((set, idx) => (
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
            {Array.from({ length: getTotalSets(currentExercise) }).map((_, index) => {
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
                    <span className="text-xs" style={{ color: '#555' }}>{t('workout:active.repsUnit')}</span>
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
              {t('workout:active.previous')}
            </button>
            <button
              id="next-exercise-btn"
              onClick={() => setCurrentExerciseIndex(Math.min(totalExercises - 1, currentExerciseIndex + 1))}
              disabled={currentExerciseIndex === totalExercises - 1}
              className="ft-btn-ghost py-3 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t('workout:active.next')}
            </button>
          </div>
        </div>

        {/* Exercise overview */}
        <div
          className="mb-5 p-5 animate-slide-up"
          style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2px' }}
        >
          <p className="ft-label mb-3">{t('workout:active.allExercises')}</p>
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
                      <p className="font-display font-bold italic uppercase text-sm text-white leading-none">{getLocalizedExerciseName(exercise, availableExercises, lang)}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#555' }}>{getLocalizedMuscleGroupName(exercise.category, muscleGroupsCatalog, lang)}</p>
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
          <Check size={18} /> {t('workout:active.completeWorkout')}
        </button>
      </main>

      {/* Body Metrics Modal */}
      {showMetricsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-sm p-6"
            style={{ background: '#050505', border: '1px solid rgba(204,255,0,0.2)', borderRadius: '2px' }}
          >
            <h2 className="ft-title text-2xl text-white mb-1">{t('workout:active.metricsModal.title')}</h2>
            <p className="text-sm mb-5" style={{ color: '#A0A0A0' }}>{t('workout:active.metricsModal.subtitle')}</p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="ft-label">{t('workout:active.metricsModal.weightLabel')}</label>
                <input type="number" step="0.1" placeholder={t('workout:active.metricsModal.weightPlaceholder')} value={bodyMetrics.weight}
                  onChange={(e) => setBodyMetrics({ ...bodyMetrics, weight: e.target.value })} className="ft-input" />
              </div>
              <div>
                <label className="ft-label">{t('workout:active.metricsModal.bodyFatLabel')}</label>
                <input type="number" step="0.1" placeholder={t('workout:active.metricsModal.bodyFatPlaceholder')} value={bodyMetrics.bodyFat}
                  onChange={(e) => setBodyMetrics({ ...bodyMetrics, bodyFat: e.target.value })} className="ft-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleSkipMetrics} className="ft-btn-ghost py-3 text-xs">{t('workout:active.metricsModal.skip')}</button>
              <button onClick={handleSaveMetrics} className="ft-btn-primary py-3 text-xs">{t('workout:active.metricsModal.saveAndComplete')}</button>
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
                <h2 className="ft-title text-2xl text-white">{t('workout:active.manageModal.title')}</h2>
                <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>{t('workout:active.manageModal.subtitle')}</p>
              </div>
              <button onClick={() => setShowExerciseModal(false)} style={{ color: '#A0A0A0' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#A0A0A0'}>
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid md:grid-cols-2 gap-5">
                {/* Available */}
                <div>
                  <p className="ft-label mb-3">{t('workout:active.manageModal.availableExercises')}</p>
                  <div className="relative mb-3">
                    <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                    <input type="text" placeholder={t('workout:active.manageModal.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      className="ft-input" style={{ paddingLeft: '32px' }} />
                  </div>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {availableExercises.filter(ex => {
                      const q = searchQuery.toLowerCase();
                      const localizedCat = getLocalizedMuscleGroupName(ex.category, muscleGroupsCatalog, lang).toLowerCase();
                      return (
                        ex.name.toLowerCase().includes(q) ||
                        (ex.translations?.vi?.name || '').toLowerCase().includes(q) ||
                        ex.category.toLowerCase().includes(q) ||
                        localizedCat.includes(q)
                      );
                    }).map((exercise, idx) => (
                      <div key={exercise.id || idx} className="flex items-center justify-between px-4 py-3 transition-all"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #111', borderRadius: '2px' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(204,255,0,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#111'}
                      >
                        <div>
                          <p className="font-display font-bold italic uppercase text-sm text-white">{getLocalizedField(exercise, 'name', lang)}</p>
                          <p className="text-xs" style={{ color: '#555' }}>{getLocalizedMuscleGroupName(exercise.category, muscleGroupsCatalog, lang)}</p>
                        </div>
                        <button onClick={() => handleAddExercise(exercise)} className="ft-btn-primary text-xs" style={{ padding: '5px 12px' }}>{t('workout:active.manageModal.add')}</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Current */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="ft-label mb-0">{t('workout:active.manageModal.currentExercises')}</p>
                    <span className="font-mono-sport text-xs" style={{ color: '#CCFF00', fontFamily: "'JetBrains Mono', monospace" }}>{session.exercises.length}</span>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {session.exercises.length === 0
                      ? <p className="text-center py-10 ft-label">{t('workout:active.manageModal.noExercises')}</p>
                      : session.exercises.map((exercise, index) => {
                        const localizedExName = getLocalizedExerciseName(exercise, availableExercises, lang);
                        return (
                        <div key={index} className="p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #111', borderRadius: '2px' }}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-display font-bold italic uppercase text-sm text-white">{localizedExName}</p>
                              <p className="text-xs" style={{ color: '#555' }}>{getLocalizedMuscleGroupName(exercise.category, muscleGroupsCatalog, lang)}</p>
                            </div>
                            <button onClick={() => handleRemoveExercise(index)} style={{ color: '#FF5C00', padding: '4px 8px', fontSize: '11px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(255,92,0,0.3)', borderRadius: '2px' }}>
                              {t('workout:active.manageModal.remove')}
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-2 px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '2px' }}>
                            <span className="text-xs ft-label mb-0">{t('workout:active.manageModal.setsLabel')}</span>
                            <div className="flex items-center gap-2">
                              <button aria-label={t('workout:active.manageModal.removeSetAria', { name: localizedExName })} onClick={() => handleUpdateSets(index, -1)} className="w-6 h-6 flex items-center justify-center transition-colors" style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: '2px', color: '#A0A0A0' }}>
                                <Minus size={10} />
                              </button>
                              <span className="font-mono-sport font-bold text-sm w-6 text-center" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#CCFF00' }}>{getTotalSets(exercise)}</span>
                              <button aria-label={t('workout:active.manageModal.addSetAria', { name: localizedExName })} onClick={() => handleUpdateSets(index, 1)} className="w-6 h-6 flex items-center justify-center transition-colors" style={{ background: '#111', border: '1px solid #1A1A1A', borderRadius: '2px', color: '#A0A0A0' }}>
                                <Plus size={10} />
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 flex justify-end gap-3" style={{ borderTop: '1px solid rgba(204,255,0,0.1)' }}>
              <button onClick={() => setShowExerciseModal(false)} className="ft-btn-ghost px-6 py-2.5 text-xs">{t('workout:active.manageModal.cancel')}</button>
              <button onClick={handleSaveExercises} className="ft-btn-primary px-6 py-2.5 text-xs">{t('workout:active.manageModal.saveChanges')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
