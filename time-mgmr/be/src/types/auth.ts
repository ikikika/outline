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
	/** IANA timezone id, e.g. Asia/Singapore */
	timeZone?: string;
	/** HH:mm local time — default timetable day grid start */
	timetableVisibleStart?: string;
	/** HH:mm local time — default timetable day grid end (exclusive of later hours) */
	timetableVisibleEnd?: string;
	createdAt: string;
	updatedAt: string;
}

export interface IAuthCredentials {
	email: string;
	password: string;
}

export interface IAuthResponse {
	user: IUser;
	token: string;
	refreshToken?: string;
}

export interface IRefreshResponse {
	token: string;
	refreshToken?: string;
}

/** Browser login JSON also includes tokens for cross-origin Bearer fallback. */
export interface IAuthLoginResponse {
	user: IUser;
	token: string;
	refreshToken: string;
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
	timeZone?: string;
	timetableVisibleStart?: string;
	timetableVisibleEnd?: string;
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
