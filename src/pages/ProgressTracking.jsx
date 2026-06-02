import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { ArrowLeft, TrendingUp, Dumbbell, Activity, Calendar } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

// ── Shared chart tooltip style ──
const TOOLTIP_STYLE = {
  backgroundColor: '#0A0A0A',
  border: '1px solid rgba(204,255,0,0.3)',
  borderRadius: '2px',
  fontSize: '12px',
  color: '#fff',
  fontFamily: "'Inter', sans-serif",
};

// ── Mini stat card for progress page ──
function MiniStatCard({ icon: Icon, value, label, accent = "lime" }) {
  const color = accent === "lime" ? "#CCFF00" : "#FF5C00";
  const border = accent === "lime" ? "rgba(204,255,0,0.2)" : "rgba(255,92,0,0.2)";
  const bg = accent === "lime" ? "rgba(204,255,0,0.06)" : "rgba(255,92,0,0.06)";
  return (
    <div
      className="relative overflow-hidden p-4"
      style={{ background: 'rgba(10,10,10,0.9)', border: `1px solid ${border}`, borderRadius: '2px' }}
    >
      <span style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
      <div className="flex items-end justify-between mb-1">
        <Icon size={18} style={{ color }} />
        <span className="font-mono-sport font-bold text-2xl leading-none" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
          {value}
        </span>
      </div>
      <p className="text-xs uppercase tracking-widest font-display font-bold mt-2" style={{ color: '#A0A0A0' }}>{label}</p>
    </div>
  );
}

