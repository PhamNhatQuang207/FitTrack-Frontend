import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { weeklyScheduleAPI, workoutSessionAPI } from "../api";
import { invalidateWorkoutAndAnalytics, queryKeys } from "../lib/queryClient";
import {
  ArrowLeft, Play, CheckCircle2, Calendar as CalendarIcon,
  Edit2, RefreshCcw, X as XIcon, Save, ClipboardList
} from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { getApiErrorMessage } from "../utils/localize";
import { formatDate } from "../utils/formatters";

export default function WeeklyCalendar() {
  const { t, i18n } = useTranslation(['plan', 'errors']);
  const lang = i18n.resolvedLanguage || 'en';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [swapSourceDay, setSwapSourceDay] = useState(null);
  const [editingWorkoutName, setEditingWorkoutName] = useState({});

  const { data: scheduleData, isLoading: loading, isError: scheduleError } = useQuery({
    queryKey: queryKeys.weeklySchedule.current,
    queryFn: weeklyScheduleAPI.getCurrent,
    retry: false,
  });

  const currentSchedule = scheduleError ? null : (scheduleData ?? null);

  const startWorkoutMutation = useMutation({
    mutationFn: (payload) => workoutSessionAPI.create(payload),
    onSuccess: async (data) => {
      await invalidateWorkoutAndAnalytics(queryClient);
      navigate(`/workout/${data.sessionId}`);
    },
    onError: (error) => {
      alert(getApiErrorMessage(error, t, t('plan:calendar.errors.startWorkoutFailed')));
    },
  });

  const completeWeekMutation = useMutation({
    mutationFn: (scheduleId) => weeklyScheduleAPI.complete(scheduleId),
    onSuccess: async () => {
      await invalidateWorkoutAndAnalytics(queryClient);
      navigate('/weekly-plan-library');
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: ({ scheduleId, dayOfWeek }) =>
      weeklyScheduleAPI.completeDay(scheduleId, {
        dayOfWeek,
        workoutData: { exercises: [] },
      }),
    onSuccess: async () => {
      await invalidateWorkoutAndAnalytics(queryClient);
    },
    onError: (err) => {
      alert(getApiErrorMessage(err, t, t('plan:calendar.errors.markCompleteFailed')));
    },
  });

  const swapDaysMutation = useMutation({
    mutationFn: ({ scheduleId, dayOfWeek, targetDayOfWeek }) =>
      weeklyScheduleAPI.updateDay(scheduleId, {
        action: 'swap',
        dayOfWeek,
        targetDayOfWeek,
      }),
    onSuccess: async () => {
      await invalidateWorkoutAndAnalytics(queryClient);
      setSwapSourceDay(null);
    },
    onError: (err) => {
      alert(getApiErrorMessage(err, t, t('plan:calendar.errors.swapFailed')));
      setSwapSourceDay(null);
    },
  });

  const editDayMutation = useMutation({
    mutationFn: ({ scheduleId, payload }) =>
      weeklyScheduleAPI.updateDay(scheduleId, payload),
    onSuccess: async () => {
      await invalidateWorkoutAndAnalytics(queryClient);
    },
  });

  const handleStartWorkout = (day) => {
    const localizedDay = t(`plan:days.${day.dayName}`, { defaultValue: day.dayName });
    startWorkoutMutation.mutate({
      name: day.workout?.name?.trim() || t('plan:calendar.defaultDayWorkout', { day: localizedDay }),
      date: day.date,
      exercises: day.workout.exercises,
      status: 'planned',
      weeklyScheduleId: currentSchedule.id,
      dayOfWeek: day.dayOfWeek
    });
  };

  const handleCompleteWeek = async () => {
    if (!window.confirm(t('plan:calendar.confirmCompleteWeek'))) return;
    try {
      await completeWeekMutation.mutateAsync(currentSchedule.id);
    } catch (error) {
      alert(getApiErrorMessage(error, t, t('plan:calendar.errors.completeWeekFailed')));
    }
  };

  const handleDismissWeek = async () => {
    if (!window.confirm(t('plan:calendar.confirmDismissWeek'))) return;
    try {
      await completeWeekMutation.mutateAsync(currentSchedule.id);
    } catch (error) {
      alert(getApiErrorMessage(error, t, t('plan:calendar.errors.dismissWeekFailed')));
    }
  };

  const handleMarkComplete = (day) => {
    markCompleteMutation.mutate({
      scheduleId: currentSchedule.id,
      dayOfWeek: day.dayOfWeek,
    });
  };

  const handleSwapDays = (day) => {
    if (!swapSourceDay) {
      setSwapSourceDay(day);
    } else {
      swapDaysMutation.mutate({
        scheduleId: currentSchedule.id,
        dayOfWeek: swapSourceDay.dayOfWeek,
        targetDayOfWeek: day.dayOfWeek,
      });
    }
  };

  const handleToggleRestDay = async (day) => {
    const confirmMsg = day.isRestDay ? t('plan:calendar.confirmToWorkoutDay') : t('plan:calendar.confirmToRestDay');
    if (!window.confirm(confirmMsg)) return;
    try {
      await editDayMutation.mutateAsync({
        scheduleId: currentSchedule.id,
        payload: {
          action: 'toggleRest',
          dayOfWeek: day.dayOfWeek,
        },
      });
    } catch (error) {
      alert(getApiErrorMessage(error, t, t('plan:calendar.errors.toggleRestFailed')));
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
      alert(getApiErrorMessage(error, t, t('plan:calendar.errors.saveChangesFailed')));
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
      await editDayMutation.mutateAsync({
        scheduleId: currentSchedule.id,
        payload: {
          action: 'updateWorkoutName',
          dayOfWeek: day.dayOfWeek,
          workoutName: newName,
        },
      });
      setEditingWorkoutName(prev => { const u = { ...prev }; delete u[day.dayOfWeek]; return u; });
    } catch (error) {
      alert(getApiErrorMessage(error, t, t('plan:calendar.errors.updateNameFailed')));
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
          <p className="ft-label">{t('plan:calendar.loading')}</p>
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
          <h2 className="ft-title text-2xl text-white mb-2">{t('plan:calendar.noActivePlanTitle')}</h2>
          <p className="text-sm mb-6" style={{ color: '#A0A0A0' }}>{t('plan:calendar.noActivePlanSubtitle')}</p>
          <button onClick={() => navigate('/weekly-plan-library')} className="ft-btn-primary w-full mb-3">
            {t('plan:calendar.createOrStart')}
          </button>
          <button onClick={() => navigate('/dashboard')} className="ft-btn-ghost w-full text-xs">
            {t('plan:calendar.backToDashboard')}
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
        <div className="max-w-6xl mx-auto ft-header-grid">
          <div className="flex items-center justify-start min-w-0">
            <button
              id="back-btn"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 transition-colors group"
              style={{ color: '#A0A0A0' }}
              onMouseEnter={e => e.currentTarget.style.color = '#CCFF00'}
              onMouseLeave={e => e.currentTarget.style.color = '#A0A0A0'}
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden md:inline font-display font-bold uppercase tracking-widest text-xs whitespace-nowrap">{t('plan:calendar.dashboard')}</span>
            </button>
          </div>

          <div className="min-w-0 text-center">
            <h1 className="ft-title text-xl md:text-2xl text-white leading-none truncate">
              {currentSchedule.weeklyPlanName}
            </h1>
            <p className="text-xs mt-0.5 uppercase tracking-widest font-display font-bold truncate" style={{ color: '#CCFF00' }}>
              {t('plan:calendar.weekNumber', { number: currentSchedule.weekNumber })}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 min-w-0">
            <LanguageSwitcher />
            {!editMode && (
              <button
                id="plan-library-btn"
                onClick={() => navigate('/weekly-plan-library')}
                className="ft-btn-ghost flex items-center gap-2 text-xs whitespace-nowrap"
                style={{ padding: '7px 12px' }}
              >
                <ClipboardList size={13} />
                <span className="hidden sm:inline">{t('plan:calendar.planLibrary')}</span>
              </button>
            )}
            {editMode ? (
              Object.keys(editingWorkoutName).length > 0 ? (
                <button id="save-changes-btn" onClick={saveAllChanges} className="ft-btn-primary flex items-center gap-2 text-xs whitespace-nowrap" style={{ padding: '7px 14px' }}>
                  <Save size={13} /> {t('plan:calendar.save')}
                </button>
              ) : (
                <button id="cancel-edit-btn" onClick={cancelEditMode} className="ft-btn-ghost flex items-center gap-2 text-xs whitespace-nowrap" style={{ padding: '7px 14px' }}>
                  <XIcon size={13} /> {t('plan:calendar.cancel')}
                </button>
              )
            ) : (
              <button id="edit-btn" onClick={() => setEditMode(true)} className="ft-btn-secondary flex items-center gap-2 text-xs whitespace-nowrap" style={{ padding: '7px 14px' }}>
                <Edit2 size={13} /> {t('plan:calendar.edit')}
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
            <p className="ft-label mb-0">{t('plan:calendar.weeklyProgressEyebrow')}</p>
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
          <p className="text-xs mt-1 text-right" style={{ color: '#A0A0A0' }}>{t('plan:calendar.percentComplete', { percent: progressPct })}</p>
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
                  <span className="font-display font-black italic uppercase text-white text-base">{t(`plan:days.${day.dayName}`, { defaultValue: day.dayName })}</span>
                  <div className="flex items-center gap-2">
                    {isTodayDay && <span className="ft-badge-lime" style={{ fontSize: '9px' }}>{t('plan:calendar.today')}</span>}
                    <span className="text-xs font-mono-sport" style={{ color: '#A0A0A0' }}>
                      {formatDate(day.date, lang, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Day body */}
                <div className="p-4 flex-1 flex flex-col">
                  {isRest ? (
                    <div className="flex-1 flex flex-col">
                      <div className={`flex-1 flex flex-col items-center justify-center gap-2 ${editMode ? 'py-3' : 'py-6'}`}>
                        <span style={{ fontSize: '1.5rem' }}>🛌</span>
                        <span className="ft-label text-center mb-0">{t('plan:calendar.restDay')}</span>
                      </div>
                      {editMode && (
                        <div className="mt-auto space-y-2">
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
                            {swapSourceDay?.dayOfWeek === day.dayOfWeek ? t('plan:calendar.selected') : swapSourceDay ? t('plan:calendar.swapHere') : t('plan:calendar.swapDay')}
                          </button>
                          <button
                            onClick={() => handleToggleRestDay(day)}
                            className="w-full py-2.5 font-display font-bold uppercase tracking-wider text-xs transition-colors"
                            style={{ background: 'rgba(255,92,0,0.06)', border: '1px solid rgba(255,92,0,0.3)', borderRadius: '2px', color: '#FF5C00' }}
                          >
                            {t('plan:calendar.makeWorkoutDay')}
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
                          placeholder={t('plan:calendar.workoutNamePlaceholder')}
                        />
                      ) : (
                        <h3 className="font-display font-black italic uppercase text-white text-lg leading-tight mb-1">{day.workout.name}</h3>
                      )}
                      <p className="text-xs mb-4" style={{ color: '#A0A0A0' }}>
                        {t('plan:calendar.exercisesCount', { count: day.workout.exercises?.length || 0 })}
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
                              {swapSourceDay?.dayOfWeek === day.dayOfWeek ? t('plan:calendar.selected') : swapSourceDay ? t('plan:calendar.swapHere') : t('plan:calendar.swapDay')}
                            </button>
                            <button
                              onClick={() => handleToggleRestDay(day)}
                              className="w-full py-2.5 font-display font-bold uppercase tracking-wider text-xs transition-colors"
                              style={{ background: 'rgba(255,92,0,0.06)', border: '1px solid rgba(255,92,0,0.3)', borderRadius: '2px', color: '#FF5C00' }}
                            >
                              {t('plan:calendar.makeRestDay')}
                            </button>
                          </div>
                        ) : isCompleted ? (
                          <div
                            className="flex items-center justify-center gap-2 w-full py-2.5 font-display font-bold uppercase tracking-wider text-xs"
                            style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.3)', borderRadius: '2px', color: '#CCFF00' }}
                          >
                            <CheckCircle2 size={13} /> {t('plan:calendar.completed')}
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
                            <Play size={12} /> {t('plan:calendar.startWorkout')}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkComplete(day)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 font-display font-bold uppercase tracking-wider text-xs transition-colors"
                            style={{ background: 'rgba(204,255,0,0.06)', border: '1px solid rgba(204,255,0,0.3)', borderRadius: '2px', color: '#CCFF00' }}
                          >
                            <CheckCircle2 size={12} /> {t('plan:calendar.markComplete')}
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
              <XIcon size={14} /> {t('plan:calendar.dismissWeek')}
            </button>
            <button
              id="complete-week-btn"
              onClick={handleCompleteWeek}
              className="ft-btn-primary flex items-center justify-center gap-2 px-8 py-3 text-xs"
            >
              <CheckCircle2 size={14} /> {t('plan:calendar.completeWeek')}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
