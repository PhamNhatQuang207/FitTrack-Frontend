import axiosClient from './axiosClient';

// Auth API calls
export const authAPI = {
    register: async (userData) => {
        const response = await axiosClient.post('/auth/register', userData);
        return response.data;
    },
    
    login: async (credentials) => {
        const response = await axiosClient.post('/auth/login', credentials);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            // Create user object from response
            const user = {
                id: response.data.userId,
                name: response.data.name
            };
            localStorage.setItem('user', JSON.stringify(user));
            return { ...response.data, user };
        }
        return response.data;
    },

    googleLogin: async (idToken) => {
        const response = await axiosClient.post('/auth/google', { idToken });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            const user = {
                id: response.data.userId,
                name: response.data.name
            };
            localStorage.setItem('user', JSON.stringify(user));
            return { ...response.data, user };
        }
        return response.data;
    },
    
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
    }
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

