import React from 'react';
import { render, screen } from '@testing-library/react';
// react-router-dom is mapped to a test double (see package.json moduleNameMapper),
// which exports both useNavigate and the underlying spy.
import { mockNavigate } from 'react-router-dom';
import Register from './Register';
import { useAuth } from '../hooks/useAuth';

jest.mock('../hooks/useAuth');

beforeEach(() => {
    mockNavigate.mockClear();
});

test('redirects an already-authenticated user straight to the dashboard', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, register: jest.fn() });

    render(<Register />);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
});

test('shows the register form (no redirect) when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, register: jest.fn() });

    render(<Register />);

    expect(mockNavigate).not.toHaveBeenCalledWith('/dashboard', { replace: true });
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
});
