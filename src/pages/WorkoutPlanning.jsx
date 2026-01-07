import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { ArrowLeft, Search, Save, Plus, Trash2, CheckCircle2 } from "lucide-react";
import dashboardBg from "../assets/icons/dashboard_background.jpg";

// Muscle group data with emoji icons and gradient colors
const muscleGroupData = [
  { id: 'chest', name: 'Chest', icon: '🫀', color: 'from-red-500 to-pink-500' },
  { id: 'shoulders', name: 'Shoulders', icon: '🏋️', color: 'from-orange-500 to-amber-500' },
  { id: 'biceps', name: 'Biceps', icon: '💪', color: 'from-blue-500 to-cyan-500' },
  { id: 'triceps', name: 'Triceps', icon: '🔱', color: 'from-purple-500 to-pink-500' },
  { id: 'lats', name: 'Lats', icon: '⬇️', color: 'from-green-500 to-emerald-500' },
  { id: 'middle_back', name: 'Middle Back', icon: '🎯', color: 'from-teal-500 to-cyan-500' },
  { id: 'lower_back', name: 'Lower Back', icon: '🔽', color: 'from-indigo-500 to-blue-500' },
  { id: 'traps', name: 'Traps', icon: '⏫', color: 'from-violet-500 to-purple-500' },
  { id: 'abdominals', name: 'Abdominals', icon: '⭐', color: 'from-yellow-500 to-orange-500' },
  { id: 'quadriceps', name: 'Quadriceps', icon: '🦵', color: 'from-lime-500 to-green-500' },
  { id: 'hamstrings', name: 'Hamstrings', icon: '🔗', color: 'from-emerald-500 to-teal-500' },
  { id: 'glutes', name: 'Glutes', icon: '🍑', color: 'from-rose-500 to-pink-500' },
  { id: 'calves', name: 'Calves', icon: '👣', color: 'from-cyan-500 to-blue-500' },
  { id: 'forearms', name: 'Forearms', icon: '🤜', color: 'from-gray-500 to-slate-500' }
];

