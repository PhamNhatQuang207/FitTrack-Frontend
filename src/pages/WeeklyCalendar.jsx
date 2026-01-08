import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { ArrowLeft, Play, CheckCircle2, Calendar as CalendarIcon } from "lucide-react";
import dashboardBg from "../assets/icons/dashboard_background.jpg";

export default function WeeklyCalendar() {
  const navigate = useNavigate();
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentSchedule();
  }, []);

  const fetchCurrentSchedule = async () => {
    try {
      const response = await axiosClient.get('/weekly-schedules/current');
      setCurrentSchedule(response.data);
    } catch (error) {
      console.error("Error fetching schedule:", error);
      setCurrentSchedule(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWorkout = async (day) => {
    try {
      // Create a workout session with schedule metadata
      const response = await axiosClient.post('/workout-sessions', {
        name: day.workout.name,
        date: day.date,
        exercises: day.workout.exercises,
        status: 'planned',
        weeklyScheduleId: currentSchedule.id,
        dayOfWeek: day.dayOfWeek
      });
      
      const sessionId = response.data.sessionId;
      
      // Navigate to active workout
      navigate(`/workout/${sessionId}`);
    } catch (error) {
      console.error("Failed to start workout", error);
      alert("Failed to start workout");
    }
  };

  const handleCompleteWeek = async () => {
    if (!window.confirm("Mark this week as complete? This will end the current schedule.")) {
      return;
    }

    try {
      await axiosClient.patch(`/weekly-schedules/${currentSchedule.id}/complete`);
      alert("Week completed! Great work! 🎉");
      navigate('/weekly-plan-library');
    } catch (error) {
      console.error("Error completing week:", error);
      alert("Failed to complete week");
    }
  };

  const handleDismissWeek = async () => {
    if (!window.confirm("Dismiss this weekly schedule? Your progress will be saved but the schedule will be marked as incomplete.")) {
      return;
    }

    try {
      await axiosClient.patch(`/weekly-schedules/${currentSchedule.id}/complete`);
      navigate('/weekly-plan-library');
    } catch (error) {
      console.error("Error dismissing week:", error);
      alert("Failed to dismiss week");
    }
  };

  const handleMarkComplete = async (day) => {
    try {
      await axiosClient.patch(`/weekly-schedules/${currentSchedule.id}/complete-day`, {
        dayOfWeek: day.dayOfWeek,
        workoutData: {
          exercises: [] // No exercises for this type of workout
        }
      });
      
      // Refresh the schedule to show updated status
      const response = await axiosClient.get('/weekly-schedules/current');
      setCurrentSchedule(response.data);
      
      alert(`${day.workout.name} marked as complete! 🎉`);
    } catch (error) {
      console.error("Error marking workout complete:", error);
      alert("Failed to mark workout as complete");
    }
  };

  if (loading) return <div className="p-8 text-white">Loading schedule...</div>;

  if (!currentSchedule) {
    return (
      <div
        className="min-h-screen w-full text-white bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95)), url(${dashboardBg})`,
          backgroundAttachment: "fixed",
        }}
      >
        <div className="text-center p-8 bg-gray-800/50 rounded-2xl border border-gray-700 backdrop-blur-sm max-w-md">
          <CalendarIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Active Weekly Plan</h2>
          <p className="text-gray-400 mb-6">You haven't started a weekly schedule yet.</p>
          <button
            onClick={() => navigate('/weekly-plan-library')}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors"
          >
            Create or Start a Plan
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 block w-full text-gray-400 hover:text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Helper to check if today matches the day
  const isToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    const dayDate = new Date(dateStr).toISOString().split('T')[0];
    return today === dayDate;
  };

  return (
    <div
      className="min-h-screen w-full text-white bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95)), url(${dashboardBg})`,
        backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur-md border-b border-gray-700/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back to Dashboard</span>
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold">{currentSchedule.weeklyPlanName}</h1>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Week {currentSchedule.weekNumber}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDismissWeek}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleCompleteWeek}
                className="px-3 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
              >
                Complete Week
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8 bg-gray-800/60 backdrop-blur-sm p-6 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Weekly Progress</h2>
            <span className="text-sm text-gray-400">
              {currentSchedule.completedDays} / {currentSchedule.totalWorkoutDays} workouts completed
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-500 rounded-full"
              style={{
                width: `${(currentSchedule.completedDays / currentSchedule.totalWorkoutDays) * 100}%`
              }}
            ></div>
          </div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentSchedule.days.map((day, index) => {
            const isTodayDay = isToday(day.date);
            const isCompleted = day.workout?.isCompleted;
            const isRest = day.isRestDay;

            return (
              <div 
                key={index}
                className={`flex flex-col rounded-xl overflow-hidden border transition-all duration-300 ${
                  isTodayDay 
                    ? 'ring-2 ring-blue-500 border-blue-500/50 bg-gray-800/80 scale-[1.02]' 
                    : isCompleted
                    ? 'border-green-500/30 bg-gray-800/40 opacity-75 hover:opacity-100'
                    : 'border-gray-700 bg-gray-800/40 hover:bg-gray-800/60'
                }`}
              >
                {/* Day Header */}
                <div className={`p-4 ${isTodayDay ? 'bg-blue-500/20' : 'bg-black/20'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-lg">{day.dayName}</span>
                    {isTodayDay && <span className="text-xs font-bold uppercase text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">Today</span>}
                  </div>
                  <span className="text-sm text-gray-400">{new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>

                {/* Day Content */}
                <div className="p-4 flex-1 flex flex-col">
                  {isRest ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-6">
                      <span className="text-xl">🛌</span>
                      <span className="mt-2 font-medium">Rest Day</span>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold mb-1 text-white">{day.workout.name}</h3>
                      <p className="text-sm text-gray-400 mb-4">{day.workout.exercises?.length || 0} Exercises</p>
                      
                      <div className="mt-auto">
                        {isCompleted ? (
                           <div className="flex items-center justify-center gap-2 w-full py-3 bg-green-500/20 text-green-400 rounded-lg font-medium border border-green-500/20 cursor-default">
                             <CheckCircle2 className="w-5 h-5" />
                             Completed
                           </div>
                        ) : (
                          day.workout.exercises?.length > 0 ? (
                            <button
                              onClick={() => handleStartWorkout(day)}
                              className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium transition-all ${
                                  isTodayDay
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20'
                                  : 'bg-gray-700 hover:bg-gray-600'
                              }`}
                            >
                              <Play className="w-4 h-4" />
                              Start Workout
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkComplete(day)}
                              className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium transition-all ${
                                  isTodayDay
                                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/20'
                                  : 'bg-green-700 hover:bg-green-600'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Mark as Complete
                            </button>
                          )
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
