import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../api';
import { triggerAuthFailure } from '../api/tokenStore';
import { queryClient } from '../lib/queryClient';

// The provider talks to the API on mount/login/logout — stub it so these are
// pure unit tests of the context's state logic, with no network.
jest.mock('../api', () => ({
    authAPI: {
        login: jest.fn(),
        googleLogin: jest.fn(),
        register: jest.fn(),
        refreshSession: jest.fn(),
        logout: jest.fn(),
    },
}));

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    authAPI.refreshSession.mockRejectedValue(new Error('No active session'));
});

describe('AuthContext bootstrap (localStorage + refresh cookie fallback)', () => {
    test('hydrates immediately from localStorage when token + user exist without calling refreshSession', () => {
        localStorage.setItem('token', 'jwt-abc');
        localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Quang' }));

        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual({ id: '1', name: 'Quang' });
        expect(authAPI.refreshSession).not.toHaveBeenCalled();
    });

    test('clears corrupted localStorage user and stays logged out if cookie refresh also fails', async () => {
        localStorage.setItem('token', 'jwt-abc');
        localStorage.setItem('user', '{ not valid json');

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current).not.toBeNull());

        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
    });

    test('falls back to refreshSession via HttpOnly cookie when localStorage has no token', async () => {
        localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Quang' }));
        authAPI.refreshSession.mockResolvedValue({
            token: 'fresh-jwt',
            user: { id: '1', name: 'Quang', email: 'q@fit.vn' },
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current).not.toBeNull());

        expect(authAPI.refreshSession).toHaveBeenCalledTimes(1);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual({ id: '1', name: 'Quang', email: 'q@fit.vn' });
    });

    test('stays logged out when nothing is in localStorage and cookie refresh fails', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current).not.toBeNull());

        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
    });
});

describe('AuthContext actions', () => {
    test('login sets the user from the API response and clears queryClient cache', async () => {
        authAPI.login.mockResolvedValue({ user: { id: '1', name: 'Quang', email: 'q@fit.vn' } });
        const clearSpy = jest.spyOn(queryClient, 'clear');

        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current).not.toBeNull());

        await act(async () => {
            await result.current.login({ email: 'a@b.com', password: 'secret' });
        });

        expect(authAPI.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' });
        expect(clearSpy).toHaveBeenCalledTimes(1);
        expect(result.current.user).toEqual({ id: '1', name: 'Quang', email: 'q@fit.vn' });
        expect(result.current.isAuthenticated).toBe(true);
        clearSpy.mockRestore();
    });

    test('googleLogin sets the user from the API response', async () => {
        authAPI.googleLogin.mockResolvedValue({ user: { id: '2', name: 'G User', email: 'g@fit.vn' } });

        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current).not.toBeNull());

        await act(async () => {
            await result.current.googleLogin('google-id-token');
        });

        expect(authAPI.googleLogin).toHaveBeenCalledWith('google-id-token');
        expect(result.current.user).toEqual({ id: '2', name: 'G User', email: 'g@fit.vn' });
        expect(result.current.isAuthenticated).toBe(true);
    });

    test('register delegates to the API without logging the user in', async () => {
        authAPI.register.mockResolvedValue({ message: 'check your email' });

        const { result } = renderHook(() => useAuth(), { wrapper });
        await waitFor(() => expect(result.current).not.toBeNull());

        await act(async () => {
            await result.current.register({ name: 'Q', email: 'a@b.com', password: 'secret' });
        });

        expect(authAPI.register).toHaveBeenCalled();
        expect(result.current.isAuthenticated).toBe(false);
    });

    test('logout clears the user immediately, calls the API, and clears queryClient cache', async () => {
        localStorage.setItem('token', 'jwt-abc');
        localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Quang' }));
        authAPI.logout.mockResolvedValue();
        const clearSpy = jest.spyOn(queryClient, 'clear');

        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => {
            await result.current.logout();
        });

        expect(authAPI.logout).toHaveBeenCalledTimes(1);
        expect(clearSpy).toHaveBeenCalledTimes(1);
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        clearSpy.mockRestore();
    });

    test('updateUser merges the update and persists it to localStorage', () => {
        localStorage.setItem('token', 'jwt-abc');
        localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Quang' }));

        const { result } = renderHook(() => useAuth(), { wrapper });

        act(() => {
            result.current.updateUser({ name: 'New Name' });
        });

        expect(result.current.user).toEqual({ id: '1', name: 'New Name' });
        expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: '1', name: 'New Name' });
    });

    test('clears user state when tokenStore triggers auth failure', () => {
        localStorage.setItem('token', 'jwt-abc');
        localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Quang' }));

        const { result } = renderHook(() => useAuth(), { wrapper });

        act(() => {
            triggerAuthFailure();
        });

        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
    });
});

describe('useAuth guard', () => {
    test('throws a helpful error when used outside an AuthProvider', () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => renderHook(() => useAuth())).toThrow(
            'useAuth must be used within an AuthProvider'
        );

        spy.mockRestore();
    });
});
