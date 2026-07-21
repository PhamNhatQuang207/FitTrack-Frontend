import axiosClient from './axiosClient';

// Reach into the registered interceptors directly so we can drive their logic
// without a live server. axiosClient registers exactly one of each.
const requestFulfilled = axiosClient.interceptors.request.handlers[0].fulfilled;
const responseRejected = axiosClient.interceptors.response.handlers[0].rejected;

describe('request interceptor (token attachment)', () => {
    beforeEach(() => localStorage.clear());

    test('attaches the Bearer token when one is stored', () => {
        localStorage.setItem('token', 'jwt-123');

        const config = requestFulfilled({ headers: {} });

        expect(config.headers.Authorization).toBe('Bearer jwt-123');
    });

    test('leaves the Authorization header off when no token is stored', () => {
        const config = requestFulfilled({ headers: {} });

        expect(config.headers.Authorization).toBeUndefined();
    });
});

describe('response interceptor (401 handling)', () => {
    let originalLocation;

    beforeEach(() => {
        localStorage.clear();
        originalLocation = window.location;
        // Replace location with a plain object so we can observe href assignment
        // without triggering real navigation in jsdom.
        delete window.location;
        window.location = { pathname: '/dashboard', href: '' };
    });

    afterEach(() => {
        window.location = originalLocation;
    });

    test('expired session: 401 with a token, off an auth page, clears storage and redirects', async () => {
        localStorage.setItem('token', 'jwt-123');
        localStorage.setItem('user', '{"id":"1"}');
        const error = { response: { status: 401 } };

        await expect(responseRejected(error)).rejects.toBe(error);

        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
        expect(window.location.href).toBe('/login');
    });

    test('anonymous 401 (no token) does NOT redirect or clear anything', async () => {
        const error = { response: { status: 401 } };

        await expect(responseRejected(error)).rejects.toBe(error);

        expect(window.location.href).toBe('');
    });

    test('401 while already on an auth page does NOT redirect (lets the form show the error)', async () => {
        window.location.pathname = '/login';
        localStorage.setItem('token', 'jwt-123');
        const error = { response: { status: 401 } };

        await expect(responseRejected(error)).rejects.toBe(error);

        expect(window.location.href).toBe('');
        expect(localStorage.getItem('token')).toBe('jwt-123');
    });

    test('non-401 errors never trigger a redirect', async () => {
        localStorage.setItem('token', 'jwt-123');
        const error = { response: { status: 500 } };

        await expect(responseRejected(error)).rejects.toBe(error);

        expect(window.location.href).toBe('');
        expect(localStorage.getItem('token')).toBe('jwt-123');
    });

    test('network error with no response object is passed through untouched', async () => {
        localStorage.setItem('token', 'jwt-123');
        const error = new Error('Network Error');

        await expect(responseRejected(error)).rejects.toBe(error);

        expect(window.location.href).toBe('');
        expect(localStorage.getItem('token')).toBe('jwt-123');
    });
});
