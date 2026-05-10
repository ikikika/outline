import type { Hono } from 'hono';
import { Resource } from 'sst';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

import { getDocumentClient, TABLE_NAME } from '../lib/dynamo.js';

export function registerHealthRoutes(app: Hono): void {
	app.get('/health', (c) =>
		c.json({
			ok: true,
			service: 'time-mgmr-api',
			table: Resource.TimeMgmrTable.name,
		})
	);

	app.get('/health/dynamo', async (c) => {
		const client = getDocumentClient();

		await client.send(
			new ScanCommand({
				TableName: TABLE_NAME,
				Limit: 1,
			})
		);

		return c.json({ ok: true, table: TABLE_NAME });
	});
}
