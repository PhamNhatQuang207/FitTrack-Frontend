import React from 'react';
import { render, screen } from '@testing-library/react';
// react-router-dom is mapped to a test double (see package.json moduleNameMapper),
// which exports both useNavigate and the underlying spy.
import { mockNavigate } from 'react-router-dom';
import Login from './Login';
import { useAuth } from '../hooks/useAuth';

jest.mock('../hooks/useAuth');

beforeEach(() => {
    mockNavigate.mockClear();
});

test('redirects an already-authenticated user straight to the dashboard', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, login: jest.fn() });

    render(<Login />);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
});

test('shows the login form (no redirect) when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, login: jest.fn() });

    render(<Login />);

    expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard', { replace: true });
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
});
