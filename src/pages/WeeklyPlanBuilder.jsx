import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { ArrowLeft, Save, Plus, Trash2, X, Check, Search, ChevronRight, Trash } from "lucide-react";
import dashboardBg from "../assets/icons/dashboard_background.jpg";

const DAYS = [
  { id: 0, name: 'Monday' },
  { id: 1, name: 'Tuesday' },
  { id: 2, name: 'Wednesday' },
  { id: 3, name: 'Thursday' },
  { id: 4, name: 'Friday' },
  { id: 5, name: 'Saturday' },
  { id: 6, name: 'Sunday' }
];

const MUSCLE_GROUPS = [
  { id: 'abdominals', name: 'Abdominals' },
  { id: 'biceps', name: 'Biceps' },
  { id: 'calves', name: 'Calves' },
  { id: 'chest', name: 'Chest' },
  { id: 'forearms', name: 'Forearms' },
  { id: 'glutes', name: 'Glutes' },
  { id: 'hamstrings', name: 'Hamstrings' },
  { id: 'lats', name: 'Lats' },
  { id: 'lower_back', name: 'Lower Back' },
  { id: 'middle_back', name: 'Middle Back' },
  { id: 'quadriceps', name: 'Quadriceps' },
  { id: 'shoulders', name: 'Shoulders' },
  { id: 'traps', name: 'Traps' },
  { id: 'triceps', name: 'Triceps' }
];

