import { runFirstFocusReminders } from '../services/firstFocusReminder.js';

export async function handler(): Promise<{
	ok: true;
	usersChecked: number;
	remindersSent: number;
	skipped: number;
}> {
	const result = await runFirstFocusReminders(new Date());
	console.log('firstFocusReminder', result);
	return { ok: true, ...result };
}
