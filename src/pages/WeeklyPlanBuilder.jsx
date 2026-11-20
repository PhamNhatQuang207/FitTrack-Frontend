import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import axiosClient from "../api/axiosClient";
import { exerciseAPI, muscleGroupAPI, weeklyScheduleAPI } from "../api";
import { queryKeys } from "../lib/queryClient";
import { ArrowLeft, Save, Plus, Trash2, X, Check, Search, Trash, ChevronDown, AlertCircle, RefreshCcw } from "lucide-react";
import ErrorBoundary from "../components/ErrorBoundary";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { usePreventImeScrollJump, unlockImeScrollGuard } from "../hooks/usePreventImeScrollJump";
import { getApiErrorMessage, getLocalizedExerciseName, getLocalizedField, getLocalizedMuscleGroupName } from "../utils/localize";

const DAYS = [
  { id: 0, name: 'Monday' }, { id: 1, name: 'Tuesday' }, { id: 2, name: 'Wednesday' },
  { id: 3, name: 'Thursday' }, { id: 4, name: 'Friday' }, { id: 5, name: 'Saturday' }, { id: 6, name: 'Sunday' }
];

const DEFAULT_MUSCLE_GROUPS = [
  { id: 'abdominals', name: 'Abdominals' }, { id: 'adductor', name: 'Adductor' },
  { id: 'biceps', name: 'Biceps' },
  { id: 'calves', name: 'Calves' }, { id: 'chest', name: 'Chest' },
  { id: 'forearms', name: 'Forearms' }, { id: 'glutes', name: 'Glutes' },
  { id: 'hamstrings', name: 'Hamstrings' }, { id: 'lats', name: 'Lats' },
  { id: 'lower_back', name: 'Lower Back' }, { id: 'quadriceps', name: 'Quadriceps' },
  { id: 'shoulders', name: 'Shoulders' },
  { id: 'traps', name: 'Traps' }, { id: 'triceps', name: 'Triceps' }
];

