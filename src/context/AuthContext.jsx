import React, { createContext, useState, useEffect } from 'react';
import { authAPI } from '../api';
import { getAccessToken, clearAccessToken, setOnAuthFailure } from '../api/tokenStore';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setOnAuthFailure(() => setUser(null));

        const token = getAccessToken();
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
            try {
                setUser(JSON.parse(storedUser));
                setLoading(false);
                return () => {
                    cancelled = true;
                    setOnAuthFailure(null);
                };
            } catch {
                // Corrupted localStorage — wipe and fall back to refresh cookie.
                clearAccessToken();
            }
        } else {
            clearAccessToken();
        }

        const bootstrapFromCookie = async () => {
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

        bootstrapFromCookie();

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
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
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
