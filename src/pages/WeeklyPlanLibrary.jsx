import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { ArrowLeft, Play, Plus, Calendar } from "lucide-react";

export default function WeeklyPlanLibrary() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      const response = await axiosClient.get('/weekly-plans');
      setPlans(response.data);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPlan = async (planId) => {
    try {
      await axiosClient.post('/weekly-schedules/start', { weeklyPlanId: planId });
      navigate('/dashboard');
    } catch (error) {
      console.error("Error starting plan:", error);
      alert(error.response?.data?.message || "Failed to start plan");
    }
  };

  return (
    <div className="ft-page min-h-screen">
      {/* Header */}
      <div className="ft-header px-4 md:px-8 py-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
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

          <h1 className="ft-title text-2xl md:text-3xl text-neon-lime">Weekly Plans</h1>

          <button
            id="new-plan-btn"
            onClick={() => navigate('/weekly-planning')}
            className="ft-btn-primary flex items-center gap-2 text-xs"
            style={{ padding: '8px 16px' }}
          >
            <Plus size={14} /> New Plan
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="ft-loader" />
          </div>
        )}

        {!loading && plans.length === 0 && (
          <div
            className="text-center py-20 animate-slide-up"
            style={{ border: '1px dashed rgba(204,255,0,0.15)', borderRadius: '2px' }}
          >
            <Calendar size={40} style={{ color: '#1A1A1A', margin: '0 auto 16px' }} />
            <h2 className="ft-title text-3xl text-white mb-2">No Plans Yet</h2>
            <p className="text-sm mb-6" style={{ color: '#A0A0A0' }}>Create your first weekly workout plan</p>
            <button
              onClick={() => navigate('/weekly-planning')}
              className="ft-btn-primary inline-flex items-center gap-2"
            >
              <Plus size={16} /> Create Plan
            </button>
          </div>
        )}

        {!loading && plans.length > 0 && (
          <>
            <p className="ft-label mb-4">// {plans.length} Plan{plans.length !== 1 ? 's' : ''} Available</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((plan, idx) => {
                const workoutDays = plan.days.filter(d => !d.isRestDay).length;
                const restDays = 7 - workoutDays;
                return (
                  <div
                    key={plan.id}
                    className="relative overflow-hidden p-5 animate-slide-up"
                    style={{
                      background: 'rgba(10,10,10,0.95)',
                      border: '1px solid rgba(204,255,0,0.15)',
                      borderRadius: '2px',
                      animationDelay: `${idx * 0.05}s`,
                      animationFillMode: 'both',
                    }}
                  >
                    {/* Corner accents */}
                    <span style={{ position: 'absolute', top: 0, left: 0, width: 14, height: 14, borderTop: '2px solid #CCFF00', borderLeft: '2px solid #CCFF00' }} />
                    <span style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderBottom: '2px solid #CCFF00', borderRight: '2px solid #CCFF00' }} />

                    {/* Plan name */}
                    <h3 className="ft-title text-2xl text-white mb-1">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm mb-3" style={{ color: '#A0A0A0' }}>{plan.description}</p>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mb-4">
                      <span className="font-mono-sport text-sm" style={{ color: '#CCFF00', fontFamily: "'JetBrains Mono', monospace" }}>
                        {workoutDays} <span className="text-xs" style={{ color: '#A0A0A0', fontFamily: 'Inter, sans-serif' }}>workout days</span>
                      </span>
                      <span style={{ color: '#1A1A1A' }}>|</span>
                      <span className="font-mono-sport text-sm" style={{ color: '#A0A0A0', fontFamily: "'JetBrains Mono', monospace" }}>
                        {restDays} <span className="text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>rest days</span>
                      </span>
                    </div>

                    {/* Day badges */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {plan.days.filter(d => !d.isRestDay).map((day, i) => (
                        <span key={i} className="ft-badge-lime text-[10px]">
                          {day.dayName.slice(0, 3)}: {day.workout.name}
                        </span>
                      ))}
                    </div>

                    {/* Neon divider */}
                    <div className="ft-divider" style={{ margin: '0 0 12px' }} />

                    {/* Buttons */}
                    <div className="flex gap-2">
                      <button
                        id={`edit-plan-${plan.id}`}
                        onClick={() => navigate(`/weekly-planning/${plan.id}`)}
                        className="ft-btn-ghost flex-1 py-2.5 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        id={`start-plan-${plan.id}`}
                        onClick={() => handleStartPlan(plan.id)}
                        className="ft-btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-xs"
                      >
                        <Play size={12} /> Start This Week
                      </button>
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
