import { fromZonedTime } from 'date-fns-tz';

/**
 * Reinterpret an ISO string that was labeled with `Z` but actually meant wall
 * time in `sourceTimeZone`, producing a true UTC instant.
 */
export function wallTimeLabeledZToUtc(
	isoLabeledAsWall: string,
	sourceTimeZone: string
): string {
	const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?/.exec(
		isoLabeledAsWall
	);
	if (!match) {
		return isoLabeledAsWall;
	}

	const year = Number(match[1].slice(0, 4));
	const month = Number(match[1].slice(5, 7));
	const day = Number(match[1].slice(8, 10));
	const hours = Number(match[2].slice(0, 2));
	const minutes = Number(match[2].slice(3, 5));
	const seconds = Number(match[3] ?? '0');

	const wall = new Date(year, month - 1, day, hours, minutes, seconds, 0);
	return fromZonedTime(wall, sourceTimeZone).toISOString();
}

export function isValidTimeZone(timeZone: string): boolean {
	try {
		Intl.DateTimeFormat(undefined, { timeZone });
		return Boolean(timeZone.trim());
	} catch {
		return false;
	}
}
