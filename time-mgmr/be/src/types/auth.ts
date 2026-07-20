export type UserRole = 'admin' | 'user' | 'guest';
export type ThemePreference = 'light' | 'dark' | 'velvet' | 'system';

export interface IUser {
	id: string;
	name: string;
	displayName?: string;
	email: string;
	role: UserRole;
	avatar?: string;
	themePreference?: ThemePreference;
	createdAt: string;
	updatedAt: string;
}

export interface IAuthCredentials {
	email: string;
	password: string;
}

export interface IAuthResponse {
	user: IUser;
	/** Issued for cookie-setting / tooling; not returned in browser JSON responses. */
	token: string;
	refreshToken?: string;
}

export interface IRefreshResponse {
	token: string;
	refreshToken?: string;
}

/** Browser login response — tokens are set via HttpOnly cookies only. */
export interface IAuthLoginResponse {
	user: IUser;
}

export interface IUserProfileRecord {
	pk: string;
	sk: string;
	entityType: 'user_profile';
	gsi1pk: string;
	gsi1sk: string;
	id: string;
	name: string;
	displayName?: string;
	email: string;
	role: UserRole;
	avatar?: string;
	themePreference?: ThemePreference;
	createdAt: string;
	updatedAt: string;
}

export interface IUserCredentialsRecord {
	pk: string;
	sk: string;
	entityType: 'user_credentials';
	passwordHash: string;
	createdAt: string;
	updatedAt: string;
}

export interface IRefreshTokenRecord {
	pk: string;
	sk: string;
	entityType: 'refresh_token';
	tokenId: string;
	userId: string;
	expireAt: number;
	createdAt: string;
}

export interface IAccessTokenPayload {
	sub: string;
	email: string;
	role: UserRole;
}

export interface IRefreshTokenPayload {
	sub: string;
	jti: string;
}
