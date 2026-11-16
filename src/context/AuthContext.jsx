import React, { createContext, useState, useEffect } from 'react';
import { authAPI } from '../api';
import { getAccessToken, clearAccessToken, setOnAuthFailure } from '../api/tokenStore';
import { queryClient } from '../lib/queryClient';
import i18n from '../i18n';

const syncUserLanguage = (userData) => {
    if (userData?.preferredLanguage) {
        i18n.changeLanguage(userData.preferredLanguage);
    }
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setOnAuthFailure(() => {
            queryClient.clear();
            setUser(null);
        });

        const token = getAccessToken();
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                syncUserLanguage(parsedUser);
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
                    syncUserLanguage(data.user);
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
        queryClient.clear();
        setUser(data.user);
        syncUserLanguage(data?.user);
        return data;
    };

    const googleLogin = async (idToken) => {
        const data = await authAPI.googleLogin(idToken);
        queryClient.clear();
        setUser(data.user);
        syncUserLanguage(data?.user);
        return data;
    };

    const register = async (userData) => {
        const data = await authAPI.register(userData);
        return data;
    };

    const logout = async () => {
        queryClient.clear();
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