export default function WeeklyPlanBuilder() {
  const navigate = useNavigate();
  const { id } = useParams(); // Get plan ID from URL if editing
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Plan State
  const [planName, setPlanName] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState(
    DAYS.map(day => ({
      ...day,
      isRestDay: false,
      workout: {
        name: "",
        exercises: []
      }
    }))
  );

  // Exercise Config Modal State
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState(null);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("all");

  // Load existing plan if editing
  useEffect(() => {
    if (id) {
      loadPlan(id);
    }
  }, [id]);

  const loadPlan = async (planId) => {
    setLoading(true);
    try {
      const response = await axiosClient.get(`/weekly-plans/${planId}`);
      const plan = response.data;
      
      setPlanName(plan.name);
      setDescription(plan.description || "");
      
      // Map plan days to schedule format
      const loadedSchedule = DAYS.map(day => {
        const planDay = plan.days.find(d => d.dayOfWeek === day.id);
        if (planDay) {
          return {
            ...day,
            isRestDay: planDay.isRestDay,
            workout: planDay.workout || { name: "", exercises: [] }
          };
        }
        return {
          ...day,
          isRestDay: false,
          workout: { name: "", exercises: [] }
        };
      });
      
      setSchedule(loadedSchedule);
      setIsEditMode(true);
    } catch (error) {
      console.error("Error loading plan:", error);
      alert("Failed to load plan");
      navigate('/weekly-plan-library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showExerciseModal) {
      fetchExercises();
    }
  }, [showExerciseModal, selectedMuscleGroup]);

  const fetchExercises = async () => {
    try {
      const url = selectedMuscleGroup === 'all' 
        ? '/exercises' 
        : `/exercises/category/${selectedMuscleGroup}`;
      const response = await axiosClient.get(url);
      setAvailableExercises(response.data);
    } catch (error) {
      console.error("Error fetching exercises:", error);
    }
  };

  const handleDayUpdate = (index, field, value) => {
    const newSchedule = [...schedule];
    if (field === 'isRestDay') {
      newSchedule[index].isRestDay = value;
      if (value) {
        newSchedule[index].workout.name = "Rest Day";
        newSchedule[index].workout.exercises = [];
      } else if (newSchedule[index].workout.name === "Rest Day") {
        newSchedule[index].workout.name = "";
      }
    } else if (field === 'workoutName') {
      newSchedule[index].workout.name = value;
    }
    setSchedule(newSchedule);
  };

  const handleConfigureDay = (dayIndex) => {
    setActiveDayIndex(dayIndex);
    setShowExerciseModal(true);
    setSearchTerm("");
    setSelectedMuscleGroup("all");
  };

  const handleAddExercise = (exercise) => {
    const newSchedule = [...schedule];
    const dayExercises = newSchedule[activeDayIndex].workout.exercises;
    
    // Check if already added
    if (dayExercises.find(ex => ex.exerciseId === exercise.id)) {
      alert("Exercise already added");
      return;
    }

    dayExercises.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      category: exercise.category,
      sets: [
        { setNumber: 1, targetReps: 10, targetWeight: 0 },
        { setNumber: 2, targetReps: 10, targetWeight: 0 },
        { setNumber: 3, targetReps: 10, targetWeight: 0 }
      ]
    });
    
    setSchedule(newSchedule);
  };

  const handleRemoveExercise = (exerciseId) => {
    const newSchedule = [...schedule];
    newSchedule[activeDayIndex].workout.exercises = 
      newSchedule[activeDayIndex].workout.exercises.filter(ex => ex.exerciseId !== exerciseId);
    setSchedule(newSchedule);
  };

  const handleSetChange = (exerciseId, setIndex, field, value) => {
    const newSchedule = [...schedule];
    const exercise = newSchedule[activeDayIndex].workout.exercises.find(ex => ex.exerciseId === exerciseId);
    if (exercise && exercise.sets) {
      exercise.sets[setIndex][field] = parseFloat(value) || 0;
      setSchedule(newSchedule);
    }
  };

  const handleAddSet = (exerciseId) => {
    const newSchedule = [...schedule];
    const exercise = newSchedule[activeDayIndex].workout.exercises.find(ex => ex.exerciseId === exerciseId);
    if (exercise && exercise.sets) {
      const newSetNumber = exercise.sets.length + 1;
      const lastSet = exercise.sets[exercise.sets.length - 1] || { targetReps: 10, targetWeight: 0 };
      
      exercise.sets.push({
        setNumber: newSetNumber,
        targetReps: lastSet.targetReps,
        targetWeight: lastSet.targetWeight
      });
      setSchedule(newSchedule);
    }
  };

  const handleRemoveSet = (exerciseId, setIndex) => {
    const newSchedule = [...schedule];
    const exercise = newSchedule[activeDayIndex].workout.exercises.find(ex => ex.exerciseId === exerciseId);
    if (exercise && exercise.sets && exercise.sets.length > 1) {
      exercise.sets.splice(setIndex, 1);
      // Renumber remaining sets
      exercise.sets.forEach((set, idx) => {
        set.setNumber = idx + 1;
      });
      setSchedule(newSchedule);
    }
  };

  const handleSavePlan = async () => {
    if (!planName.trim()) {
      alert("Please enter a plan name");
      return;
    }

    setLoading(true);
    try {
      // Transform schedule to match backend schema
      const transformedDays = schedule.map(day => ({
        dayOfWeek: day.id,
        dayName: day.name,
        isRestDay: day.isRestDay,
        workout: day.workout
      }));

      if (isEditMode && id) {
        // Update existing plan
        await axiosClient.put(`/weekly-plans/${id}`, {
          name: planName,
          description,
          days: transformedDays
        });
        alert("Weekly plan updated successfully!");
      } else {
        // Create new plan
        await axiosClient.post('/weekly-plans', {
          name: planName,
          description,
          days: transformedDays
        });
        alert("Weekly plan created successfully!");
      }
      navigate('/weekly-plan-library');
    } catch (error) {
      console.error("Error saving plan:", error);
      alert("Failed to save plan: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!window.confirm(`Are you sure you want to delete "${planName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      await axiosClient.delete(`/weekly-plans/${id}`);
      alert("Weekly plan deleted successfully!");
      navigate('/weekly-plan-library');
    } catch (error) {
      console.error("Error deleting plan:", error);
      alert("Failed to delete plan: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = availableExercises.filter(ex =>
    ex.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeDay = activeDayIndex !== null ? schedule[activeDayIndex] : null;

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
            <h1 className="text-xl font-bold">{isEditMode ? 'Edit Weekly Plan' : 'New Weekly Plan'}</h1>
            <div className="flex gap-2">
              {isEditMode && (
                <button
                  onClick={handleDeletePlan}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash className="w-4 h-4" />
                  Delete
                </button>
              )}
              <button
                onClick={handleSavePlan}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isEditMode ? 'Update Plan' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Basic Info */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Plan Name</label>
              <input
                type="text"
                placeholder="e.g., PPL Split - Week 1"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:border-blue-500 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Description (Optional)</label>
              <input
                type="text"
                placeholder="Goal: Hypertrophy, Strength..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:border-blue-500 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">Weekly Schedule</h2>
          {schedule.map((day, index) => (
            <div 
              key={day.id}
              className={`p-6 rounded-xl border transition-all ${
                day.isRestDay 
                  ? 'bg-gray-800/30 border-gray-700/50' 
                  : 'bg-gray-800/60 border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-gray-300">
                      {day.name.substring(0, 3)}
                    </div>
                    <h3 className="text-lg font-semibold">{day.name}</h3>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                      day.isRestDay ? 'bg-blue-500 border-blue-500' : 'border-gray-500'
                    }`}>
                      {day.isRestDay && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={day.isRestDay}
                      onChange={(e) => handleDayUpdate(index, 'isRestDay', e.target.checked)}
                    />
                    <span className="text-sm text-gray-300">Rest Day</span>
                  </label>
                </div>

                {!day.isRestDay && (
                  <>
                    <input
                      type="text"
                      placeholder="Workout Name (e.g. Push Day)"
                      value={day.workout.name}
                      onChange={(e) => handleDayUpdate(index, 'workoutName', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:border-blue-500 transition-all outline-none"
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">
                        {day.workout.exercises.length} exercise{day.workout.exercises.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => handleConfigureDay(index)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Configure Exercises
                      </button>
                    </div>

                    {day.workout.exercises.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {day.workout.exercises.map((ex, idx) => (
                          <span key={idx} className="px-3 py-1 bg-gray-700/50 rounded-full text-xs">
                            {ex.exerciseName}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exercise Configuration Modal */}
      {showExerciseModal && activeDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{activeDay.name} - {activeDay.workout.name || 'Workout'}</h2>
                <p className="text-sm text-gray-400">Add and configure exercises</p>
              </div>
              <button
                onClick={() => setShowExerciseModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Available Exercises */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Available Exercises</h3>
                  
                  {/* Filters */}
                  <div className="space-y-3 mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search exercises..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:border-blue-500 outline-none"
                      />
                    </div>
                    <select
                      value={selectedMuscleGroup}
                      onChange={(e) => setSelectedMuscleGroup(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:border-blue-500 outline-none"
                    >
                      <option value="all">All Muscle Groups</option>
                      {MUSCLE_GROUPS.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Exercise List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredExercises.map(exercise => (
                      <button
                        key={exercise.id}
                        onClick={() => handleAddExercise(exercise)}
                        className="w-full p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg text-left transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="font-medium">{exercise.name}</p>
                          <p className="text-xs text-gray-400">{exercise.category}</p>
                        </div>
                        <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-400" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right: Selected Exercises */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Your Exercises ({activeDay.workout.exercises.length})
                  </h3>
                  
                  {activeDay.workout.exercises.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <p>No exercises added yet</p>
                      <p className="text-sm mt-2">Click exercises from the left to add them</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeDay.workout.exercises.map((exercise) => (
                        <div key={exercise.exerciseId} className="p-4 bg-gray-700/30 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-medium">{exercise.exerciseName}</p>
                              <p className="text-xs text-gray-400">{exercise.category}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveExercise(exercise.exerciseId)}
                              className="p-1 hover:bg-red-500/20 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                          
                          {/* Sets Configuration */}
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-300">Sets Configuration</label>
                              <button
                                onClick={() => handleAddSet(exercise.exerciseId)}
                                className="text-xs px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Add Set
                              </button>
                            </div>
                            
                            {exercise.sets && exercise.sets.map((set, setIdx) => (
                              <div key={setIdx} className="flex items-center gap-2 bg-gray-600/30 p-2 rounded-lg">
                                <span className="text-xs font-medium text-gray-400 w-12">Set {set.setNumber}</span>
                                
                                <div className="flex-1">
                                  <input
                                    type="number"
                                    min="1"
                                    value={set.targetReps}
                                    onChange={(e) => handleSetChange(exercise.exerciseId, setIdx, 'targetReps', e.target.value)}
                                    placeholder="Reps"
                                    className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-500 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                  />
                                  <label className="text-[10px] text-gray-500">reps</label>
                                </div>
                                
                                <div className="flex-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={set.targetWeight || ''}
                                    onChange={(e) => handleSetChange(exercise.exerciseId, setIdx, 'targetWeight', e.target.value)}
                                    placeholder="Weight"
                                    className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-500 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                                  />
                                  <label className="text-[10px] text-gray-500">kg</label>
                                </div>
                                
                                {exercise.sets.length > 1 && (
                                  <button
                                    onClick={() => handleRemoveSet(exercise.exerciseId, setIdx)}
                                    className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                    title="Remove set"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-700 flex justify-end">
              <button
                onClick={() => setShowExerciseModal(false)}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
