import axios from 'axios';

// Create centralized axios instance
// Note: Create React App uses process.env, not import.meta.env
const BASE_URL = process.env.REACT_APP_API_URL || 'https://api.fittrack.io.vn/api';

const axiosClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to attach JWT token
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Pages where a 401 is an expected part of the flow (bad login, unverified
// email, reset link). Bouncing to /login here would interrupt the form and
// can cause redirect churn, so we let the page handle the error itself.
const AUTH_PATHS = ['/login', '/register', '/reset-password', '/verify-email'];

// Response interceptor: treat a 401 as an expired/invalid session ONLY when we
// actually had a token. An anonymous 401 (e.g. a failed login attempt) is left
// for the calling page to display, instead of hard-redirecting and wiping state.
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const hadToken = !!localStorage.getItem('token');
        const onAuthPage = AUTH_PATHS.some((p) => window.location.pathname.startsWith(p));

        if (error.response?.status === 401 && hadToken && !onAuthPage) {
            // A previously valid session was rejected — clear it and send the
            // user to log in again.
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
