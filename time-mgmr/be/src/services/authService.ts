import {
	createUser,
	deleteRefreshToken,
	findUserByEmail,
	getRefreshToken,
	getUserCredentials,
	getUserProfile,
	saveRefreshToken,
	toUser,
	updateUserProfile,
} from '../repositories/userRepository.js';
import {
	signAccessToken,
	signRefreshToken,
	verifyRefreshToken,
} from '../lib/jwt.js';
import { verifyPassword } from '../lib/password.js';
import { isValidTimeZone } from '../lib/timezone.js';
import type {
	IAuthCredentials,
	IAuthResponse,
	IRefreshResponse,
	IUser,
	ThemePreference,
} from '../types/auth.js';

export class AuthError extends Error {
	status: number;

	constructor(message: string, status = 401) {
		super(message);
		this.name = 'AuthError';
		this.status = status;
	}
}

async function issueTokens(user: IUser): Promise<IAuthResponse> {
	const token = await signAccessToken({
		userId: user.id,
		email: user.email,
		role: user.role,
	});

	const refresh = await signRefreshToken({ userId: user.id });
	await saveRefreshToken({
		userId: user.id,
		tokenId: refresh.tokenId,
		expireAt: refresh.expireAt,
	});

	return {
		user,
		token,
		refreshToken: refresh.token,
	};
}

export async function login(
	credentials: IAuthCredentials
): Promise<IAuthResponse> {
	if (!credentials.email || !credentials.password) {
		throw new AuthError('Email and password are required', 400);
	}

	if (credentials.password.length < 8) {
		throw new AuthError('Password must be at least 8 characters', 400);
	}

	const profile = await findUserByEmail(credentials.email);
	if (!profile) {
		throw new AuthError('Invalid email or password', 401);
	}

	const storedCredentials = await getUserCredentials(profile.id);
	if (!storedCredentials) {
		throw new AuthError('Invalid email or password', 401);
	}

	const passwordValid = await verifyPassword(
		credentials.password,
		storedCredentials.passwordHash
	);

	if (!passwordValid) {
		throw new AuthError('Invalid email or password', 401);
	}

	return issueTokens(toUser(profile));
}

export async function getCurrentUser(userId: string): Promise<IUser> {
	const profile = await getUserProfile(userId);
	if (!profile) {
		throw new AuthError('User not found', 401);
	}

	return toUser(profile);
}

export async function refreshSession(
	refreshToken: string
): Promise<IRefreshResponse> {
	if (!refreshToken) {
		throw new AuthError('Refresh token is required', 400);
	}

	const payload = await verifyRefreshToken(refreshToken);
	const stored = await getRefreshToken(payload.sub, payload.jti);

	if (!stored) {
		throw new AuthError('Invalid refresh token', 401);
	}

	const profile = await getUserProfile(payload.sub);
	if (!profile) {
		throw new AuthError('User not found', 401);
	}

	await deleteRefreshToken(payload.sub, payload.jti);

	const user = toUser(profile);
	const token = await signAccessToken({
		userId: user.id,
		email: user.email,
		role: user.role,
	});

	const refresh = await signRefreshToken({ userId: user.id });
	await saveRefreshToken({
		userId: user.id,
		tokenId: refresh.tokenId,
		expireAt: refresh.expireAt,
	});

	return {
		token,
		refreshToken: refresh.token,
	};
}

export async function logout(
	userId: string,
	refreshToken?: string
): Promise<void> {
	if (!refreshToken) {
		return;
	}

	try {
		const payload = await verifyRefreshToken(refreshToken);
		if (payload.sub === userId) {
			await deleteRefreshToken(userId, payload.jti);
		}
	} catch {
		// Ignore invalid refresh tokens on logout
	}
}

export async function updateCurrentUser(
	userId: string,
	patch: { timeZone?: string; themePreference?: ThemePreference }
): Promise<IUser> {
	if (patch.timeZone !== undefined && !isValidTimeZone(patch.timeZone)) {
		throw new AuthError('timeZone must be a valid IANA timezone id', 400);
	}

	try {
		return await updateUserProfile(userId, patch);
	} catch {
		throw new AuthError('User not found', 401);
	}
}

export { createUser };
