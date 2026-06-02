import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import axiosClient from "../api/axiosClient";
import { Dumbbell, TrendingUp, Calendar, Zap, User, ClipboardList, Play, Bell } from "lucide-react";

// ── Mini stat card ─────────────────────────────────────────
function StatCard({ icon: Icon, value, label, accent = "lime", delay = "" }) {
  const isLime = accent === "lime";
  const color = isLime ? "#CCFF00" : "#FF5C00";
  const bg = isLime ? "rgba(204,255,0,0.06)" : "rgba(255,92,0,0.06)";
  const border = isLime ? "rgba(204,255,0,0.2)" : "rgba(255,92,0,0.2)";
  const glow = isLime ? "rgba(204,255,0,0.3)" : "rgba(255,92,0,0.3)";

  return (
    <div
      className={`relative overflow-hidden p-5 ${delay}`}
      style={{
        background: "rgba(10,10,10,0.9)",
        border: `1px solid ${border}`,
        borderRadius: "2px",
        transition: "border-color 0.25s, box-shadow 0.25s, transform 0.25s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.boxShadow = `0 0 16px ${glow}`;
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = border;
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Top-left corner accent */}
      <span style={{ position: "absolute", top: 0, left: 0, width: 14, height: 14, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
      {/* Bottom-right corner accent */}
      <span style={{ position: "absolute", bottom: 0, right: 0, width: 14, height: 14, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />

      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 flex items-center justify-center"
          style={{ background: bg, border: `1px solid ${border}`, borderRadius: "2px" }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        <div className="text-right">
          <div
            className="font-mono-sport font-bold text-3xl leading-none"
            style={{ color, fontFamily: "'JetBrains Mono', monospace" }}
          >
            {value}
          </div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="w-full h-[2px] rounded-full mb-3" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full" style={{ width: "60%", background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
      <p className="text-xs uppercase tracking-widest font-display font-bold" style={{ color: "#A0A0A0" }}>
        {label}
      </p>
    </div>
  );
}

// ── Feature card ───────────────────────────────────────────
function FeatureCard({ icon: Icon, title, description, extra, onClick, accent = "lime", delay = "" }) {
  const isLime = accent === "lime";
  const color = isLime ? "#CCFF00" : "#FF5C00";
  const bg = isLime ? "rgba(204,255,0,0.06)" : "rgba(255,92,0,0.06)";
  const border = isLime ? "rgba(204,255,0,0.15)" : "rgba(255,92,0,0.15)";
  const glow = isLime ? "rgba(204,255,0,0.25)" : "rgba(255,92,0,0.25)";

  return (
    <div
      className={`relative overflow-hidden cursor-pointer p-6 group ${delay}`}
      style={{
        background: "rgba(10,10,10,0.95)",
        border: `1px solid ${border}`,
        borderRadius: "2px",
        transition: "border-color 0.25s, box-shadow 0.25s, transform 0.25s",
      }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.boxShadow = `0 0 20px ${glow}, inset 0 0 30px rgba(${isLime ? '204,255,0' : '255,92,0'},0.03)`;
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = border;
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Corner accents */}
      <span style={{ position: "absolute", top: 0, left: 0, width: 16, height: 16, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
      <span style={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />

      {/* Diagonal scan line */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${isLime ? 'rgba(204,255,0,0.04)' : 'rgba(255,92,0,0.04)'} 0%, transparent 60%)`,
        }}
      />

      <div className="flex items-start gap-5 relative z-10">
        <div
          className="w-14 h-14 flex-shrink-0 flex items-center justify-center"
          style={{
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: "2px",
            boxShadow: `0 0 12px ${glow}`,
          }}
        >
          <Icon size={26} style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          <h2
            className="mb-1 leading-tight"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontStyle: "italic",
              fontWeight: 800,
              fontSize: "1.35rem",
              textTransform: "uppercase",
              color: "#ffffff",
              letterSpacing: "0.02em",
            }}
          >
            {title}
          </h2>
          <p className="text-sm mb-3" style={{ color: "#A0A0A0", lineHeight: 1.5 }}>{description}</p>
          {extra && (
            <span className="text-xs font-display font-bold uppercase tracking-widest" style={{ color }}>
              {extra}
            </span>
          )}
        </div>

        <div
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center self-center transition-transform group-hover:translate-x-1"
          style={{ border: `1px solid ${border}`, borderRadius: "2px", color }}
        >
          ›
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    currentWeight: null,
    weeklyWorkouts: 0,
    streak: 0,
    plannedSessions: 0,
    totalVolume: 0,
    avgExercises: 0,
  });
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [plannedWorkouts, setPlannedWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [scheduleRes, progressRes, sessionsRes] = await Promise.allSettled([
        axiosClient.get('/weekly-schedules/current'),
        axiosClient.get('/users/progress'),
        axiosClient.get('/workout-sessions')
      ]);

      if (scheduleRes.status === 'fulfilled') setActiveSchedule(scheduleRes.value.data);
      else setActiveSchedule(null);

      const progressData = progressRes.status === 'fulfilled' ? progressRes.value.data : {};
      const sessions = sessionsRes.status === 'fulfilled' ? sessionsRes.value.data : [];

      const currentWeight = progressData.weightHistory?.length > 0
        ? progressData.weightHistory[progressData.weightHistory.length - 1].value
        : null;

      const completedSessions = sessions.filter(s => s.status === 'completed');
      const weeklyWorkouts = activeSchedule
        ? activeSchedule.completedDays
        : completedSessions.filter(s => {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return new Date(s.date) >= oneWeekAgo;
          }).length;

      const planned = sessions.filter(s => s.status === 'planned');

      // Calculate total volume
      const totalVolume = completedSessions.reduce((total, session) => {
        return total + (session.exercises || []).reduce((sum, ex) => {
          return sum + (ex.actualSets || []).reduce((s2, set) => s2 + (set.weight * set.reps), 0);
        }, 0);
      }, 0);

      const avgExercises = completedSessions.length > 0
        ? Math.round(completedSessions.reduce((s, sess) => s + (sess.exercises?.length || 0), 0) / completedSessions.length)
        : 0;

      setStats({ totalWorkouts: completedSessions.length, currentWeight, weeklyWorkouts, streak: weeklyWorkouts, plannedSessions: planned.length, totalVolume, avgExercises });
      setPlannedWorkouts(planned);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleWeeklyActionClick = () => {
    if (activeSchedule) navigate("/weekly-schedule");
    else navigate("/weekly-plan-library");
  };

  const formatVolume = (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v;

  return (
    <div className="ft-page min-h-screen">
      {/* ── Header ── */}
      <header className="ft-header px-4 md:px-8 py-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="2" fill="#CCFF00" />
              <text x="18" y="26" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight="900" fontSize="22" fontStyle="italic" fill="#000">F</text>
            </svg>
            <span className="ft-title text-2xl tracking-widest text-neon-lime text-glow-lime">FitTrack</span>
          </div>

          {/* User info */}
          <div className="flex items-center gap-4">
            <button
              id="notification-btn"
              className="w-9 h-9 flex items-center justify-center transition-colors"
              style={{ border: "1px solid #1A1A1A", borderRadius: "2px", color: "#A0A0A0" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#CCFF00"; e.currentTarget.style.color = "#CCFF00"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1A1A1A"; e.currentTarget.style.color = "#A0A0A0"; }}
            >
              <Bell size={16} />
            </button>
            <button
              id="profile-btn"
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 group"
            >
              <div
                className="w-9 h-9 flex items-center justify-center transition-colors"
                style={{ background: "rgba(204,255,0,0.1)", border: "1px solid rgba(204,255,0,0.3)", borderRadius: "2px" }}
              >
                <User size={16} style={{ color: "#CCFF00" }} />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs uppercase tracking-widest font-display font-bold" style={{ color: "#A0A0A0" }}>Athlete</p>
                <p className="text-sm font-semibold text-white leading-none">{user?.name || 'User'}</p>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">

        {/* Welcome banner */}
        <div className="mb-8 animate-slide-up">
          <p className="text-xs uppercase tracking-[0.3em] font-display font-bold mb-1" style={{ color: "#CCFF00" }}>
            // Dashboard
          </p>
          <h1 className="ft-title text-5xl md:text-6xl text-white leading-none mb-2">
            Welcome back,{" "}
            <span className="text-neon-lime text-glow-lime">{user?.name?.split(" ")[0] || "Athlete"}</span>
          </h1>
          <p style={{ color: "#A0A0A0" }} className="text-sm">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* ── Stats row ── */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard icon={Dumbbell} value={stats.weeklyWorkouts} label="This Week" accent="lime" delay="ft-stagger-1" />
            <StatCard icon={TrendingUp} value={formatVolume(stats.totalVolume)} label="Volume (kg)" accent="orange" delay="ft-stagger-2" />
            <StatCard icon={Zap} value={stats.avgExercises || '--'} label="Avg Exercises" accent="lime" delay="ft-stagger-3" />
            <StatCard icon={Calendar} value={stats.currentWeight ? `${stats.currentWeight}` : '--'} label="Weight (kg)" accent="orange" delay="ft-stagger-4" />
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="ft-loader" />
          </div>
        )}

        {/* ── Feature cards grid ── */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <FeatureCard
              icon={ClipboardList}
              title={activeSchedule ? "Current Schedule" : "Weekly Planning"}
              description={
                activeSchedule
                  ? `Continue "${activeSchedule.weeklyPlanName}" — ${activeSchedule.completedDays}/${activeSchedule.totalWorkoutDays} sessions done.`
                  : "Create or start a weekly workout plan to stay consistent."
              }
              extra={activeSchedule ? `${Math.round((activeSchedule.completedDays / activeSchedule.totalWorkoutDays) * 100)}% complete` : null}
              onClick={handleWeeklyActionClick}
              accent="lime"
              delay="ft-stagger-1"
            />
            <FeatureCard
              icon={Dumbbell}
              title="Single Workout"
              description="Plan a one-time workout session for today."
              extra={stats.plannedSessions > 0 ? `${stats.plannedSessions} session${stats.plannedSessions !== 1 ? 's' : ''} planned` : null}
              onClick={() => navigate('/workout-planning')}
              accent="orange"
              delay="ft-stagger-2"
            />
            <FeatureCard
              icon={Calendar}
              title="Workout History"
              description="View your past workout sessions and track progress."
              extra={stats.totalWorkouts > 0 ? `${stats.totalWorkouts} workout${stats.totalWorkouts !== 1 ? 's' : ''} logged` : null}
              onClick={() => navigate('/workout-history')}
              accent="orange"
              delay="ft-stagger-3"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Progress Tracking"
              description="Monitor your fitness journey and track measurements."
              extra={stats.totalWorkouts > 0 ? `${stats.totalWorkouts} sessions analyzed` : null}
              onClick={() => navigate('/progress-tracking')}
              accent="lime"
              delay="ft-stagger-4"
            />
          </div>
        )}

        {/* ── Planned Workouts (legacy) ── */}
        {plannedWorkouts.length > 0 && (
          <div className="mt-4">
            <p className="ft-label mb-4">// Upcoming Sessions</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plannedWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  className="flex items-center justify-between p-4 gap-4"
                  style={{ background: "rgba(10,10,10,0.9)", border: "1px solid rgba(204,255,0,0.15)", borderRadius: "2px" }}
                >
                  <div>
                    <h3 className="font-display font-bold italic uppercase text-white text-lg leading-tight">{workout.name}</h3>
                    <p className="text-xs mt-1" style={{ color: "#A0A0A0" }}>{workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {workout.exercises.slice(0, 2).map((ex, idx) => (
                        <span key={idx} className="ft-badge-gray">{ex.exerciseName}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/workout/${workout.id}`)}
                    className="ft-btn-primary flex items-center gap-2 text-xs flex-shrink-0"
                    style={{ padding: "8px 16px" }}
                  >
                    <Play size={14} /> Start
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer quote ── */}
      <footer className="fixed bottom-0 w-full py-4 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(5,5,5,0.9) 0%, transparent 100%)" }}>
        <p
          className="text-center italic text-sm font-display font-semibold"
          style={{ color: "rgba(160,160,160,0.7)", letterSpacing: "0.05em" }}
        >
          "Today's effort is tomorrow's result!"
        </p>
      </footer>
    </div>
  );
}