export default function WorkoutPlanning() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [workoutName, setWorkoutName] = useState("");
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState([]);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [workoutExercises, setWorkoutExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step === 2 && selectedMuscleGroups.length > 0) {
      fetchExercisesForSelectedGroups();
    }
  }, [step, selectedMuscleGroups]);

  const fetchExercisesForSelectedGroups = async () => {
    setLoading(true);
    try {
      // Fetch exercises for all selected muscle groups
      const allExercises = [];
      for (const group of selectedMuscleGroups) {
        const response = await axiosClient.get(`/exercises/category/${group.id}`);
        allExercises.push(...response.data);
      }
      setAvailableExercises(allExercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMuscleGroupToggle = (group) => {
    const isSelected = selectedMuscleGroups.find(g => g.id === group.id);
    if (isSelected) {
      setSelectedMuscleGroups(selectedMuscleGroups.filter(g => g.id !== group.id));
    } else {
      setSelectedMuscleGroups([...selectedMuscleGroups, group]);
    }
  };

  const handleAddExercise = (exercise) => {
    // Check if already added
    if (workoutExercises.find(ex => ex.exerciseId === exercise.id)) {
      return;
    }

    setWorkoutExercises([
      ...workoutExercises,
      {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        category: exercise.category,
        targetSets: 3,
        targetReps: 10,
        targetWeight: 0
      }
    ]);
  };

  const handleRemoveExercise = (index) => {
    const newExercises = [...workoutExercises];
    newExercises.splice(index, 1);
    setWorkoutExercises(newExercises);
  };

  const handleExerciseChange = (index, field, value) => {
    const newExercises = [...workoutExercises];
    newExercises[index][field] = parseFloat(value) || 0;
    setWorkoutExercises(newExercises);
  };

  const handleNextToExercises = () => {
    if (!workoutName.trim()) {
      alert("Please enter a workout name");
      return;
    }
    if (selectedMuscleGroups.length === 0) {
      alert("Please select at least one muscle group");
      return;
    }
    setStep(2);
  };

  const handleSaveWorkout = async () => {
    if (workoutExercises.length === 0) {
      alert("Please add at least one exercise");
      return;
    }

    setLoading(true);
    try {
      await axiosClient.post('/workout-sessions', {
        name: workoutName,
        exercises: workoutExercises,
        notes: ""
      });
      
      alert("Workout plan saved successfully!");
      navigate('/dashboard');
    } catch (error) {
      console.error("Error saving workout:", error);
      alert(error.response?.data?.message || "Failed to save workout");
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = availableExercises.filter(ex =>
    ex.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (step > 1) {
                  setStep(step - 1);
                } else {
                  navigate("/dashboard");
                }
              }}
              className="flex items-center space-x-2 text-white hover:text-blue-400 transition-colors group"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">{step === 1 ? 'Back to Dashboard' : 'Back'}</span>
            </button>
            
            {/* Progress Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-500' : 'bg-gray-600'}`}>1</div>
              <div className="w-12 h-1 bg-gray-600"></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-500' : 'bg-gray-600'}`}>2</div>
            </div>

            <div className="w-32"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Step 1: Workout Name & Muscle Group Selection */}
          {step === 1 && (
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Create Workout Plan
              </h1>
              <p className="text-gray-400 mb-8">Name your workout and select target muscle groups</p>
              
              {/* Workout Name */}
              <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 mb-8">
                <label className="block text-lg font-semibold mb-3">Workout Name</label>
                <input
                  type="text"
                  placeholder="e.g., Push Day A, Full Body Strength, Leg Day..."
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-white placeholder-gray-500"
                />
              </div>

              {/* Muscle Group Selection */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Select Muscle Groups</h2>
                <p className="text-gray-400 mb-6">
                  {selectedMuscleGroups.length} muscle group{selectedMuscleGroups.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {muscleGroupData.map((group) => {
                  const isSelected = selectedMuscleGroups.find(g => g.id === group.id);
                  return (
                    <div
                      key={group.id}
                      onClick={() => handleMuscleGroupToggle(group)}
                      className={`relative cursor-pointer rounded-xl overflow-hidden transition-all duration-300 border-2 ${
                        isSelected 
                          ? 'border-blue-500 bg-gradient-to-br ' + group.color + ' scale-105 shadow-lg shadow-blue-500/50' 
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:scale-105'
                      }`}
                    >
                      <div className="aspect-square flex flex-col items-center justify-center p-6">
                        <div className="text-6xl mb-3">{group.icon}</div>
                        <h3 className={`font-bold text-lg text-center ${
                          isSelected ? 'text-white drop-shadow-lg' : 'text-gray-300'
                        }`}>{group.name}</h3>
                      </div>
                      {isSelected && (
                        <div className="absolute top-3 right-3 bg-white rounded-full p-1.5">
                          <CheckCircle2 className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleNextToExercises}
                disabled={!workoutName.trim() || selectedMuscleGroups.length === 0}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Add Exercises
              </button>
            </div>
          )}

          {/* Step 2: Exercise Selection & Configuration */}
          {step === 2 && (
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {workoutName}
              </h1>
              <p className="text-gray-400 mb-6">
                Add exercises from: {selectedMuscleGroups.map(g => g.name).join(', ')}
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available Exercises */}
                <div>
                  <h2 className="text-xl font-bold mb-4">Available Exercises</h2>
                  
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search exercises..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-white placeholder-gray-500"
                    />
                  </div>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                    {filteredExercises.map((exercise) => {
                      const isAdded = workoutExercises.find(ex => ex.exerciseId === exercise.id);
                      return (
                        <button
                          key={exercise.id}
                          onClick={() => handleAddExercise(exercise)}
                          disabled={isAdded}
                          className={`w-full p-4 rounded-lg text-left transition-all ${
                            isAdded
                              ? 'bg-gray-700/30 cursor-not-allowed opacity-50'
                              : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{exercise.name}</p>
                              <p className="text-sm text-gray-400">{exercise.category} • {exercise.equipment}</p>
                            </div>
                            {!isAdded && <Plus className="w-5 h-5 text-blue-400" />}
                            {isAdded && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Exercises with Configuration */}
                <div>
                  <h2 className="text-xl font-bold mb-4">
                    Your Exercises ({workoutExercises.length})
                  </h2>

                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {workoutExercises.map((exercise, index) => (
                      <div key={index} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{exercise.exerciseName}</h3>
                            <p className="text-sm text-gray-400">{exercise.category}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveExercise(index)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Sets</label>
                            <input
                              type="number"
                              min="1"
                              value={exercise.targetSets}
                              onChange={(e) => handleExerciseChange(index, 'targetSets', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Reps</label>
                            <input
                              type="number"
                              min="1"
                              value={exercise.targetReps}
                              onChange={(e) => handleExerciseChange(index, 'targetReps', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Weight (kg)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={exercise.targetWeight || ''}
                              onChange={(e) => handleExerciseChange(index, 'targetWeight', e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {workoutExercises.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <p>No exercises added yet</p>
                        <p className="text-sm mt-2">Select exercises from the left to add them</p>
                      </div>
                    )}
                  </div>

                  {workoutExercises.length > 0 && (
                    <button
                      onClick={handleSaveWorkout}
                      disabled={loading}
                      className="w-full mt-4 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      {loading ? 'Saving...' : 'Save Workout Plan'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