function WeeklyPlanBuilderContent() {
  usePreventImeScrollJump();
  const { t, i18n } = useTranslation(['plan', 'errors']);
  const lang = i18n.resolvedLanguage || 'en';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const planNameInputRef = useRef(null);
  const dayNameInputRefs = useRef({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [planName, setPlanName] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState(
    DAYS.map(day => ({ ...day, isRestDay: false, workout: { name: "", exercises: [] } }))
  );
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("all");
  const [showMuscleGroupDropdown, setShowMuscleGroupDropdown] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorField, setErrorField] = useState(null);
  const [errorDayId, setErrorDayId] = useState(null);
  const [swapSourceIndex, setSwapSourceIndex] = useState(null);

  const { data: rawMuscleGroups } = useQuery({
    queryKey: queryKeys.muscleGroups,
    queryFn: muscleGroupAPI.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const muscleGroups = useMemo(() => {
    if (!Array.isArray(rawMuscleGroups) || rawMuscleGroups.length === 0) {
      return DEFAULT_MUSCLE_GROUPS;
    }
    return rawMuscleGroups.map((g) => ({ id: g.slug, name: g.name, translations: g.translations }));
  }, [rawMuscleGroups]);

  const planQuery = useQuery({
    queryKey: queryKeys.weeklyPlans.detail(id),
    queryFn: () => axiosClient.get(`/weekly-plans/${id}`).then((res) => res.data),
    enabled: Boolean(id),
  });

  const { data: scheduleData, isError: scheduleError } = useQuery({
    queryKey: queryKeys.weeklySchedule.current,
    queryFn: weeklyScheduleAPI.getCurrent,
    enabled: Boolean(id),
    retry: false,
  });

  const activeSchedule =
    !scheduleError && scheduleData && !Array.isArray(scheduleData) ? scheduleData : null;
  const isEditingActivePlan = Boolean(
    isEditMode &&
    id &&
    activeSchedule?.weeklyPlanId &&
    String(activeSchedule.weeklyPlanId) === String(id)
  );

  useEffect(() => {
    const plan = planQuery.data;
    if (!plan) return;
    setPlanName(plan.name);
    setDescription(plan.description || "");
    const loadedSchedule = DAYS.map(day => {
      const planDay = plan.days.find(d => d.dayOfWeek === day.id);
      if (planDay?.isRestDay) {
        return { ...day, isRestDay: true, workout: { name: "Rest Day", exercises: [] } };
      }
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
        return { ...day, isRestDay: false, workout: { ...planDay.workout, exercises: normalizedExercises } };
      }
      return { ...day, isRestDay: false, workout: { name: "", exercises: [] } };
    });
    setSchedule(loadedSchedule);
    setIsEditMode(true);
  }, [planQuery.data]);

  useEffect(() => {
    if (planQuery.isError) {
      alert(getApiErrorMessage(planQuery.error, t, t('plan:builder.errors.loadFailed')));
      navigate('/weekly-plan-library');
    }
  }, [planQuery.isError, planQuery.error, navigate, t]);

  const exercisesQuery = useQuery({
    queryKey: selectedMuscleGroup === 'all'
      ? queryKeys.exercises.all
      : queryKeys.exercises.byCategory(selectedMuscleGroup),
    queryFn: () => (selectedMuscleGroup === 'all' ? exerciseAPI.getAll() : exerciseAPI.getByCategory(selectedMuscleGroup)),
    enabled: showExerciseModal,
    staleTime: 5 * 60 * 1000,
  });

  const allExercisesQuery = useQuery({
    queryKey: queryKeys.exercises.all,
    queryFn: exerciseAPI.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const availableExercises = exercisesQuery.data ?? [];
  const allExercisesCatalog = Array.isArray(allExercisesQuery.data) ? allExercisesQuery.data : availableExercises;

  const savePlanMutation = useMutation({
    mutationFn: ({ isEdit, planId, payload }) =>
      isEdit && planId
        ? axiosClient.put(`/weekly-plans/${planId}`, payload)
        : axiosClient.post('/weekly-plans', payload),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlans.all });
      if (variables.planId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlans.detail(variables.planId) });
      }
      navigate('/weekly-plan-library');
    },
    onError: (error) => {
      setErrorMessage(t('plan:builder.errors.saveFailed', { message: getApiErrorMessage(error, t, error.message) }));
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId) => axiosClient.delete(`/weekly-plans/${planId}`),
    onSuccess: async (_, planId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlans.all });
      if (planId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlans.detail(planId) });
      }
      navigate('/weekly-plan-library');
    },
    onError: (err) => {
      alert(getApiErrorMessage(err, t, t('plan:builder.errors.deleteFailed')));
    },
  });

  const loading = (Boolean(id) && planQuery.isLoading) || savePlanMutation.isPending || deletePlanMutation.isPending;

  const handleDayUpdate = (index, field, value) => {
    setSchedule((prev) =>
      prev.map((day, idx) => {
        if (idx !== index) return day;
        if (field === 'isRestDay') {
          const nextName = value
            ? "Rest Day"
            : day.workout.name === "Rest Day"
            ? ""
            : day.workout.name;
          return {
            ...day,
            isRestDay: value,
            workout: {
              ...day.workout,
              name: nextName,
              exercises: value ? [] : day.workout.exercises,
            },
          };
        }
        if (field === 'workoutName') {
          return {
            ...day,
            workout: { ...day.workout, name: value },
          };
        }
        return day;
      })
    );
    if (errorMessage) {
      setErrorMessage("");
      setErrorField(null);
      setErrorDayId(null);
    }
  };

  const handleSwapDays = (index) => {
    if (swapSourceIndex === null) {
      setSwapSourceIndex(index);
      return;
    }
    if (swapSourceIndex === index) {
      setSwapSourceIndex(null);
      return;
    }
    setSchedule((prev) => {
      const next = [...prev];
      const source = next[swapSourceIndex];
      const target = next[index];
      next[swapSourceIndex] = {
        ...source,
        isRestDay: target.isRestDay,
        workout: target.workout,
      };
      next[index] = {
        ...target,
        isRestDay: source.isRestDay,
        workout: source.workout,
      };
      return next;
    });
    setSwapSourceIndex(null);
  };

  const handleConfigureDay = (dayIndex) => { setActiveDayIndex(dayIndex); setShowExerciseModal(true); setSearchTerm(""); setSelectedMuscleGroup("all"); };

  const handleAddExercise = (exercise) => {
    const newSchedule = [...schedule];
    const dayExercises = newSchedule[activeDayIndex].workout.exercises;
    if (dayExercises.find(ex => ex.exerciseId === exercise.id)) { alert(t('plan:builder.errors.alreadyAdded')); return; }
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

  const handleSavePlan = () => {
    unlockImeScrollGuard();
    const effectivePlanName = planNameInputRef.current?.value ?? planName;
    const effectiveSchedule = schedule.map((day) => {
      if (day.isRestDay) return day;
      const inputEl = dayNameInputRefs.current[day.id];
      if (!inputEl) return day;
      return {
        ...day,
        workout: { ...day.workout, name: inputEl.value },
      };
    });

    if (effectivePlanName !== planName) {
      setPlanName(effectivePlanName);
    }

    if (!effectivePlanName.trim()) {
      setErrorMessage(t('plan:builder.errors.planNameRequired'));
      setErrorField('planName');
      setErrorDayId(null);
      planNameInputRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      planNameInputRef.current?.focus?.({ preventScroll: true });
      return;
    }

    const unnamedDayWithExercises = effectiveSchedule.find(
      (day) => !day.isRestDay && day.workout.exercises.length > 0 && !day.workout.name.trim()
    );
    if (unnamedDayWithExercises) {
      setErrorMessage(
        t('plan:builder.errors.dayWorkoutNameRequired', {
          day: t(`plan:days.${unnamedDayWithExercises.name}`),
        })
      );
      setErrorField('day');
      setErrorDayId(unnamedDayWithExercises.id);
      const targetInput = dayNameInputRefs.current[unnamedDayWithExercises.id];
      targetInput?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      targetInput?.focus?.({ preventScroll: true });
      return;
    }

    setErrorMessage("");
    setErrorField(null);
    setErrorDayId(null);
    const transformedDays = effectiveSchedule.map((day) => ({
      dayOfWeek: day.id,
      dayName: day.name,
      isRestDay: day.isRestDay,
      workout: day.workout,
    }));
    savePlanMutation.mutate({
      isEdit: isEditMode,
      planId: id,
      payload: { name: effectivePlanName, description, days: transformedDays },
    });
  };

  const handleDeletePlan = () => {
    const confirmKey = isEditingActivePlan ? 'plan:builder.confirmDeleteActive' : 'plan:builder.confirmDelete';
    if (!window.confirm(t(confirmKey, { name: planName }))) return;
    deletePlanMutation.mutate(id);
  };

  const filteredExercises = availableExercises.filter(ex => {
    const q = searchTerm.toLowerCase();
    return (
      ex.name.toLowerCase().includes(q) ||
      (ex.translations?.vi?.name || '').toLowerCase().includes(q)
    );
  });
  const activeDay = activeDayIndex !== null ? schedule[activeDayIndex] : null;

  return (
    <div className="ft-page min-h-screen">
      {/* Header */}
      <div className="ft-header px-4 md:px-8 py-0">
        <div className="max-w-6xl mx-auto ft-header-grid">
          <div className="flex items-center justify-start min-w-0">
            <button
              id="back-btn"
              type="button"
              onClick={() => navigate("/weekly-plan-library")}
              className="flex items-center gap-2 transition-colors group"
              style={{ color: '#A0A0A0' }}
              onMouseEnter={e => e.currentTarget.style.color = '#CCFF00'}
              onMouseLeave={e => e.currentTarget.style.color = '#A0A0A0'}
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden md:inline font-display font-bold uppercase tracking-widest text-xs whitespace-nowrap">{t('plan:builder.backToLibrary')}</span>
            </button>
          </div>

          <h1 className="ft-title text-xl md:text-2xl text-neon-lime text-center truncate">
            {isEditMode ? t('plan:builder.editTitle') : t('plan:builder.newTitle')}
          </h1>

          <div className="flex items-center justify-end gap-2 min-w-0">
            <LanguageSwitcher />
            {isEditMode && (
              <button
                id="delete-plan-btn"
                type="button"
                onClick={handleDeletePlan}
                disabled={loading}
                className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-wider px-3 py-2 transition-colors disabled:opacity-50 whitespace-nowrap"
                style={{ border: '1px solid rgba(255,92,0,0.3)', borderRadius: '2px', color: '#FF5C00', background: 'rgba(255,92,0,0.06)' }}
              >
                <Trash size={13} /> <span className="hidden md:inline">{t('plan:builder.delete')}</span>
              </button>
            )}
            <button
              id="save-plan-btn"
              type="button"
              onClick={handleSavePlan}
              disabled={loading}
              className="ft-btn-primary flex items-center gap-2 text-xs disabled:opacity-50 whitespace-nowrap"
              style={{ padding: '8px 16px' }}
            >
              <Save size={13} /> <span className="hidden md:inline">{isEditMode ? t('plan:builder.updatePlan') : t('plan:builder.savePlan')}</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {isEditingActivePlan && (
          <div
            role="status"
            className="mb-6 px-4 py-3 flex items-center gap-3 text-sm animate-slide-up"
            style={{
              color: '#CCFF00',
              background: 'rgba(204, 255, 0, 0.06)',
              border: '1px solid rgba(204, 255, 0, 0.3)',
              borderRadius: '2px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{t('plan:builder.activePlanNotice')}</span>
          </div>
        )}
        {errorMessage && (
          <div
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

        {/* Plan info */}
        <div
          className="p-5 mb-6 animate-slide-up"
          style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: '2px' }}
        >
          <p className="ft-label mb-4">{t('plan:builder.planDetailsEyebrow')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="ft-label">{t('plan:builder.planNameLabel')}</label>
              <input
                ref={planNameInputRef}
                id="plan-name-input"
                type="text"
                placeholder={t('plan:builder.planNamePlaceholder')}
                value={planName}
                onChange={(e) => {
                  setPlanName(e.target.value);
                  if (errorMessage) {
                    setErrorMessage("");
                    setErrorField(null);
                    setErrorDayId(null);
                  }
                }}
                className="ft-input font-display font-bold italic uppercase"
                style={{
                  scrollMarginTop: '96px',
                  ...(errorField === 'planName' ? { borderColor: '#FF5C00' } : {}),
                }}
              />
            </div>
            <div>
              <label className="ft-label">{t('plan:builder.descriptionLabel')}</label>
              <input
                id="plan-desc-input"
                type="text"
                placeholder={t('plan:builder.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="ft-input"
              />
            </div>
          </div>
        </div>

        {/* Weekly schedule */}
        <p className="ft-label mb-3">{t('plan:builder.weeklyScheduleEyebrow')}</p>
        <div className="space-y-3 animate-slide-up">
          {schedule.map((day, index) => {
            const isSwapSelected = swapSourceIndex === index;
            const isSwapTarget = swapSourceIndex !== null && !isSwapSelected;
            return (
            <div
              key={day.id}
              className="p-4 transition-all"
              style={{
                background: day.isRestDay ? 'rgba(5,5,5,0.8)' : 'rgba(10,10,10,0.95)',
                border: `1px solid ${isSwapSelected ? 'rgba(204,255,0,0.65)' : day.isRestDay ? '#0D0D0D' : 'rgba(204,255,0,0.12)'}`,
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
                  {t(`plan:daysShort.${day.name}`)}
                </div>

                {/* Workout name input */}
                {!day.isRestDay && (
                  <input
                    id={`day-workout-name-${day.id}`}
                    ref={(el) => { dayNameInputRefs.current[day.id] = el; }}
                    type="text"
                    placeholder={t('plan:builder.workoutNamePlaceholder')}
                    value={day.workout.name}
                    onChange={(e) => handleDayUpdate(index, 'workoutName', e.target.value)}
                    className="ft-input flex-1 font-display font-bold italic uppercase"
                    style={{
                      minWidth: '120px',
                      scrollMarginTop: '96px',
                      ...(errorField === 'day' && errorDayId === day.id ? { borderColor: '#FF5C00' } : {}),
                    }}
                  />
                )}

                {day.isRestDay && (
                  <span className="flex-1 font-display font-bold uppercase text-sm" style={{ color: '#333' }}>{t('plan:builder.restDay')}</span>
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
                  <span className="text-xs font-display font-bold uppercase tracking-wider" style={{ color: '#555' }}>{t('plan:builder.rest')}</span>
                </label>

                {/* Swap button */}
                <button
                  id={`swap-day-${day.id}`}
                  type="button"
                  onClick={() => handleSwapDays(index)}
                  className="flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider px-3 py-2 transition-colors flex-shrink-0"
                  style={{
                    border: '1px solid rgba(204,255,0,0.3)',
                    borderRadius: '2px',
                    color: '#CCFF00',
                    background: isSwapSelected ? 'rgba(204,255,0,0.2)' : 'rgba(204,255,0,0.06)',
                  }}
                >
                  <RefreshCcw size={12} />
                  {isSwapSelected ? t('plan:builder.selected') : isSwapTarget ? t('plan:builder.swapHere') : t('plan:builder.swapDay')}
                </button>

                {/* Configure button */}
                {!day.isRestDay && (
                  <button
                    id={`configure-day-${day.id}`}
                    type="button"
                    onClick={() => handleConfigureDay(index)}
                    className="flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider px-3 py-2 transition-colors flex-shrink-0"
                    style={{ border: '1px solid rgba(204,255,0,0.3)', borderRadius: '2px', color: '#CCFF00', background: 'rgba(204,255,0,0.06)' }}
                  >
                    <Plus size={12} /> {t('plan:builder.exercisesCount', { count: day.workout.exercises.length })}
                  </button>
                )}
              </div>

              {/* Exercise badges */}
              {!day.isRestDay && day.workout.exercises.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 ml-[4.5rem]">
                  {day.workout.exercises.map((ex, idx) => (
                    <span key={idx} className="ft-badge-lime text-[10px]">
                      {getLocalizedExerciseName(ex, allExercisesCatalog, lang)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            );
          })}
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
                  {t(`plan:days.${activeDay.name}`)} — {activeDay.workout.name || t('plan:builder.modal.configureExercises')}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>{t('plan:builder.modal.subtitle')}</p>
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
                  <p className="ft-label mb-3">{t('plan:builder.modal.availableExercises')}</p>
                  <div className="space-y-2 mb-4">
                    <div className="relative">
                      <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                      <input
                        type="text"
                        placeholder={t('plan:builder.modal.searchPlaceholder')}
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
                        <span>
                          {selectedMuscleGroup === 'all'
                            ? t('plan:builder.modal.allMuscleGroups')
                            : getLocalizedField(muscleGroups.find(g => g.id === selectedMuscleGroup), 'name', lang) || t('plan:builder.modal.selectGroup')}
                        </span>
                        <ChevronDown size={14} style={{ color: '#555', transform: showMuscleGroupDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>
                      {showMuscleGroupDropdown && (
                        <div
                          className="absolute z-50 w-full mt-1 max-h-56 overflow-y-auto"
                          style={{ background: '#0A0A0A', border: '1px solid rgba(204,255,0,0.2)', borderRadius: '2px' }}
                        >
                          {[{ id: 'all', name: t('plan:builder.modal.allMuscleGroups') }, ...muscleGroups].map(group => (
                            <button
                              key={group.id}
                              onClick={() => { setSelectedMuscleGroup(group.id); setShowMuscleGroupDropdown(false); }}
                              className="w-full px-4 py-2.5 text-left text-sm font-display font-bold uppercase tracking-wider transition-colors"
                              style={{
                                color: selectedMuscleGroup === group.id ? '#CCFF00' : '#A0A0A0',
                                background: selectedMuscleGroup === group.id ? 'rgba(204,255,0,0.08)' : 'transparent',
                              }}
                            >
                              {group.id === 'all' ? group.name : getLocalizedField(group, 'name', lang)}
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
                          <p className="font-display font-bold italic uppercase text-sm text-white">{getLocalizedField(exercise, 'name', lang)}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#555' }}>{getLocalizedMuscleGroupName(exercise.category, rawMuscleGroups, lang)}</p>
                        </div>
                        <Plus size={14} style={{ color: '#CCFF00', flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected exercises */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="ft-label mb-0">{t('plan:builder.modal.yourExercises')}</p>
                    <span className="font-mono-sport text-xs" style={{ color: '#CCFF00', fontFamily: "'JetBrains Mono', monospace" }}>
                      {t('plan:builder.modal.addedCount', { count: activeDay.workout.exercises.length })}
                    </span>
                  </div>
                  {activeDay.workout.exercises.length === 0 ? (
                    <div className="text-center py-16" style={{ border: '1px dashed rgba(204,255,0,0.1)', borderRadius: '2px' }}>
                      <p className="ft-label">{t('plan:builder.modal.noExercisesTitle')}</p>
                      <p className="text-xs mt-1" style={{ color: '#555' }}>{t('plan:builder.modal.noExercisesSubtitle')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {activeDay.workout.exercises.map((exercise) => (
                        <div key={exercise.exerciseId} className="p-4" style={{ background: 'rgba(204,255,0,0.04)', border: '1px solid rgba(204,255,0,0.12)', borderRadius: '2px' }}>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-display font-black italic uppercase text-white text-sm">{getLocalizedExerciseName(exercise, allExercisesCatalog, lang)}</h3>
                              <p className="text-xs" style={{ color: '#A0A0A0' }}>{getLocalizedMuscleGroupName(exercise.category, rawMuscleGroups, lang)}</p>
                            </div>
                            <button onClick={() => handleRemoveExercise(exercise.exerciseId)} className="p-1 transition-colors" style={{ color: '#FF5C00' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="ft-label mb-0">{t('plan:builder.modal.sets')}</p>
                              <button onClick={() => handleAddSet(exercise.exerciseId)} className="flex items-center gap-1 text-xs font-display font-bold uppercase tracking-wider" style={{ color: '#CCFF00' }}>
                                <Plus size={11} /> {t('plan:builder.modal.addSet')}
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              {exercise.sets && exercise.sets.map((set, setIdx) => (
                                <div key={setIdx} className="flex items-center gap-2 px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '2px' }}>
                                  <span className="font-mono-sport text-xs w-8 flex-shrink-0" style={{ color: '#555', fontFamily: "'JetBrains Mono', monospace" }}>S{set.setNumber}</span>
                                  <div className="flex-1">
                                    <input type="number" min="1" value={set.targetReps} onChange={(e) => handleSetChange(exercise.exerciseId, setIdx, 'targetReps', e.target.value)} className="ft-input text-center text-xs py-1 px-1" placeholder={t('plan:builder.modal.repsPlaceholder')} />
                                    <p className="text-[9px] text-center mt-0.5" style={{ color: '#555' }}>{t('plan:builder.modal.repsUnit')}</p>
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
                {t('plan:builder.modal.done')}
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
