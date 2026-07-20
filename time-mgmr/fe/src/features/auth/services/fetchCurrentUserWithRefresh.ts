import { getCurrentUserRequest } from '../api/authApi';
import type { IAuthResponse } from '../types';
import { getAccessToken, refreshSession } from '../session/authSession';

export async function fetchCurrentUserWithRefresh(): Promise<IAuthResponse['user'] | null> {
	const accessToken = getAccessToken();
	if (!accessToken) {
		return null;
	}

	let user = await getCurrentUserRequest({ accessToken });
	if (user) {
		return user;
	}

	await refreshSession();
	const refreshedToken = getAccessToken();
	if (!refreshedToken) {
		return null;
	}

	user = await getCurrentUserRequest({ accessToken: refreshedToken });
	return user;
}