export default function ProgressTracking() {
  const navigate = useNavigate();
  const [selectedExercise, setSelectedExercise] = useState("");
  const [exercises, setExercises] = useState([]);
  const [progressionData, setProgressionData] = useState([]);
  const [weeklyProgress, setWeeklyProgress] = useState([]);
  const [stats, setStats] = useState(null);
  const [bodyMetrics, setBodyMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchInitialData(); }, []);

  const fetchProgressionData = useCallback(async () => {
    try {
      const response = await axiosClient.get(`/analytics/strength-progression/${encodeURIComponent(selectedExercise)}`);
      setProgressionData(response.data);
    } catch (error) {
      console.error("Error fetching progression data:", error);
    }
  }, [selectedExercise]);

  useEffect(() => {
    if (selectedExercise) fetchProgressionData();
  }, [selectedExercise, fetchProgressionData]);

  const fetchInitialData = async () => {
    try {
      const [exercisesRes, statsRes, weeklyRes, metricsRes] = await Promise.all([
        axiosClient.get('/analytics/user-exercises'),
        axiosClient.get('/analytics/workout-stats'),
        axiosClient.get('/analytics/weekly-progress'),
        axiosClient.get('/users/progress')
      ]);

      setExercises(exercisesRes.data);
      if (exercisesRes.data.length > 0) setSelectedExercise(exercisesRes.data[0]);
      setStats(statsRes.data);
      setWeeklyProgress(weeklyRes.data);
      setBodyMetrics(metricsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLatestWeight = () =>
    bodyMetrics?.weightHistory?.length > 0
      ? bodyMetrics.weightHistory[bodyMetrics.weightHistory.length - 1].value
      : null;

  const getLatestBodyFat = () =>
    bodyMetrics?.bodyFatHistory?.length > 0
      ? bodyMetrics.bodyFatHistory[bodyMetrics.bodyFatHistory.length - 1].value
      : null;

  if (loading) {
    return (
      <div className="ft-page min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="ft-loader mx-auto mb-4" />
          <p className="ft-label">Loading Progress Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ft-page min-h-screen">
      {/* Header */}
      <div className="ft-header px-4 md:px-8 py-0">
        <div className="max-w-6xl mx-auto flex items-center h-16 gap-4">
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
          <div className="flex-1 text-center">
            <h1 className="ft-title text-2xl md:text-3xl text-neon-lime">Progress Tracking</h1>
          </div>
          <div className="w-20 hidden md:block" />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 animate-slide-up">
            <MiniStatCard icon={Dumbbell} value={stats.totalCompleted} label="Total Workouts" accent="lime" />
            <MiniStatCard
              icon={TrendingUp}
              value={stats.totalVolume >= 1000 ? `${(stats.totalVolume / 1000).toFixed(1)}k` : stats.totalVolume}
              label="Volume (kg)"
              accent="orange"
            />
            <MiniStatCard icon={Activity} value={stats.averageExercisesPerWorkout} label="Avg Exercises" accent="lime" />
            <MiniStatCard icon={Calendar} value={getLatestWeight() || '--'} label="Weight (kg)" accent="orange" />
          </div>
        )}

        {/* Strength Progression */}
        <div
          className="mb-6 p-5 md:p-6 animate-slide-up"
          style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: '2px' }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <p className="ft-label mb-1">// Strength Progression</p>
              <h2 className="ft-title text-2xl text-white">
                {selectedExercise || 'Select Exercise'}
              </h2>
            </div>

            {/* Exercise selector */}
            <select
              id="exercise-selector"
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="ft-input md:w-60"
              style={{ cursor: 'pointer' }}
            >
              {exercises.map(exercise => (
                <option key={exercise} value={exercise} style={{ background: '#0A0A0A', color: '#fff' }}>
                  {exercise}
                </option>
              ))}
            </select>
          </div>

          {progressionData.length > 0 ? (
            <>
              <div className="h-[280px] md:h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#333"
                      tick={{ fill: '#555', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                      axisLine={{ stroke: '#1A1A1A' }}
                    />
                    <YAxis
                      stroke="#333"
                      tick={{ fill: '#555', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                      width={40}
                      axisLine={{ stroke: '#1A1A1A' }}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#A0A0A0' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: "'Barlow Condensed', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#CCFF00"
                      strokeWidth={2}
                      dot={{ fill: '#CCFF00', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#CCFF00', boxShadow: '0 0 8px #CCFF00' }}
                      name="Weight (kg)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Progression stats */}
              <div className="grid grid-cols-3 gap-2 mt-5">
                {[
                  { label: 'Start', value: `${progressionData[0]?.weight}kg` },
                  { label: 'Current', value: `${progressionData[progressionData.length - 1]?.weight}kg` },
                  { label: 'Gain', value: `+${(progressionData[progressionData.length - 1]?.weight - progressionData[0]?.weight).toFixed(1)}`, color: '#CCFF00' },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="text-center py-3"
                    style={{ background: 'rgba(204,255,0,0.04)', border: '1px solid rgba(204,255,0,0.1)', borderRadius: '2px' }}
                  >
                    <p className="text-xs uppercase tracking-widest font-display font-bold mb-1" style={{ color: '#555' }}>{label}</p>
                    <p className="font-mono-sport font-bold text-xl" style={{ color: color || '#fff', fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              className="text-center py-16"
              style={{ border: '1px dashed rgba(204,255,0,0.1)', borderRadius: '2px' }}
            >
              <p className="ft-title text-xl text-white mb-1">No Data Yet</p>
              <p className="text-sm" style={{ color: '#A0A0A0' }}>
                Complete some workouts with {selectedExercise || 'this exercise'} to see progression!
              </p>
            </div>
          )}
        </div>

        {/* Weekly Consistency */}
        <div
          className="mb-6 p-5 md:p-6 animate-slide-up"
          style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,92,0,0.15)', borderRadius: '2px' }}
        >
          <p className="ft-label mb-1">// Weekly Consistency</p>
          <h2 className="ft-title text-2xl text-white mb-6">Completion Rate</h2>

          {weeklyProgress.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="weekLabel"
                    stroke="#333"
                    tick={{ fill: '#555', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                    axisLine={{ stroke: '#1A1A1A' }}
                  />
                  <YAxis
                    stroke="#333"
                    tick={{ fill: '#555', fontFamily: "'JetBrains Mono', monospace" }}
                    domain={[0, 100]}
                    unit="%"
                    axisLine={{ stroke: '#1A1A1A' }}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => [`${value}%`, 'Completion Rate']}
                  />
                  <Bar
                    dataKey="rate"
                    fill="#FF5C00"
                    radius={[2, 2, 0, 0]}
                    name="Completion Rate"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              className="text-center py-12"
              style={{ border: '1px dashed rgba(255,92,0,0.1)', borderRadius: '2px' }}
            >
              <p className="ft-title text-xl text-white mb-1">No Weekly Data</p>
              <p className="text-sm" style={{ color: '#A0A0A0' }}>Start a weekly plan to track consistency!</p>
            </div>
          )}
        </div>

        {/* Body Metrics */}
        {bodyMetrics && (getLatestWeight() || getLatestBodyFat()) && (
          <div
            className="p-5 md:p-6 animate-slide-up"
            style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(204,255,0,0.15)', borderRadius: '2px' }}
          >
            <p className="ft-label mb-1">// Body Metrics</p>
            <h2 className="ft-title text-2xl text-white mb-6">Physical Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bodyMetrics.weightHistory?.length > 0 && (
                <div style={{ background: 'rgba(204,255,0,0.03)', border: '1px solid rgba(204,255,0,0.08)', borderRadius: '2px', padding: '16px' }}>
                  <p className="ft-label mb-3">Weight Trend</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={bodyMetrics.weightHistory.map(w => ({
                      date: new Date(w.date).toLocaleDateString(), value: w.value
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="date" stroke="#333" tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#1A1A1A' }} />
                      <YAxis stroke="#333" tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#1A1A1A' }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Line type="monotone" dataKey="value" stroke="#CCFF00" strokeWidth={2} dot={{ r: 2, fill: '#CCFF00', strokeWidth: 0 }} name="Weight (kg)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {bodyMetrics.bodyFatHistory?.length > 0 && (
                <div style={{ background: 'rgba(255,92,0,0.03)', border: '1px solid rgba(255,92,0,0.08)', borderRadius: '2px', padding: '16px' }}>
                  <p className="ft-label mb-3">Body Fat Trend</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={bodyMetrics.bodyFatHistory.map(bf => ({
                      date: new Date(bf.date).toLocaleDateString(), value: bf.value
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="date" stroke="#333" tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#1A1A1A' }} />
                      <YAxis stroke="#333" tick={{ fill: '#555', fontSize: 10 }} axisLine={{ stroke: '#1A1A1A' }} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Line type="monotone" dataKey="value" stroke="#FF5C00" strokeWidth={2} dot={{ r: 2, fill: '#FF5C00', strokeWidth: 0 }} name="Body Fat (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
