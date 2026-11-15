import axios from 'axios';
import {
    getAccessToken,
    setAccessToken,
    triggerAuthFailure,
} from './tokenStore';

// Create centralized axios instance
// Note: Create React App uses process.env, not import.meta.env
const BASE_URL = process.env.REACT_APP_API_URL || 'https://api.fittrack.io.vn/api';

const axiosClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to attach short-lived JWT access token from localStorage (via tokenStore)
axiosClient.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers = config.headers || {};
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

// Single-flight refresh promise so concurrent 401s trigger only one /auth/refresh call.
let refreshPromise = null;

export const refreshAccessToken = () => {
    if (!refreshPromise) {
        refreshPromise = axios
            .post(`${BASE_URL}/auth/refresh`, null, { withCredentials: true })
            .then((res) => {
                const newToken = res.data?.token;
                if (!newToken) {
                    throw new Error('Refresh response missing access token');
                }
                setAccessToken(newToken);
                return res.data;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
};

const isAuthEndpoint = (url = '') => typeof url === 'string' && url.includes('/auth/');

// Response interceptor: when an authenticated request fails with 401 off an auth page,
// silently rotate the HttpOnly refresh cookie for a fresh access token and retry once.
axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const hadToken = !!getAccessToken();
        const onAuthPage = AUTH_PATHS.some((p) => window.location.pathname.startsWith(p));

        if (
            error.response?.status === 401 &&
            hadToken &&
            !onAuthPage &&
            originalRequest &&
            !isAuthEndpoint(originalRequest.url)
        ) {
            if (!originalRequest._retry) {
                try {
                    const refreshed = await refreshAccessToken();
                    originalRequest._retry = true;
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers.Authorization = `Bearer ${refreshed.token}`;
                    return axiosClient.request(originalRequest);
                } catch (refreshError) {
                    triggerAuthFailure();
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            }

            triggerAuthFailure();
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default axiosClient;
