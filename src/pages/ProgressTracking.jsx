import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { ArrowLeft, TrendingUp, Dumbbell, Activity, Calendar } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import dashboardBg from "../assets/icons/dashboard_background.jpg";

export default function ProgressTracking() {
  const navigate = useNavigate();
  const [selectedExercise, setSelectedExercise] = useState("");
  const [exercises, setExercises] = useState([]);
  const [progressionData, setProgressionData] = useState([]);
  const [weeklyProgress, setWeeklyProgress] = useState([]);
  const [stats, setStats] = useState(null);
  const [bodyMetrics, setBodyMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedExercise) {
      fetchProgressionData();
    }
  }, [selectedExercise]);

  const fetchInitialData = async () => {
    try {
      // Fetch user exercises
      const exercisesRes = await axiosClient.get('/analytics/user-exercises');
      setExercises(exercisesRes.data);
      
      // Select first exercise by default
      if (exercisesRes.data.length > 0) {
        setSelectedExercise(exercisesRes.data[0]);
      }

      // Fetch workout stats
      const statsRes = await axiosClient.get('/analytics/workout-stats');
      setStats(statsRes.data);

      // Fetch weekly progress
      const weeklyRes = await axiosClient.get('/analytics/weekly-progress');
      setWeeklyProgress(weeklyRes.data);

      // Fetch body metrics
      const metricsRes = await axiosClient.get('/users/progress');
      setBodyMetrics(metricsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgressionData = async () => {
    try {
      const response = await axiosClient.get(`/analytics/strength-progression/${encodeURIComponent(selectedExercise)}`);
      setProgressionData(response.data);
    } catch (error) {
      console.error("Error fetching progression data:", error);
    }
  };

  const getLatestWeight = () => {
    return bodyMetrics?.weightHistory?.length > 0
      ? bodyMetrics.weightHistory[bodyMetrics.weightHistory.length - 1].value
      : null;
  };

  const getLatestBodyFat = () => {
    return bodyMetrics?.bodyFatHistory?.length > 0
      ? bodyMetrics.bodyFatHistory[bodyMetrics.bodyFatHistory.length - 1].value
      : null;
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading progress data...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full text-white bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(17, 24, 39, 0.9), rgba(31, 41, 55, 0.9)), url(${dashboardBg})`,
        backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors group"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium hidden md:inline">Back to Dashboard</span>
            </button>
            
            <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Progress Tracking
            </h1>

            <div className="w-20 md:w-32"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm p-6 rounded-xl border border-blue-500/30">
                <div className="flex items-center justify-between mb-2">
                  <Dumbbell className="w-8 h-8 text-blue-400" />
                  <span className="text-3xl font-bold">{stats.totalCompleted}</span>
                </div>
                <p className="text-sm text-gray-300">Total Workouts</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-sm p-6 rounded-xl border border-purple-500/30">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                  <span className="text-3xl font-bold">{stats.totalVolume.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-300">Total Volume (kg)</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-sm p-6 rounded-xl border border-green-500/30">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-8 h-8 text-green-400" />
                  <span className="text-3xl font-bold">{stats.averageExercisesPerWorkout}</span>
                </div>
                <p className="text-sm text-gray-300">Avg Exercises/Workout</p>
              </div>

              <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 backdrop-blur-sm p-6 rounded-xl border border-amber-500/30">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-8 h-8 text-amber-400" />
                  <span className="text-3xl font-bold">{getLatestWeight() || '--'}</span>
                </div>
                <p className="text-sm text-gray-300">Current Weight (kg)</p>
              </div>
            </div>
          )}

          {/* Strength Progression Chart */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Strength Progression</h2>
              
              {/* Exercise Selector */}
              <select
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-white"
              >
                {exercises.map(exercise => (
                  <option key={exercise} value={exercise}>{exercise}</option>
                ))}
              </select>
            </div>

            {progressionData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={progressionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF' }}
                      label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: '#E5E7EB' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', r: 5 }}
                      activeDot={{ r: 8 }}
                      name="Max Weight (kg)"
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Progression Stats */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="bg-gray-700/30 p-4 rounded-lg text-center">
                    <p className="text-gray-400 text-sm mb-1">Starting Weight</p>
                    <p className="text-2xl font-bold">{progressionData[0]?.weight}kg</p>
                  </div>
                  <div className="bg-gray-700/30 p-4 rounded-lg text-center">
                    <p className="text-gray-400 text-sm mb-1">Current Weight</p>
                    <p className="text-2xl font-bold">{progressionData[progressionData.length - 1]?.weight}kg</p>
                  </div>
                  <div className="bg-gray-700/30 p-4 rounded-lg text-center">
                    <p className="text-gray-400 text-sm mb-1">Total Gain</p>
                    <p className="text-2xl font-bold text-green-400">
                      +{(progressionData[progressionData.length - 1]?.weight - progressionData[0]?.weight).toFixed(1)}kg
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>No progression data available for {selectedExercise}</p>
                <p className="text-sm mt-2">Complete some workouts with this exercise to see your progress!</p>
              </div>
            )}
          </div>



          {/* Weekly Consistency Chart */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 mb-6">
            <h2 className="text-2xl font-bold mb-6">Weekly Consistency</h2>
            {weeklyProgress.length > 0 ? (
               <div className="bg-gray-700/30 p-6 rounded-xl">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weeklyProgress}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis 
                        dataKey="weekLabel" 
                        stroke="#9CA3AF" 
                        tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                      />
                      <YAxis 
                        stroke="#9CA3AF" 
                        tick={{ fill: '#9CA3AF' }}
                        domain={[0, 100]}
                        unit="%"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => [`${value}%`, 'Completion Rate']}
                      />
                      <Bar 
                        dataKey="rate" 
                        fill="#3B82F6" 
                        radius={[4, 4, 0, 0]}
                        name="Completion Rate"
                      >
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-center text-gray-400 mt-4 text-sm">
                    Percentage of planned workouts completed per week
                  </p>
               </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>No weekly plan data available yet.</p>
                <p className="text-sm mt-2">Start a weekly plan to track your consistency!</p>
              </div>
            )}
          </div>
          
          {/* Body Metrics */}
          {bodyMetrics && (getLatestWeight() || getLatestBodyFat()) && (
            <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
              <h2 className="text-2xl font-bold mb-6">Body Metrics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Weight Trend */}
                {bodyMetrics.weightHistory?.length > 0 && (
                  <div className="bg-gray-700/30 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold mb-4">Weight Trend</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={bodyMetrics.weightHistory.map(w => ({
                        date: new Date(w.date).toLocaleDateString(),
                        value: w.value
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                        <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                        />
                        <Line type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} name="Weight (kg)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Body Fat Trend */}
                {bodyMetrics.bodyFatHistory?.length > 0 && (
                  <div className="bg-gray-700/30 p-6 rounded-xl">
                    <h3 className="text-lg font-semibold mb-4">Body Fat Trend</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={bodyMetrics.bodyFatHistory.map(bf => ({
                        date: new Date(bf.date).toLocaleDateString(),
                        value: bf.value
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                        <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1F2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px'
                          }}
                        />
                        <Line type="monotone" dataKey="value" stroke="#EC4899" strokeWidth={2} dot={{ r: 4 }} name="Body Fat (%)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
