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
