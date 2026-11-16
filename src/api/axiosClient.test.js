import axios from 'axios';
import i18n from '../i18n';
import axiosClient from './axiosClient';
import {
    getAccessToken,
    setAccessToken,
    clearAccessToken,
    setOnAuthFailure,
} from './tokenStore';

// Reach into the registered interceptors directly so we can drive their logic
// without a live server. axiosClient registers exactly one of each.
const requestFulfilled = axiosClient.interceptors.request.handlers[0].fulfilled;
const responseRejected = axiosClient.interceptors.response.handlers[0].rejected;

describe('axiosClient configuration', () => {
    test('enables withCredentials for HttpOnly refresh cookies', () => {
        expect(axiosClient.defaults.withCredentials).toBe(true);
    });
});

describe('request interceptor (localStorage access token attachment)', () => {
    beforeEach(() => {
        clearAccessToken();
        localStorage.clear();
    });

    test('attaches the Bearer token from localStorage when one is stored', () => {
        setAccessToken('jwt-local-123');

        const config = requestFulfilled({ headers: {} });

        expect(localStorage.getItem('token')).toBe('jwt-local-123');
        expect(config.headers.Authorization).toBe('Bearer jwt-local-123');
    });

    test('leaves the Authorization header off when no token is stored', () => {
        const config = requestFulfilled({ headers: {} });

        expect(config.headers.Authorization).toBeUndefined();
    });

    test('attaches Accept-Language header from i18n', async () => {
        await i18n.changeLanguage('vi');
        const config = requestFulfilled({ headers: {} });
        expect(config.headers['Accept-Language']).toBe('vi');
    });
});

describe('response interceptor (401 silent refresh & redirect)', () => {
    let originalLocation;

    beforeEach(() => {
        clearAccessToken();
        setOnAuthFailure(null);
        localStorage.clear();
        jest.restoreAllMocks();
        originalLocation = window.location;
        delete window.location;
        window.location = { pathname: '/dashboard', href: '' };
    });

    afterEach(() => {
        window.location = originalLocation;
        jest.restoreAllMocks();
        setOnAuthFailure(null);
    });

    test('401 with stored access token silently refreshes via cookie, updates localStorage, and retries once', async () => {
        setAccessToken('expired-jwt');
        const postSpy = jest.spyOn(axios, 'post').mockResolvedValue({
            data: { token: 'fresh-jwt', userId: '1', name: 'Quang' },
        });
        const requestSpy = jest.spyOn(axiosClient, 'request').mockResolvedValue({
            data: { ok: true },
        });

        const error = {
            response: { status: 401 },
            config: { url: '/workouts', headers: {} },
        };

        const result = await responseRejected(error);

        expect(result).toEqual({ data: { ok: true } });
        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(postSpy).toHaveBeenCalledWith(
            expect.stringMatching(/\/auth\/refresh$/),
            null,
            { withCredentials: true }
        );
        expect(getAccessToken()).toBe('fresh-jwt');
        expect(localStorage.getItem('token')).toBe('fresh-jwt');
        expect(requestSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                _retry: true,
                headers: expect.objectContaining({ Authorization: 'Bearer fresh-jwt' }),
            })
        );
        expect(window.location.href).toBe('');
    });

    test('concurrent 401 responses share a single /auth/refresh request', async () => {
        setAccessToken('expired-jwt');
        let resolveRefresh;
        const postSpy = jest.spyOn(axios, 'post').mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveRefresh = resolve;
                })
        );
        const requestSpy = jest.spyOn(axiosClient, 'request').mockResolvedValue({ data: 'ok' });

        const req1 = { response: { status: 401 }, config: { url: '/workouts', headers: {} } };
        const req2 = { response: { status: 401 }, config: { url: '/weekly-schedules', headers: {} } };

        const p1 = responseRejected(req1);
        const p2 = responseRejected(req2);

        resolveRefresh({ data: { token: 'rotated-jwt' } });
        await Promise.all([p1, p2]);

        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(requestSpy).toHaveBeenCalledTimes(2);
        expect(localStorage.getItem('token')).toBe('rotated-jwt');
    });

    test('when refresh fails, clears localStorage, triggers auth failure, and redirects', async () => {
        setAccessToken('expired-jwt');
        localStorage.setItem('user', '{"id":"1"}');
        const onAuthFailure = jest.fn();
        setOnAuthFailure(onAuthFailure);

        const refreshErr = { response: { status: 401 } };
        jest.spyOn(axios, 'post').mockRejectedValue(refreshErr);

        const error = {
            response: { status: 401 },
            config: { url: '/workouts', headers: {} },
        };

        await expect(responseRejected(error)).rejects.toBe(refreshErr);

        expect(getAccessToken()).toBeNull();
        expect(onAuthFailure).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('user')).toBeNull();
        expect(window.location.href).toBe('/login');
    });

    test('anonymous 401 (no token) does NOT call refresh or redirect', async () => {
        const postSpy = jest.spyOn(axios, 'post');
        const error = { response: { status: 401 }, config: { url: '/workouts', headers: {} } };

        await expect(responseRejected(error)).rejects.toBe(error);

        expect(postSpy).not.toHaveBeenCalled();
        expect(window.location.href).toBe('');
    });

    test('401 on an auth endpoint does NOT call refresh or redirect', async () => {
        setAccessToken('jwt-123');
        const postSpy = jest.spyOn(axios, 'post');
        const error = { response: { status: 401 }, config: { url: '/auth/login', headers: {} } };

        await expect(responseRejected(error)).rejects.toBe(error);

        expect(postSpy).not.toHaveBeenCalled();
        expect(window.location.href).toBe('');
        expect(localStorage.getItem('token')).toBe('jwt-123');
    });

    test('401 while already on an auth page does NOT call refresh or redirect', async () => {
        window.location.pathname = '/login';
        setAccessToken('jwt-123');
        const postSpy = jest.spyOn(axios, 'post');
        const error = { response: { status: 401 }, config: { url: '/workouts', headers: {} } };

        await expect(responseRejected(error)).rejects.toBe(error);

        expect(postSpy).not.toHaveBeenCalled();
        expect(window.location.href).toBe('');
        expect(localStorage.getItem('token')).toBe('jwt-123');
    });

    test('non-401 and network errors never trigger refresh or redirect', async () => {
        setAccessToken('jwt-123');
        const postSpy = jest.spyOn(axios, 'post');

        const serverErr = { response: { status: 500 }, config: { url: '/workouts', headers: {} } };
        await expect(responseRejected(serverErr)).rejects.toBe(serverErr);

        const netErr = new Error('Network Error');
        await expect(responseRejected(netErr)).rejects.toBe(netErr);

        expect(postSpy).not.toHaveBeenCalled();
        expect(window.location.href).toBe('');
        expect(localStorage.getItem('token')).toBe('jwt-123');
    });
});
