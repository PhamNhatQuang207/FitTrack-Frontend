// In-memory store for the short-lived JWT access token.
// Never persisted to localStorage or sessionStorage.
let accessToken = null;
let onAuthFailureHandler = null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
    accessToken = token || null;
};

export const clearAccessToken = () => {
    accessToken = null;
};

export const setOnAuthFailure = (handler) => {
    onAuthFailureHandler = typeof handler === 'function' ? handler : null;
};

export const triggerAuthFailure = () => {
    clearAccessToken();
    if (onAuthFailureHandler) {
        onAuthFailureHandler();
    }
};
