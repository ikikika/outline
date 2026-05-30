import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { authMiddleware } from '../middleware/auth.js';
import { registerActivityRoutes } from '../routes/activities.js';
import { registerAuthRoutes } from '../routes/auth.js';
import { registerHealthRoutes } from '../routes/health.js';
import { registerTaskRoutes } from '../routes/tasks.js';
import { registerTimeEntryRoutes } from '../routes/timeEntries.js';
import { registerScheduleBlockRoutes } from '../routes/scheduleBlocks.js';
import { registerAutoScheduleRoutes } from '../routes/autoSchedule.js';

const app = new Hono();

app.use('*', logger());
app.use(
	'*',
	cors({
		origin: [
			'http://localhost:3000',
			'http://127.0.0.1:3000',
			'http://localhost:5173',
			'http://127.0.0.1:5173',
			'https://tempo.codeoctagon.com',
		],
		allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	})
);

const api = new Hono();

registerHealthRoutes(api);
registerAuthRoutes(api);

api.use('/activities', authMiddleware);
api.use('/activities/*', authMiddleware);
api.use('/tasks', authMiddleware);
api.use('/tasks/*', authMiddleware);
api.use('/schedule-blocks', authMiddleware);
api.use('/schedule-blocks/*', authMiddleware);
api.use('/time-entries', authMiddleware);
api.use('/time-entries/*', authMiddleware);

registerActivityRoutes(api);
registerTaskRoutes(api);
registerScheduleBlockRoutes(api);
registerAutoScheduleRoutes(api);
registerTimeEntryRoutes(api);

api.notFound((c) => c.json({ error: 'Not found' }, 404));

api.onError((error, c) => {
	console.error(error);
	return c.json({ error: 'Internal server error' }, 500);
});

app.route('/api', api);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((error, c) => {
	console.error(error);
	return c.json({ error: 'Internal server error' }, 500);
});

export const handler = handle(app);
