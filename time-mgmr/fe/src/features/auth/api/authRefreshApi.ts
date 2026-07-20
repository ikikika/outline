import { API_BASE_URL } from '@/core/constants/app';
import { postJson, type IHttpRequestOptions } from '@/services/httpClient';

const AUTH_BASE_URL = `${API_BASE_URL}/auth`;

export interface IRefreshResponse {
	ok?: boolean;
	token?: string;
	refreshToken?: string;
}

export async function refreshTokenRequest(
	refreshToken?: string,
	options: IHttpRequestOptions = {}
): Promise<IRefreshResponse> {
	return postJson<IRefreshResponse>(
		`${AUTH_BASE_URL}/refresh`,
		refreshToken ? { refreshToken } : {},
		options
	);
}
