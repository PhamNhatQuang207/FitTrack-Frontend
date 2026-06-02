import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import axiosClient from "../api/axiosClient";
import { ArrowLeft, User, LogOut, Save } from "lucide-react";

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "", age: "", sex: "", height: "", weight: "", bodyFat: "", email: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const getUserProgress = useCallback(async () => {
    try {
      if (!user) { navigate("/login"); return; }
      const response = await axiosClient.get('/users/progress');
      const data = response.data;
      setFormData((prev) => ({
        ...prev,
        name: data.name || "",
        email: user.email || "",
        height: data.height || "",
        age: data.age || "",
        sex: data.sex || "",
        weight: data.weightHistory?.length > 0 ? data.weightHistory[data.weightHistory.length - 1].value : "",
        bodyFat: data.bodyFatHistory?.length > 0 ? data.bodyFatHistory[data.bodyFatHistory.length - 1].value : "",
      }));
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => { getUserProgress(); }, [getUserProgress]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (formData.age && (formData.age < 13 || formData.age > 100)) { setError("Age must be between 13 and 100"); return false; }
    if (formData.height && (formData.height < 100 || formData.height > 250)) { setError("Height must be between 100cm and 250cm"); return false; }
    if (formData.weight && (formData.weight < 30 || formData.weight > 300)) { setError("Weight must be between 30kg and 300kg"); return false; }
    if (formData.bodyFat && (formData.bodyFat < 3 || formData.bodyFat > 50)) { setError("Body fat must be between 3% and 50%"); return false; }
    return true;
  };

  const handleUpdateProfile = async () => {
    if (!validateForm()) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const updateData = {};
      if (formData.name) updateData.name = formData.name;
      if (formData.height) updateData.height = parseFloat(formData.height);
      if (formData.age) updateData.age = parseInt(formData.age);
      if (formData.sex) updateData.sex = formData.sex;
      if (formData.weight) updateData.weight = parseFloat(formData.weight);
      if (formData.bodyFat) updateData.bodyFat = parseFloat(formData.bodyFat);
      if (Object.keys(updateData).length > 0) {
        await axiosClient.post('/users/progress', updateData);
        setMessage("Profile updated successfully!");
        setTimeout(() => {
          getUserProgress();
          if (formData.name) updateUser({ name: formData.name });
        }, 800);
      }
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  if (loading) {
    return (
      <div className="ft-page min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="ft-loader mx-auto mb-4" />
          <p className="ft-label">Loading Profile...</p>
        </div>
      </div>
    );
  }

  const FIELD_GROUPS = [
    {
      title: "Identity",
      fields: [
        { label: "Full Name", name: "name", type: "text", placeholder: "John Doe", full: true },
        { label: "Email", name: "email", type: "email", placeholder: user?.email, disabled: true, full: true },
        { label: "Age", name: "age", type: "number", placeholder: "e.g. 25" },
        { label: "Sex", name: "sex", type: "select", options: ["", "Male", "Female", "Other"] },
      ],
    },
    {
      title: "Physical Stats",
      fields: [
        { label: "Height (cm)", name: "height", type: "number", placeholder: "e.g. 175" },
        { label: "Weight (kg)", name: "weight", type: "number", placeholder: "e.g. 75", step: "0.1" },
        { label: "Body Fat (%)", name: "bodyFat", type: "number", placeholder: "e.g. 15", step: "0.1", full: true },
      ],
    },
  ];

  return (
    <div className="ft-page min-h-screen">
      {/* Header */}
      <div className="ft-header px-4 md:px-8 py-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between h-16">
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
          <h1 className="ft-title text-2xl md:text-3xl text-neon-lime">Profile</h1>
          <div className="w-20 hidden md:block" />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-8">

        {/* Athlete card */}
        <div className="mb-6 animate-slide-up flex items-center gap-4 p-4"
          style={{ background: 'rgba(204,255,0,0.05)', border: '1px solid rgba(204,255,0,0.2)', borderRadius: '2px' }}>
          <div
            className="w-14 h-14 flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(204,255,0,0.1)', border: '1px solid rgba(204,255,0,0.3)', borderRadius: '2px' }}
          >
            <User size={24} style={{ color: '#CCFF00' }} />
          </div>
          <div>
            <h2 className="ft-title text-xl text-white">{formData.name || user?.name || 'Athlete'}</h2>
            <p className="text-xs mt-0.5" style={{ color: '#A0A0A0' }}>{formData.email}</p>
          </div>
          <div className="ml-auto">
            <span className="ft-badge-lime">Active</span>
          </div>
        </div>

        {/* Form sections */}
        {FIELD_GROUPS.map(group => (
          <div
            key={group.title}
            className="mb-5 p-5 animate-slide-up"
            style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(204,255,0,0.1)', borderRadius: '2px' }}
          >
            <p className="ft-label mb-4">// {group.title}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.fields.map(field => (
                <div key={field.name} className={field.full ? 'md:col-span-2' : ''}>
                  <label className="ft-label">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleInputChange}
                      className="ft-input"
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="" style={{ background: '#0A0A0A' }}>Select...</option>
                      {field.options.filter(Boolean).map(opt => (
                        <option key={opt} value={opt} style={{ background: '#0A0A0A' }}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleInputChange}
                      placeholder={field.disabled ? formData.email : field.placeholder}
                      className="ft-input"
                      disabled={field.disabled}
                      step={field.step}
                      style={field.disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Messages */}
        {message && (
          <div className="mb-4 px-3 py-2 text-neon-lime text-sm border border-[rgba(204,255,0,0.3)] bg-[rgba(204,255,0,0.06)] rounded-sm font-medium animate-slide-up">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 px-3 py-2 text-[#FF5C00] text-sm border border-[rgba(255,92,0,0.3)] bg-[rgba(255,92,0,0.06)] rounded-sm font-medium animate-slide-up">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 animate-slide-up">
          <button
            id="save-profile"
            onClick={handleUpdateProfile}
            disabled={saving}
            className="ft-btn-primary flex-1 flex items-center justify-center gap-2 py-3 disabled:opacity-60"
          >
            {saving ? (
              <><span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin inline-block" /> Saving...</>
            ) : (
              <><Save size={16} /> Save Changes</>
            )}
          </button>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 py-3 font-display font-bold uppercase tracking-wider text-sm transition-colors"
            style={{ border: '1px solid rgba(255,92,0,0.3)', borderRadius: '2px', color: '#FF5C00', background: 'rgba(255,92,0,0.06)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,92,0,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,92,0,0.06)'}
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </main>
    </div>
  );
}
