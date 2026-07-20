import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpClientError, getJsonAuth } from '@/services/httpClient';
import {
	resetAuthSessionForTests,
	useCookieAuthMode,
	useMemoryAuthTokens,
	setTokens,
} from '@/features/auth/session/authSession';

vi.mock('@/features/auth/api/authRefreshApi', () => ({
	refreshTokenRequest: vi.fn(),
}));

import { refreshTokenRequest } from '@/features/auth/api/authRefreshApi';

const mockRefreshTokenRequest = vi.mocked(refreshTokenRequest);

describe('httpClient auth retry', () => {
	beforeEach(() => {
		resetAuthSessionForTests();
		vi.clearAllMocks();
	});

	it('retries authenticated requests after a 401 using cookie refreshSession', async () => {
		useCookieAuthMode();
		mockRefreshTokenRequest.mockResolvedValue({ ok: true });

		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
					statusText: 'Unauthorized',
				})
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ ok: true }), {
					status: 200,
					statusText: 'OK',
				})
			);

		vi.stubGlobal('fetch', fetchMock);

		const result = await getJsonAuth<{ ok: boolean }>('https://api.example.com/api/activities');

		expect(result).toEqual({ ok: true });
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(mockRefreshTokenRequest).toHaveBeenCalledWith(undefined, {
			includeCredentials: true,
		});

		const firstCallInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
		expect(firstCallInit.credentials).toBe('include');

		vi.unstubAllGlobals();
	});

	it('retries with Bearer when legacy tokens are stored', async () => {
		useMemoryAuthTokens();
		setTokens('access-1', 'refresh-1');
		mockRefreshTokenRequest.mockResolvedValue({
			token: 'access-2',
			refreshToken: 'refresh-2',
		});

		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ error: 'Unauthorized' }), {
					status: 401,
					statusText: 'Unauthorized',
				})
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ ok: true }), {
					status: 200,
					statusText: 'OK',
				})
			);

		vi.stubGlobal('fetch', fetchMock);

		await getJsonAuth<{ ok: boolean }>('https://api.example.com/api/activities');

		const secondCallInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
		const headers = new Headers(secondCallInit.headers);
		expect(headers.get('Authorization')).toBe('Bearer access-2');

		vi.unstubAllGlobals();
	});

	it('does not retry refresh endpoint on 401', async () => {
		useCookieAuthMode();
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				statusText: 'Unauthorized',
			})
		);

		vi.stubGlobal('fetch', fetchMock);

		await expect(
			getJsonAuth('https://api.example.com/api/auth/refresh')
		).rejects.toBeInstanceOf(HttpClientError);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(mockRefreshTokenRequest).not.toHaveBeenCalled();

		vi.unstubAllGlobals();
	});
});
