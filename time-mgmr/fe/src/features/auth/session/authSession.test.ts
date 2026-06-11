import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	getAccessToken,
	onSessionExpired,
	refreshSession,
	resetAuthSessionForTests,
	setTokens,
	useCookieAuthMode,
	useMemoryAuthTokens,
} from '@/features/auth/session/authSession';

vi.mock('@/features/auth/api/authRefreshApi', () => ({
	refreshTokenRequest: vi.fn(),
}));

import { refreshTokenRequest } from '@/features/auth/api/authRefreshApi';

const mockRefreshTokenRequest = vi.mocked(refreshTokenRequest);

describe('authSession', () => {
	beforeEach(() => {
		resetAuthSessionForTests();
		useMemoryAuthTokens();
		vi.clearAllMocks();
	});

	it('stores and reads access and refresh tokens', () => {
		setTokens('access-1', 'refresh-1');

		expect(getAccessToken()).toBe('access-1');
	});

	it('refreshSession updates tokens from the API (legacy storage)', async () => {
		setTokens('access-1', 'refresh-1');
		mockRefreshTokenRequest.mockResolvedValue({
			token: 'access-2',
			refreshToken: 'refresh-2',
		});

		const token = await refreshSession();

		expect(token).toBe('access-2');
		expect(getAccessToken()).toBe('access-2');
		expect(mockRefreshTokenRequest).toHaveBeenCalledWith('refresh-1');
	});

	it('refreshSession single-flights concurrent callers', async () => {
		setTokens('access-1', 'refresh-1');
		mockRefreshTokenRequest.mockImplementation(async () => {
			await new Promise((resolve) => setTimeout(resolve, 10));
			return { token: 'access-2', refreshToken: 'refresh-2' };
		});

		const [tokenA, tokenB] = await Promise.all([refreshSession(), refreshSession()]);

		expect(tokenA).toBe('access-2');
		expect(tokenB).toBe('access-2');
		expect(mockRefreshTokenRequest).toHaveBeenCalledTimes(1);
	});

	it('refreshSession clears session and notifies listeners on failure', async () => {
		setTokens('access-1', 'refresh-1');
		const expired = vi.fn();
		onSessionExpired(expired);
		mockRefreshTokenRequest.mockRejectedValue(new Error('invalid refresh'));

		await expect(refreshSession()).rejects.toThrow('invalid refresh');

		expect(getAccessToken()).toBeNull();
		expect(expired).toHaveBeenCalledTimes(1);
	});

	it('cookie mode refreshSession stores returned tokens and sends memory refresh', async () => {
		useCookieAuthMode();
		setTokens('access-1', 'refresh-1');
		mockRefreshTokenRequest.mockResolvedValue({
			ok: true,
			token: 'access-2',
			refreshToken: 'refresh-2',
		});

		const token = await refreshSession();

		expect(token).toBe('access-2');
		expect(getAccessToken()).toBe('access-2');
		expect(mockRefreshTokenRequest).toHaveBeenCalledWith('refresh-1', {
			includeCredentials: true,
		});
	});

	it('cookie mode refreshSession tolerates cookie-only responses', async () => {
		useCookieAuthMode();
		mockRefreshTokenRequest.mockResolvedValue({ ok: true });

		const token = await refreshSession();

		expect(token).toBe('cookie');
		expect(mockRefreshTokenRequest).toHaveBeenCalledWith(undefined, {
			includeCredentials: true,
		});
	});
});
