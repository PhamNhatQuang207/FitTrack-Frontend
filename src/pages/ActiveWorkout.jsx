import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { ArrowLeft, Check, X, Play, CheckCircle2, Circle } from "lucide-react";
import dashboardBg from "../assets/icons/dashboard_background.jpg";

export default function ActiveWorkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [bodyMetrics, setBodyMetrics] = useState({
    weight: "",
    bodyFat: ""
  });
  // Track editable inputs for each set of each exercise
  // Format: { exerciseIndex: { setIndex: { reps, weight } } }
  const [setInputs, setSetInputs] = useState({});

  useEffect(() => {
    fetchSession();
  }, [id]);

  // Initialize set inputs when session loads
  useEffect(() => {
    if (session && session.exercises) {
      const initialInputs = {};
      session.exercises.forEach((exercise, exIndex) => {
        initialInputs[exIndex] = {};
        const numSets = exercise.sets ? exercise.sets.length : exercise.targetSets;
        for (let setIndex = 0; setIndex < numSets; setIndex++) {
          // Check if there's already an actual set logged
          const actualSet = exercise.actualSets?.find(s => s.setNumber === setIndex + 1);
          if (actualSet) {
            initialInputs[exIndex][setIndex] = {
              reps: actualSet.reps,
              weight: actualSet.weight
            };
          } else {
            // Use target values or per-set values
            const targetReps = exercise.sets?.[setIndex]?.targetReps || exercise.targetReps || 0;
            const targetWeight = exercise.sets?.[setIndex]?.targetWeight || exercise.targetWeight || 0;
            initialInputs[exIndex][setIndex] = {
              reps: targetReps,
              weight: targetWeight
            };
          }
        }
      });
      setSetInputs(initialInputs);
    }
  }, [session]);

  const fetchSession = async () => {
    try {
      const response = await axiosClient.get(`/workout-sessions/${id}`);
      setSession(response.data);
      
      // Start session if it's planned
      if (response.data.status === 'planned') {
        await axiosClient.patch(`/workout-sessions/${id}/start`);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      alert("Failed to load workout session");
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSetInputChange = (exerciseIndex, setIndex, field, value) => {
    setSetInputs(prev => ({
      ...prev,
      [exerciseIndex]: {
        ...prev[exerciseIndex],
        [setIndex]: {
          ...prev[exerciseIndex]?.[setIndex],
          [field]: value
        }
      }
    }));
  };

  const handleToggleSet = async (exerciseIndex, setIndex) => {
    const newSession = { ...session };
    const exercise = newSession.exercises[exerciseIndex];
    
    // Initialize actualSets if not exists
    if (!exercise.actualSets) {
      exercise.actualSets = [];
    }

    // Toggle set completion
    const existingSetIndex = exercise.actualSets.findIndex(s => s.setNumber === setIndex + 1);
    
    if (existingSetIndex >= 0) {
      // Remove set if it exists (untick)
      exercise.actualSets.splice(existingSetIndex, 1);
    } else {
      // Add set with actual input values (tick)
      const inputValues = setInputs[exerciseIndex]?.[setIndex];
      exercise.actualSets.push({
        setNumber: setIndex + 1,
        reps: inputValues?.reps || exercise.targetReps || 0,
        weight: inputValues?.weight || exercise.targetWeight || 0,
        completed: true
      });
    }

    setSession(newSession);

    // Send update to backend
    try {
      await axiosClient.put(`/workout-sessions/${id}`, {
        exercises: newSession.exercises
      });
    } catch (error) {
      console.error("Error updating session:", error);
    }
  };

  const handleCompleteWorkout = () => {
    // Show metrics modal instead of completing immediately
    setShowMetricsModal(true);
  };

  const handleSkipMetrics = async () => {
    await completeWorkoutSession();
  };

  const handleSaveMetrics = async () => {
    try {
      // Update body metrics if provided
      const updates = {};
      if (bodyMetrics.weight) {
        updates.weight = parseFloat(bodyMetrics.weight);
      }
      if (bodyMetrics.bodyFat) {
        updates.bodyFat = parseFloat(bodyMetrics.bodyFat);
      }

      if (Object.keys(updates).length > 0) {
        await axiosClient.post('/users/progress', updates);
      }

      await completeWorkoutSession();
    } catch (error) {
      console.error("Error saving metrics:", error);
      alert("Failed to save body metrics, but workout will be completed");
      await completeWorkoutSession();
    }
  };

  const completeWorkoutSession = async () => {
    try {
      await axiosClient.patch(`/workout-sessions/${id}/complete`);
      
      // If this workout is part of a weekly schedule, mark the day as complete
      console.log("Session data:", session);
      console.log("weeklyScheduleId:", session.weeklyScheduleId);
      console.log("dayOfWeek:", session.dayOfWeek);
      
      if (session.weeklyScheduleId && session.dayOfWeek !== undefined) {
        console.log("Attempting to update weekly schedule...");
        try {
          const response = await axiosClient.patch(`/weekly-schedules/${session.weeklyScheduleId}/complete-day`, {
            dayOfWeek: session.dayOfWeek,
            workoutData: {
              exercises: session.exercises
            }
          });
          console.log("Weekly schedule update response:", response.data);
        } catch (error) {
          console.error("Error updating weekly schedule:", error);
          console.error("Error response:", error.response?.data);
          // Don't fail the whole operation if this fails
        }
      } else {
        console.log("Not part of a weekly schedule or missing dayOfWeek");
      }
      
      alert("Workout completed! Great job! 💪");
      
      // Navigate back to weekly schedule if this was part of one, otherwise dashboard
      if (session.weeklyScheduleId) {
        navigate('/weekly-schedule');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Error completing workout:", error);
      alert("Failed to complete workout");
    }
  };

  const isSetCompleted = (exercise, setIndex) => {
    return exercise.actualSets?.some(s => s.setNumber === setIndex + 1);
  };

  const getExerciseProgress = (exercise) => {
    const completedSets = exercise.actualSets?.length || 0;
    const totalSets = exercise.sets ? exercise.sets.length : (exercise.targetSets || 0);
    return `${completedSets}/${totalSets}`;
  };

  const isExerciseComplete = (exercise) => {
    const totalSets = exercise.sets ? exercise.sets.length : (exercise.targetSets || 0);
    return (exercise.actualSets?.length || 0) >= totalSets;
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-xl">Loading workout...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const currentExercise = session.exercises[currentExerciseIndex];
  const totalExercises = session.exercises.length;
  const completedExercises = session.exercises.filter(ex => isExerciseComplete(ex)).length;

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
              className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors group"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back to Dashboard</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-xl font-bold">{session.name}</h1>
              <p className="text-sm text-gray-400">{completedExercises} / {totalExercises} exercises completed</p>
            </div>

            <div className="w-32"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Current Exercise View */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">{currentExercise.exerciseName}</h2>
                <p className="text-gray-400">{currentExercise.category}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-blue-400">{getExerciseProgress(currentExercise)}</p>
                <p className="text-sm text-gray-400">sets completed</p>
              </div>
            </div>


            {/* Target Info - Show per-set if available */}
            {currentExercise.sets && currentExercise.sets.length > 0 ? (
              <div className="mb-6">
                <p className="text-gray-400 text-sm mb-3 text-center">Set Targets</p>
                <div className="space-y-2">
                  {currentExercise.sets.map((set, idx) => (
                    <div key={idx} className="flex justify-between p-3 bg-gray-700/30 rounded-lg text-sm">
                      <span className="text-gray-300">Set {set.setNumber}</span>
                      <span className="text-white font-medium">{set.targetReps} reps @ {set.targetWeight}kg</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-700/30 rounded-xl">
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-1">Sets</p>
                  <p className="text-2xl font-bold">{currentExercise.targetSets || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-1">Reps</p>
                  <p className="text-2xl font-bold">{currentExercise.targetReps || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-1">Weight</p>
                  <p className="text-2xl font-bold">{currentExercise.targetWeight || 0}kg</p>
                </div>
              </div>
            )}

            {/* Sets Checklist */}
            <div className="space-y-3">
              {Array.from({ length: currentExercise.sets ? currentExercise.sets.length : currentExercise.targetSets }).map((_, index) => {
                const isCompleted = isSetCompleted(currentExercise, index);
                const inputValues = setInputs[currentExerciseIndex]?.[index] || { reps: 0, weight: 0 };
                
                return (
                  <div
                    key={index}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${
                      isCompleted
                        ? 'bg-green-500/20 border-green-500'
                        : 'bg-gray-700/30 border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Checkbox and Set Number */}
                      <div className="flex items-center gap-3 min-w-[100px]">
                        <button
                          onClick={() => handleToggleSet(currentExerciseIndex, index)}
                          className="focus:outline-none"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                          ) : (
                            <Circle className="w-6 h-6 text-gray-400 hover:text-gray-300" />
                          )}
                        </button>
                        <span className="font-semibold">Set {index + 1}</span>
                      </div>

                      {/* Editable Reps Input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={inputValues.reps}
                          onChange={(e) => handleSetInputChange(currentExerciseIndex, index, 'reps', parseInt(e.target.value) || 0)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-16 px-2 py-1 bg-gray-600/50 border border-gray-500 rounded text-center font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          disabled={isCompleted}
                        />
                        <span className="text-gray-400 text-sm">reps</span>
                      </div>

                      {/* @ symbol */}
                      <span className="text-gray-400">@</span>

                      {/* Editable Weight Input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          value={inputValues.weight}
                          onChange={(e) => handleSetInputChange(currentExerciseIndex, index, 'weight', parseFloat(e.target.value) || 0)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-16 px-2 py-1 bg-gray-600/50 border border-gray-500 rounded text-center font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          disabled={isCompleted}
                        />
                        <span className="text-gray-400 text-sm">kg</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <button
                onClick={() => setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))}
                disabled={currentExerciseIndex === 0}
                className="py-3 px-6 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous Exercise
              </button>
              <button
                onClick={() => setCurrentExerciseIndex(Math.min(totalExercises - 1, currentExerciseIndex + 1))}
                disabled={currentExerciseIndex === totalExercises - 1}
                className="py-3 px-6 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next Exercise
              </button>
            </div>
          </div>

          {/* All Exercises Overview */}
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 mb-6">
            <h3 className="text-xl font-bold mb-4">All Exercises</h3>
            <div className="space-y-2">
              {session.exercises.map((exercise, index) => {
                const isComplete = isExerciseComplete(exercise);
                const isCurrent = index === currentExerciseIndex;
                return (
                  <button
                    key={index}
                    onClick={() => setCurrentExerciseIndex(index)}
                    className={`w-full p-4 rounded-lg text-left transition-all ${
                      isCurrent
                        ? 'bg-blue-500/20 border-2 border-blue-500'
                        : isComplete
                        ? 'bg-green-500/10 border-2 border-green-500/30'
                        : 'bg-gray-700/30 border-2 border-gray-600/30 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isComplete ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <p className="font-semibold">{exercise.exerciseName}</p>
                          <p className="text-sm text-gray-400">{exercise.category}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400">{getExerciseProgress(exercise)} sets</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Complete Workout Button */}
          <button
            onClick={handleCompleteWorkout}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-6 h-6" />
            Complete Workout
          </button>
        </div>
      </div>

      {/* Body Metrics Modal */}
      {showMetricsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">Update Body Metrics</h2>
            <p className="text-gray-400 mb-6">Track your progress! (Optional)</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Enter your current weight"
                  value={bodyMetrics.weight}
                  onChange={(e) => setBodyMetrics({ ...bodyMetrics, weight: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Body Fat (%)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Enter your body fat percentage"
                  value={bodyMetrics.bodyFat}
                  onChange={(e) => setBodyMetrics({ ...bodyMetrics, bodyFat: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleSkipMetrics}
                className="py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleSaveMetrics}
                className="py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition-colors"
              >
                Save & Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
