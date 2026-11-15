const TOKEN_KEY = 'token';
const USER_KEY = 'user';

let onAuthFailureHandler = null;

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);

export const setAccessToken = (token) => {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        localStorage.removeItem(TOKEN_KEY);
    }
};

export const clearAccessToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
