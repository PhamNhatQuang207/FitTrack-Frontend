import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { ArrowLeft, Play, CheckCircle2, Calendar as CalendarIcon, Edit2, RefreshCcw, X as XIcon } from "lucide-react";
import dashboardBg from "../assets/icons/dashboard_background.jpg";

export default function WeeklyCalendar() {
  const navigate = useNavigate();
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [swapSourceDay, setSwapSourceDay] = useState(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [availableExercises, setAvailableExercises] = useState([]);

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

  const handleSwapDays = async (day) => {
    if (!swapSourceDay) {
      setSwapSourceDay(day);
    } else {
      try {
        await axiosClient.patch(`/weekly-schedules/${currentSchedule.id}/update-day`, {
          action: 'swap',
          dayOfWeek: swapSourceDay.dayOfWeek,
          targetDayOfWeek: day.dayOfWeek
        });
        
        const response = await axiosClient.get('/weekly-schedules/current');
        setCurrentSchedule(response.data);
        setSwapSourceDay(null);
        alert('Days swapped successfully!');
      } catch (error) {
        console.error("Error swapping days:", error);
        alert("Failed to swap days");
        setSwapSourceDay(null);
      }
    }
  };

  const handleToggleRestDay = async (day) => {
    const action = day.isRestDay ? 
      'Converting to workout day' : 
      'Converting to rest day';
    
    if (!window.confirm(`${action}? This will update your weekly schedule.`)) {
      return;
    }

    try {
      await axiosClient.patch(`/weekly-schedules/${currentSchedule.id}/update-day`, {
        action: 'toggleRest',
        dayOfWeek: day.dayOfWeek
      });
      
      const response = await axiosClient.get('/weekly-schedules/current');
      setCurrentSchedule(response.data);
      alert('Day updated successfully!');
    } catch (error) {
      console.error("Error toggling rest day:", error);
      alert("Failed to toggle rest day");
    }
  };

  const handleEditExercises = async (day) => {
    setEditingDay(day);
    
    // Fetch available exercises
    try {
      const response = await axiosClient.get('/exercises');
      setAvailableExercises(response.data);
      setShowExerciseModal(true);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      alert("Failed to load exercises");
    }
  };

  const handleAddExercise = (exercise) => {
    if (!editingDay) return;
    
    const updatedExercises = [...(editingDay.workout?.exercises || [])];
    
    // Check if already added
    if (updatedExercises.find(ex => ex.exerciseId === exercise._id)) {
      alert("Exercise already added");
      return;
    }
    
    updatedExercises.push({
      exerciseId: exercise._id,
      exerciseName: exercise.name,
      category: exercise.category,
      sets: [
        { setNumber: 1, targetReps: 10, targetWeight: 0 },
        { setNumber: 2, targetReps: 10, targetWeight: 0 },
        { setNumber: 3, targetReps: 10, targetWeight: 0 }
      ]
    });
    
    setEditingDay({
      ...editingDay,
      workout: {
        ...editingDay.workout,
        exercises: updatedExercises
      }
    });
  };

  const handleRemoveExercise = (exerciseId) => {
    if (!editingDay) return;
    
    const updatedExercises = editingDay.workout.exercises.filter(
      ex => ex.exerciseId !== exerciseId
    );
    
    setEditingDay({
      ...editingDay,
      workout: {
        ...editingDay.workout,
        exercises: updatedExercises
      }
    });
  };

  const handleSaveExercises = async () => {
    if (!editingDay) return;
    
    try {
      await axiosClient.patch(`/weekly-schedules/${currentSchedule.id}/update-day`, {
        action: 'assignWorkout',
        dayOfWeek: editingDay.dayOfWeek,
        workout: {
          name: editingDay.workout.name || 'Workout',
          exercises: editingDay.workout.exercises
        }
      });
      
      const response = await axiosClient.get('/weekly-schedules/current');
      setCurrentSchedule(response.data);
      setShowExerciseModal(false);
      setEditingDay(null);
      alert('Exercises updated successfully!');
    } catch (error) {
      console.error("Error saving exercises:", error);
      alert("Failed to save exercises");
    }
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setSwapSourceDay(null);
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
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex justify-start">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium hidden md:inline">Back to Dashboard</span>
              </button>
            </div>
            <div className="flex-1 text-center">
              <h1 className="text-lg md:text-xl font-bold">{currentSchedule.weeklyPlanName}</h1>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Week {currentSchedule.weekNumber}</p>
            </div>
            <div className="flex-1 flex justify-end gap-2">
              {editMode ? (
                <button
                  onClick={cancelEditMode}
                  className="flex items-center gap-2 px-3 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors border border-transparent"
                >
                  <XIcon className="w-4 h-4" />
                  <span className="hidden md:inline">Cancel Edit</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-2 px-3 h-10 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors border border-transparent"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden md:inline">Edit Schedule</span>
                  </button>
                  <button
                    onClick={handleDismissWeek}
                    className="px-3 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors border border-transparent hidden md:flex items-center"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={handleCompleteWeek}
                    className="px-3 h-10 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors border border-transparent hidden md:flex items-center"
                  >
                    Complete Week
                  </button>
                </>
              )}
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
                    <>
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-6">
                        <span className="text-xl">🛌</span>
                        <span className="mt-2 font-medium">Rest Day</span>
                      </div>
                      {editMode && (
                        <div className="mt-4 space-y-2">
                          <button
                            onClick={() => handleSwapDays(day)}
                            className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                              swapSourceDay?.dayOfWeek === day.dayOfWeek
                                ? 'bg-yellow-500 hover:bg-yellow-600'
                                : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                          >
                            <RefreshCcw className="w-4 h-4" />
                            {swapSourceDay?.dayOfWeek === day.dayOfWeek ? 'Selected' : swapSourceDay ? 'Swap Here' : 'Swap Day'}
                          </button>
                          <button
                            onClick={() => handleToggleRestDay(day)}
                            className="w-full py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors"
                          >
                            Make Workout Day
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold mb-1 text-white">{day.workout.name}</h3>
                      <p className="text-sm text-gray-400 mb-4">{day.workout.exercises?.length || 0} Exercises</p>
                      
                      <div className="mt-auto">
                        {editMode ? (
                          <div className="space-y-2">
                            <button
                              onClick={() => handleSwapDays(day)}
                              className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                                swapSourceDay?.dayOfWeek === day.dayOfWeek
                                  ? 'bg-yellow-500 hover:bg-yellow-600'
                                  : 'bg-blue-500 hover:bg-blue-600'
                              }`}
                            >
                              <RefreshCcw className="w-4 h-4" />
                              {swapSourceDay?.dayOfWeek === day.dayOfWeek ? 'Selected' : swapSourceDay ? 'Swap Here' : 'Swap Day'}
                            </button>
                            <button
                              onClick={() => handleEditExercises(day)}
                              className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium transition-colors"
                            >
                              Edit Exercises
                            </button>
                            <button
                              onClick={() => handleToggleRestDay(day)}
                              className="w-full py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors"
                            >
                              Make Rest Day
                            </button>
                          </div>
                        ) : (
                          <>
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
                                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium transition-colors ${
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
                          </>
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

      {/* Exercise Edit Modal */}
      {showExerciseModal && editingDay && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-700">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Edit Exercises</h2>
                  <p className="text-gray-400 text-sm mt-1">{editingDay.dayName} - {editingDay.workout?.name || 'Workout'}</p>
                </div>
                <button
                  onClick={() => setShowExerciseModal(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Available Exercises */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Available Exercises</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableExercises.map(exercise => (
                      <div
                        key={exercise._id}
                        className="p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{exercise.name}</p>
                          <p className="text-xs text-gray-400">{exercise.category}</p>
                        </div>
                        <button
                          onClick={() => handleAddExercise(exercise)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded text-sm font-medium transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Exercises */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Selected Exercises ({editingDay.workout?.exercises?.length || 0})
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {editingDay.workout?.exercises?.length > 0 ? (
                      editingDay.workout.exercises.map(exercise => (
                        <div
                          key={exercise.exerciseId}
                          className="p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">{exercise.exerciseName}</p>
                            <p className="text-xs text-gray-400">{exercise.sets?.length || 3} sets</p>
                          </div>
                          <button
                            onClick={() => handleRemoveExercise(exercise.exerciseId)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm font-medium transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">No exercises selected</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowExerciseModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExercises}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
