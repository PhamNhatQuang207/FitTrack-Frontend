import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { ArrowLeft, Play, Plus, Calendar } from "lucide-react";
import dashboardBg from "../assets/icons/dashboard_background.jpg";

export default function WeeklyPlanLibrary() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

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
      await axiosClient.post('/weekly-schedules/start', {
        weeklyPlanId: planId
      });
      alert("Weekly schedule started! Check your dashboard.");
      navigate('/dashboard');
    } catch (error) {
      console.error("Error starting plan:", error);
      alert(error.response?.data?.message || "Failed to start plan");
    }
  };

  return (
    <div
      className="min-h-screen w-full text-white bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95)), url(${dashboardBg})`,
        backgroundAttachment: "fixed",
      }}
    >
      <div className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur-md border-b border-gray-700/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back</span>
            </button>
            <h1 className="text-xl font-bold">Weekly Plans</h1>
            <button
              onClick={() => navigate('/weekly-planning')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Weekly Plans Yet</h2>
            <p className="text-gray-400 mb-6">Create your first weekly workout plan</p>
            <button
              onClick={() => navigate('/weekly-planning')}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
            >
              Create Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map(plan => {
              const workoutDays = plan.days.filter(d => !d.isRestDay).length;
              return (
                <div
                  key={plan.id}
                  className="bg-gray-800/60 backdrop-blur-sm p-6 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all"
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm text-gray-400">{plan.description}</p>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-2">
                      {workoutDays} workout days, {7 - workoutDays} rest days
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {plan.days.filter(d => !d.isRestDay).map((day, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gray-700/50 rounded-full text-xs">
                          {day.dayName}: {day.workout.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/weekly-planning/${plan.id}`)}
                      className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleStartPlan(plan.id)}
                      className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start This Week
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
