import axiosClient, { refreshAccessToken } from './axiosClient';
import { setAccessToken, clearAccessToken } from './tokenStore';

const buildUser = (data) => ({
    id: data.userId,
    name: data.name,
    ...(data.email ? { email: data.email } : {}),
    preferredLanguage: data.preferredLanguage || 'en',
});

const persistSession = (data) => {
    setAccessToken(data.token);
    const user = buildUser(data);
    localStorage.setItem('user', JSON.stringify(user));
    return { ...data, user };
};

// Auth API calls
export const authAPI = {
    register: async (userData) => {
        const response = await axiosClient.post('/auth/register', userData);
        return response.data;
    },

    login: async (credentials) => {
        const response = await axiosClient.post('/auth/login', credentials);
        if (response.data.token) {
            return persistSession(response.data);
        }
        return response.data;
    },

    googleLogin: async (idToken) => {
        const response = await axiosClient.post('/auth/google', { idToken });
        if (response.data.token) {
            return persistSession(response.data);
        }
        return response.data;
    },

    refreshSession: async () => {
        const data = await refreshAccessToken();
        return persistSession(data);
    },

    logout: async () => {
        clearAccessToken();
        try {
            await axiosClient.post('/auth/logout');
        } catch {
            // Cookie/DB cleanup best-effort; localStorage is already cleared.
        }
    }
};

// User API calls
export const userAPI = {
    getProgress: async () => {
        const response = await axiosClient.get('/users/progress');
        return response.data;
    },
    
    updateProgress: async (progressData) => {
        const response = await axiosClient.post('/users/progress', progressData);
        return response.data;
    },

    updateLanguage: async (preferredLanguage) =>
        (await axiosClient.patch('/users/language', { preferredLanguage })).data
};

// Workout API calls
export const workoutAPI = {
    getWorkouts: async () => {
        const response = await axiosClient.get('/workouts');
        return response.data;
    },
    
    logWorkout: async (workoutData) => {
        const response = await axiosClient.post('/workouts', workoutData);
        return response.data;
    }
};

export const muscleGroupAPI = {
    getAll: async () => {
        const response = await axiosClient.get('/muscle-groups');
        return response.data;
    }
};

export const siteConfigAPI = {
    get: async () => {
        const response = await axiosClient.get('/site-config');
        return response.data;
    }
};

export const exerciseAPI = {
    getAll: async () => {
        const response = await axiosClient.get('/exercises');
        return response.data;
    },
    getByCategory: async (slug) => {
        const response = await axiosClient.get(`/exercises/category/${slug}`);
        return response.data;
    }
};

export const workoutSessionAPI = {
    getAll: async () => {
        const response = await axiosClient.get('/workout-sessions');
        return response.data;
    },
    getById: async (id) => {
        const response = await axiosClient.get(`/workout-sessions/${id}`);
        return response.data;
    },
    create: async (payload) => {
        const response = await axiosClient.post('/workout-sessions', payload);
        return response.data;
    },
    start: async (id) => {
        const response = await axiosClient.patch(`/workout-sessions/${id}/start`);
        return response.data;
    },
    update: async (id, payload) => {
        const response = await axiosClient.put(`/workout-sessions/${id}`, payload);
        return response.data;
    },
    complete: async (id) => {
        const response = await axiosClient.patch(`/workout-sessions/${id}/complete`);
        return response.data;
    },
    remove: async (id) => {
        const response = await axiosClient.delete(`/workout-sessions/${id}`);
        return response.data;
    }
};

export const weeklyPlanAPI = {
    getAll: async () => {
        const response = await axiosClient.get('/weekly-plans');
        return response.data;
    },
    getById: async (id) => {
        const response = await axiosClient.get(`/weekly-plans/${id}`);
        return response.data;
    },
    create: async (payload) => {
        const response = await axiosClient.post('/weekly-plans', payload);
        return response.data;
    },
    update: async (id, payload) => {
        const response = await axiosClient.put(`/weekly-plans/${id}`, payload);
        return response.data;
    },
    remove: async (id) => {
        const response = await axiosClient.delete(`/weekly-plans/${id}`);
        return response.data;
    }
};

export const weeklyScheduleAPI = {
    getCurrent: async () => {
        const response = await axiosClient.get('/weekly-schedules/current');
        return response.data;
    },
    start: async (weeklyPlanId) => {
        const response = await axiosClient.post('/weekly-schedules/start', { weeklyPlanId });
        return response.data;
    },
    complete: async (id) => {
        const response = await axiosClient.patch(`/weekly-schedules/${id}/complete`);
        return response.data;
    },
    completeDay: async (id, payload) => {
        const response = await axiosClient.patch(`/weekly-schedules/${id}/complete-day`, payload);
        return response.data;
    },
    updateDay: async (id, payload) => {
        const response = await axiosClient.patch(`/weekly-schedules/${id}/update-day`, payload);
        return response.data;
    }
};

export const analyticsAPI = {
    getUserExercises: async () => {
        const response = await axiosClient.get('/analytics/user-exercises');
        return response.data;
    },
    getWorkoutStats: async () => {
        const response = await axiosClient.get('/analytics/workout-stats');
        return response.data;
    },
    getWeeklyProgress: async () => {
        const response = await axiosClient.get('/analytics/weekly-progress');
        return response.data;
    },
    getStrengthProgression: async (exerciseName) => {
        const response = await axiosClient.get(
            `/analytics/strength-progression/${encodeURIComponent(exerciseName)}`
        );
        return response.data;
    }
};

export const aiAPI = {
    chat: async ({ conversationId, message }) => {
        const response = await axiosClient.post('/ai/chat', { conversationId, message });
        return response.data;
    },
    getConversations: async () => {
        const response = await axiosClient.get('/ai/conversations');
        return response.data;
    },
    getConversation: async (id) => {
        const response = await axiosClient.get(`/ai/conversations/${id}`);
        return response.data;
    },
    deleteConversation: async (id) => {
        const response = await axiosClient.delete(`/ai/conversations/${id}`);
        return response.data;
    },
    getMemories: async () => {
        const response = await axiosClient.get('/ai/memories');
        return response.data;
    },
    deleteMemory: async (id) => {
        const response = await axiosClient.delete(`/ai/memories/${id}`);
        return response.data;
    },
    applyPlan: async (conversationId, messageId, action = 'activate_schedule') => {
        const response = await axiosClient.post(
            `/ai/conversations/${conversationId}/messages/${messageId}/apply-plan`,
            { action }
        );
        return response.data;
    },
    getMcpKeyStatus: async () => {
        const response = await axiosClient.get('/ai/mcp-key');
        return response.data;
    },
    generateMcpKey: async () => {
        const response = await axiosClient.post('/ai/mcp-key');
        return response.data;
    },
    revokeMcpKey: async () => {
        const response = await axiosClient.delete('/ai/mcp-key');
        return response.data;
    }
};

export const feedbackAPI = {
    submit: async ({ screen, content }) => {
        const response = await axiosClient.post('/feedbacks', { screen, content });
        return response.data;
    }
};

