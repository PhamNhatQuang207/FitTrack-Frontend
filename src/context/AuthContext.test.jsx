import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../api';

// The provider talks to the API on login/logout — stub it so these are pure
// unit tests of the context's state logic, with no network.
jest.mock('../api', () => ({
    authAPI: {
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
    },
}));

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
});

describe('AuthContext bootstrap from localStorage', () => {
    test('hydrates the user when a valid token + user are stored', () => {
        localStorage.setItem('token', 'jwt-abc');
        localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Quang' }));

        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual({ id: '1', name: 'Quang' });
    });

    test('stays logged out and clears storage when the stored user is corrupted', () => {
        // This is the security/robustness fix: a bad JSON blob must not
        // white-screen the app on mount.
        localStorage.setItem('token', 'jwt-abc');
        localStorage.setItem('user', '{ not valid json');

        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
    });

    test('has no session when nothing is stored', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
    });

    test('does not hydrate when a user exists but the token is missing', () => {
        localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Quang' }));

        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.isAuthenticated).toBe(false);
    });
});

describe('AuthContext actions', () => {
    test('login sets the user from the API response', async () => {
        authAPI.login.mockResolvedValue({ user: { id: '1', name: 'Quang' } });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => {
            await result.current.login({ email: 'a@b.com', password: 'secret' });
        });

        expect(authAPI.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' });
        expect(result.current.user).toEqual({ id: '1', name: 'Quang' });
        expect(result.current.isAuthenticated).toBe(true);
    });

    test('register delegates to the API without logging the user in', async () => {
        authAPI.register.mockResolvedValue({ message: 'check your email' });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => {
            await result.current.register({ name: 'Q', email: 'a@b.com', password: 'secret' });
        });

        expect(authAPI.register).toHaveBeenCalled();
        // Registration requires email verification — no session yet.
        expect(result.current.isAuthenticated).toBe(false);
    });

    test('logout clears the user and calls the API', () => {
        localStorage.setItem('token', 'jwt-abc');
        localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Quang' }));

        const { result } = renderHook(() => useAuth(), { wrapper });

        act(() => {
            result.current.logout();
        });

        expect(authAPI.logout).toHaveBeenCalled();
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
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
