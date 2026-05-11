import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { authMiddleware } from '../middleware/auth.js';
import { registerActivityRoutes } from '../routes/activities.js';
import { registerAuthRoutes } from '../routes/auth.js';
import { registerHealthRoutes } from '../routes/health.js';
import { registerTaskRoutes } from '../routes/tasks.js';

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
	})
);

registerHealthRoutes(app);
registerAuthRoutes(app);

app.use('/activities', authMiddleware);
app.use('/activities/*', authMiddleware);
app.use('/tasks', authMiddleware);
app.use('/tasks/*', authMiddleware);

registerActivityRoutes(app);
registerTaskRoutes(app);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((error, c) => {
	console.error(error);
	return c.json({ error: 'Internal server error' }, 500);
});

export const handler = handle(app);
