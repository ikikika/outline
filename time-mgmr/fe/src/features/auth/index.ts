/**
 * Auth feature barrel export
 */

export {
	authService,
	createAuthService,
	LocalStorageAuthService,
	HttpOnlyAuthService,
	MemoryAuthService,
	type AuthStorageStrategy,
} from './services/authService';
export { useAuth } from './hooks/useAuth';
export type { IAuthService, IAuthCredentials, IAuthResponse } from './types';
export {
	DEFAULT_TIMETABLE_VISIBLE_START,
	DEFAULT_TIMETABLE_VISIBLE_END,
	resolveTimetableVisibleRange,
	resolveTimetableDayBounds,
	hoursForDayBounds,
	isValidTimetableVisibleRange,
	writeStoredTimetableVisibleRange,
	type ITimetableVisibleRange,
} from './preferences/timetableVisibleRange';
export { updateCurrentUserRequest } from './api/authApi';
