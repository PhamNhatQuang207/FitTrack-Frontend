import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import axiosClient from "../api/axiosClient";
import dashboardBg from "../assets/icons/dashboard_background.jpg";

export default function Profile() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    sex: "",
    height: "",
    weight: "",
    bodyFat: "",
    email: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getUserProgress();
  }, []);

  const getUserProgress = async () => {
    try {
      if (!user) {
        navigate("/login");
        return;
      }

      // Get user progress data from backend
      const response = await axiosClient.get('/users/progress');
      const data = response.data;
      
      setFormData((prev) => ({
        ...prev,
        name: data.name || "",
        email: user.email || "",
        height: data.height || "",
        age: data.age || "",
        sex: data.sex || "",
        // Get latest values from history arrays
        weight: data.weightHistory?.length > 0 
          ? data.weightHistory[data.weightHistory.length - 1].value 
          : "",
        bodyFat: data.bodyFatHistory?.length > 0 
          ? data.bodyFatHistory[data.bodyFatHistory.length - 1].value 
          : "",
      }));
    } catch (error) {
      console.error("Error:", error);
      setError(error.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Prevent email from being changed
    if (name === 'email') return;
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (formData.age && (formData.age < 13 || formData.age > 100)) {
      setError("Age must be between 13 and 100");
      return false;
    }
    if (formData.height && (formData.height < 100 || formData.height > 250)) {
      setError("Height must be between 100cm and 250cm");
      return false;
    }
    if (formData.weight && (formData.weight < 30 || formData.weight > 300)) {
      setError("Weight must be between 30kg and 300kg");
      return false;
    }
    if (formData.bodyFat && (formData.bodyFat < 3 || formData.bodyFat > 50)) {
      setError("Body fat must be between 3% and 50%");
      return false;
    }
    return true;
  };

  const handleUpdateProfile = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      // Build update data with all profile fields
      const updateData = {};
      
      // Profile fields that overwrite
      if (formData.name) updateData.name = formData.name;
      if (formData.height) updateData.height = parseFloat(formData.height);
      if (formData.age) updateData.age = parseInt(formData.age);
      if (formData.sex) updateData.sex = formData.sex;
      
      // History fields that append
      if (formData.weight) updateData.weight = parseFloat(formData.weight);
      if (formData.bodyFat) updateData.bodyFat = parseFloat(formData.bodyFat);
      
      if (Object.keys(updateData).length > 0) {
        await axiosClient.post('/users/progress', updateData);
        setMessage("Profile updated successfully!");
        
        // Reload data to reflect changes
        setTimeout(() => {
          getUserProgress();
        }, 1000);
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full text-white bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(17, 24, 39, 0.8), rgba(31, 41, 55, 0.8)), url(${dashboardBg})`,
        backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <div className="absolute top-6 left-6 flex items-center space-x-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center space-x-2 text-white hover:text-blue-300 transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Profile Form */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl shadow-xl">
            <h2 className="text-3xl font-bold mb-8 text-center">
              Profile Settings
            </h2>

            {/* Basic Info */}
            <div className="space-y-6">
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="bg-gray-700/50 px-4 py-2 rounded-lg w-full border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  placeholder="Enter your name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium block mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="bg-gray-700/50 px-4 py-2 rounded-lg w-full border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="Age"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm font-medium block mb-2">
                    Sex
                  </label>
                  <select
                    name="sex"
                    value={formData.sex}
                    onChange={handleInputChange}
                    className="bg-gray-700/50 px-4 py-2 rounded-lg w-full border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-white"
                  >
                    <option value="" className="bg-gray-800 text-white">Select</option>
                    <option value="Male" className="bg-gray-800 text-white">Male</option>
                    <option value="Female" className="bg-gray-800 text-white">Female</option>
                    <option value="Other" className="bg-gray-800 text-white">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium block mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleInputChange}
                    className="bg-gray-700/50 px-4 py-2 rounded-lg w-full border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="Height in cm"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm font-medium block mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    className="bg-gray-700/50 px-4 py-2 rounded-lg w-full border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="Weight in kg"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">
                  Body Fat (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="bodyFat"
                  value={formData.bodyFat}
                  onChange={handleInputChange}
                  className="bg-gray-700/50 px-4 py-2 rounded-lg w-full border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  placeholder="Body fat percentage"
                />
              </div>
            </div>

            {/* Messages */}
            {message && (
              <div className="mt-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-400">
                {message}
              </div>
            )}
            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="mt-8 space-y-4">
              <button
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                onClick={handleUpdateProfile}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>

              <button
                onClick={handleLogout}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500 py-3 rounded-lg font-medium transition-colors duration-200"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
