import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { weeklyPlanAPI, weeklyScheduleAPI } from "../api";
import { queryKeys } from "../lib/queryClient";
import { ArrowLeft, Play, Plus, Calendar } from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { getApiErrorMessage } from "../utils/localize";

export default function WeeklyPlanLibrary() {
  const { t } = useTranslation(['plan', 'errors']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.weeklyPlans.all,
    queryFn: weeklyPlanAPI.getAll,
  });

  const { data: scheduleData, isError: scheduleError } = useQuery({
    queryKey: queryKeys.weeklySchedule.current,
    queryFn: weeklyScheduleAPI.getCurrent,
    retry: false,
  });

  const activeSchedule =
    !scheduleError && scheduleData && !Array.isArray(scheduleData) ? scheduleData : null;

  const startPlanMutation = useMutation({
    mutationFn: (planId) => weeklyScheduleAPI.start(planId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.weeklySchedule.current });
      navigate('/dashboard');
    },
    onError: (error) => {
      console.error("Error starting plan:", error);
      alert(getApiErrorMessage(error, t, t('plan:library.startFailed')));
    },
  });

  const handleStartPlan = (planId) => {
    startPlanMutation.mutate(planId);
  };

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
              <span className="hidden md:inline font-display font-bold uppercase tracking-widest text-xs whitespace-nowrap">{t('plan:library.backToDashboard')}</span>
            </button>
          </div>

          <h1 className="ft-title text-2xl md:text-3xl text-neon-lime text-center truncate">{t('plan:library.title')}</h1>

          <div className="flex items-center justify-end gap-2 min-w-0">
            <LanguageSwitcher />
            <button
              id="new-plan-btn"
              onClick={() => navigate('/weekly-planning')}
              className="ft-btn-primary flex items-center gap-2 text-xs whitespace-nowrap"
              style={{ padding: '8px 16px' }}
            >
              <Plus size={14} /> {t('plan:library.newPlan')}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="ft-loader" />
          </div>
        )}

        {!loading && activeSchedule && (
          <div
            className="mb-6 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up"
            style={{
              background: 'rgba(204,255,0,0.05)',
              border: '1px solid rgba(204,255,0,0.3)',
              borderRadius: '2px',
            }}
          >
            <div>
              <p className="font-display font-bold uppercase tracking-wider text-sm" style={{ color: '#CCFF00' }}>
                {t('plan:library.activeBannerTitle', {
                  name: activeSchedule.weeklyPlanName,
                  completed: activeSchedule.completedDays,
                  total: activeSchedule.totalWorkoutDays,
                })}
              </p>
              <p className="text-xs mt-1" style={{ color: '#A0A0A0' }}>
                {t('plan:library.activeBannerSubtitle')}
              </p>
            </div>
            <button
              id="view-current-week-banner-btn"
              onClick={() => navigate('/weekly-schedule')}
              className="ft-btn-secondary flex items-center justify-center gap-2 text-xs shrink-0"
              style={{ padding: '8px 14px' }}
            >
              <Calendar size={13} /> {t('plan:library.viewCurrentWeek')}
            </button>
          </div>
        )}

        {!loading && plans.length === 0 && (
          <div
            className="text-center py-20 animate-slide-up"
            style={{ border: '1px dashed rgba(204,255,0,0.15)', borderRadius: '2px' }}
          >
            <Calendar size={40} style={{ color: '#1A1A1A', margin: '0 auto 16px' }} />
            <h2 className="ft-title text-3xl text-white mb-2">{t('plan:library.noPlansTitle')}</h2>
            <p className="text-sm mb-6" style={{ color: '#A0A0A0' }}>{t('plan:library.noPlansSubtitle')}</p>
            <button
              onClick={() => navigate('/weekly-planning')}
              className="ft-btn-primary inline-flex items-center gap-2"
            >
              <Plus size={16} /> {t('plan:library.createPlan')}
            </button>
          </div>
        )}

        {!loading && plans.length > 0 && (
          <>
            <p className="ft-label mb-4">{t('plan:library.availableCount', { count: plans.length })}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan, idx) => {
                const workoutDays = plan.days.filter(d => !d.isRestDay).length;
                const restDays = 7 - workoutDays;
                const isActivePlan = Boolean(
                  activeSchedule?.weeklyPlanId &&
                  String(activeSchedule.weeklyPlanId) === String(plan.id)
                );
                const hasOtherActivePlan = Boolean(activeSchedule && !isActivePlan);
                return (
                  <div
                    key={plan.id}
                    className="relative overflow-hidden p-5 flex flex-col animate-slide-up"
                    style={{
                      background: 'rgba(10,10,10,0.95)',
                      border: isActivePlan ? '1px solid #CCFF00' : '1px solid rgba(204,255,0,0.15)',
                      borderRadius: '2px',
                      boxShadow: isActivePlan ? '0 0 16px rgba(204,255,0,0.15)' : 'none',
                      animationDelay: `${idx * 0.05}s`,
                      animationFillMode: 'both',
                    }}
                  >
                    {/* Corner accents */}
                    <span style={{ position: 'absolute', top: 0, left: 0, width: 14, height: 14, borderTop: '2px solid #CCFF00', borderLeft: '2px solid #CCFF00' }} />
                    <span style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderBottom: '2px solid #CCFF00', borderRight: '2px solid #CCFF00' }} />

                    {/* Plan name */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="ft-title text-2xl text-white">{plan.name}</h3>
                      {isActivePlan && (
                        <span className="ft-badge-lime shrink-0">{t('plan:library.activeThisWeek')}</span>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-sm mb-3" style={{ color: '#A0A0A0' }}>{plan.description}</p>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mb-4">
                      <span className="font-mono-sport text-sm" style={{ color: '#CCFF00', fontFamily: "'JetBrains Mono', monospace" }}>
                        {workoutDays} <span className="text-xs" style={{ color: '#A0A0A0', fontFamily: 'Inter, sans-serif' }}>{t('plan:library.workoutDays')}</span>
                      </span>
                      <span style={{ color: '#1A1A1A' }}>|</span>
                      <span className="font-mono-sport text-sm" style={{ color: '#A0A0A0', fontFamily: "'JetBrains Mono', monospace" }}>
                        {restDays} <span className="text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>{t('plan:library.restDays')}</span>
                      </span>
                    </div>

                    {/* Day badges */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {plan.days.filter(d => !d.isRestDay).map((day, i) => (
                        <span key={i} className="ft-badge-lime text-[10px]">
                          {t(`plan:daysShort.${day.dayName}`, { defaultValue: day.dayName.slice(0, 3) })}: {day.workout.name}
                        </span>
                      ))}
                    </div>

                    <div className="mt-auto">
                      {isActivePlan && (
                        <p className="text-xs mb-3" style={{ color: '#A0A0A0' }}>
                          {t('plan:library.activePlanEditHint')}
                        </p>
                      )}

                      {/* Neon divider */}
                      <div className="ft-divider" style={{ margin: '0 0 12px' }} />

                      {/* Buttons */}
                      <div className="flex gap-2">
                        <button
                          id={`edit-plan-${plan.id}`}
                          onClick={() => navigate(`/weekly-planning/${plan.id}`)}
                          className="ft-btn-ghost flex-1 py-2.5 text-xs"
                        >
                          {t('plan:library.edit')}
                        </button>
                        {isActivePlan ? (
                          <button
                            id={`view-week-${plan.id}`}
                            onClick={() => navigate('/weekly-schedule')}
                            className="ft-btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-xs"
                          >
                            <Calendar size={12} /> {t('plan:library.viewCurrentWeek')}
                          </button>
                        ) : hasOtherActivePlan ? (
                          <button
                            id={`start-plan-${plan.id}`}
                            type="button"
                            disabled
                            title={t('plan:library.weekAlreadyActiveHint')}
                            className="ft-btn-ghost flex-1 flex items-center justify-center gap-2 py-2.5 text-xs opacity-50 cursor-not-allowed"
                          >
                            <Play size={12} /> {t('plan:library.startThisWeek')}
                          </button>
                        ) : (
                          <button
                            id={`start-plan-${plan.id}`}
                            onClick={() => handleStartPlan(plan.id)}
                            disabled={startPlanMutation.isPending}
                            className="ft-btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-xs disabled:opacity-50"
                          >
                            <Play size={12} /> {t('plan:library.startThisWeek')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
