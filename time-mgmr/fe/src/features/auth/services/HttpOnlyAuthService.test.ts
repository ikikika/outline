import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpOnlyAuthService } from '@/features/auth/services/HttpOnlyAuthService';
import type { IUser } from '@/core/types/common';
import {
	resetAuthSessionForTests,
	useCookieAuthMode,
} from '@/features/auth/session/authSession';

const mockApi = vi.hoisted(() => ({
	loginRequest: vi.fn(),
	logoutRequest: vi.fn(),
	getCurrentUserRequest: vi.fn(),
	mapAuthError: vi.fn((error: unknown) =>
		error instanceof Error ? error : new Error(String(error))
	),
}));

vi.mock('@/features/auth/api/authApi', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/auth/api/authApi')>();
	return {
		...actual,
		...mockApi,
		mapAuthError: mockApi.mapAuthError,
	};
});

vi.mock('@/features/auth/api/authRefreshApi', () => ({
	refreshTokenRequest: vi.fn().mockResolvedValue({ ok: true }),
}));

const user: IUser = {
	id: 'u1',
	name: 'Jane Doe',
	displayName: 'Jane',
	email: 'jane@example.com',
	role: 'admin',
	themePreference: 'light',
	createdAt: new Date('2025-01-01T00:00:00.000Z'),
	updatedAt: new Date('2025-01-02T00:00:00.000Z'),
};

describe('HttpOnlyAuthService', () => {
	beforeEach(() => {
		resetAuthSessionForTests();
		useCookieAuthMode();
		vi.clearAllMocks();
	});

	it('login uses credentials and does not require tokens in the response', async () => {
		mockApi.loginRequest.mockResolvedValue({ user });

		const service = new HttpOnlyAuthService();
		const result = await service.login({
			email: 'jane@example.com',
			password: 'safe-password',
		});

		expect(result.user).toEqual(user);
		expect(mockApi.loginRequest).toHaveBeenCalledWith(
			{ email: 'jane@example.com', password: 'safe-password' },
			{ includeCredentials: true }
		);
		expect(service.getAccessToken()).toBeNull();
	});

	it('logout sends credentials and clears session leftovers', async () => {
		mockApi.logoutRequest.mockResolvedValue(undefined);

		const service = new HttpOnlyAuthService();
		await service.logout();

		expect(mockApi.logoutRequest).toHaveBeenCalledWith({ includeCredentials: true });
	});

	it('getCurrentUser uses credentialed authenticated requests', async () => {
		mockApi.getCurrentUserRequest.mockResolvedValue(user);

		const service = new HttpOnlyAuthService();
		const current = await service.getCurrentUser();

		expect(current).toEqual(user);
		expect(mockApi.getCurrentUserRequest).toHaveBeenCalledWith({
			includeCredentials: true,
			auth: true,
		});
	});

	it('refreshToken returns cookie sentinel via cookie refresh path', async () => {
		const service = new HttpOnlyAuthService();
		const token = await service.refreshToken();
		expect(token).toBe('cookie');
	});
});
