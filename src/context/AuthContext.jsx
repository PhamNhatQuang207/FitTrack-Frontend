import React, { createContext, useState, useEffect } from 'react';
import { authAPI } from '../api';
import { setOnAuthFailure } from '../api/tokenStore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setOnAuthFailure(() => setUser(null));

        // Clean up any legacy credentials left in localStorage from older builds.
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        const bootstrapSession = async () => {
            try {
                const data = await authAPI.refreshSession();
                if (!cancelled && data?.user) {
                    setUser(data.user);
                }
            } catch {
                if (!cancelled) {
                    setUser(null);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        bootstrapSession();

        return () => {
            cancelled = true;
            setOnAuthFailure(null);
        };
    }, []);

    const login = async (credentials) => {
        const data = await authAPI.login(credentials);
        setUser(data.user);
        return data;
    };

    const googleLogin = async (idToken) => {
        const data = await authAPI.googleLogin(idToken);
        setUser(data.user);
        return data;
    };

    const register = async (userData) => {
        const data = await authAPI.register(userData);
        return data;
    };

    const logout = async () => {
        setUser(null);
        await authAPI.logout();
    };

    const updateUser = (updates) => {
        setUser((prev) => (prev ? { ...prev, ...updates } : updates));
    };

    const value = {
        user,
        login,
        googleLogin,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
