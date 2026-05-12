/** Normalize stored or ISO datetime values to HH:mm for API responses. */

const ISO_TIME_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/;
const HH_MM_RE = /^\d{2}:\d{2}$/;

export function parseDateTime(value: string): { date?: string; time?: string } {
	const isoMatch = value.match(ISO_TIME_RE);
	if (isoMatch) {
		return { date: isoMatch[1], time: isoMatch[2] };
	}
	if (HH_MM_RE.test(value)) {
		return { time: value };
	}
	return {};
}

export function toTimeOnly(value: string): string {
	const parsed = parseDateTime(value);
	return parsed.time ?? value;
}

export function toDateOnly(value: string, fallbackDate: string): string {
	const parsed = parseDateTime(value);
	return parsed.date ?? fallbackDate;
}

/** Convert stored HH:mm (legacy) or ISO value to ISO datetime for API responses. */
export function toIsoDateTime(value: string, date: string): string {
	if (value.includes('T')) {
		return value;
	}

	const hhMm = /^(\d{2}:\d{2})(?::(\d{2}))?$/.exec(value);
	if (hhMm) {
		const seconds = hhMm[2] ?? '00';
		return `${date}T${hhMm[1]}:${seconds}.000Z`;
	}

	return value;
}
