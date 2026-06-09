/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
	app(input) {
		return {
			name: 'time-mgmr',
			removal: input?.stage === 'production' ? 'retain' : 'remove',
			protect: ['production'].includes(input?.stage),
			home: 'aws',
		};
	},
	async run() {
		const jwtAccessSecret = new sst.Secret(
			'JwtAccessSecret',
			'dev-access-secret-change-me-in-production'
		);
		const jwtRefreshSecret = new sst.Secret(
			'JwtRefreshSecret',
			'dev-refresh-secret-change-me-in-production'
		);
		// Placeholders only — never commit real VAPID keys. Set per stage:
		//   npx web-push generate-vapid-keys
		//   npx sst secret set VapidPublicKey '<public>'
		//   npx sst secret set VapidPrivateKey '<private>'
		const vapidPublicKey = new sst.Secret(
			'VapidPublicKey',
			'dev-vapid-public-key-change-me'
		);
		const vapidPrivateKey = new sst.Secret(
			'VapidPrivateKey',
			'dev-vapid-private-key-change-me'
		);

		const table = new sst.aws.Dynamo('TimeMgmrTable', {
			fields: {
				pk: 'string',
				sk: 'string',
				gsi1pk: 'string',
				gsi1sk: 'string',
			},
			primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
			globalIndexes: {
				Gsi1: { hashKey: 'gsi1pk', rangeKey: 'gsi1sk' },
			},
			ttl: 'expireAt',
		});

		const api = new sst.aws.ApiGatewayV2('Api', {
			cors: {
				allowOrigins: [
					'http://localhost:3000',
					'http://127.0.0.1:3000',
					'http://localhost:5173',
					'http://127.0.0.1:5173',
					'https://tempo.codeoctagon.com',
				],
				allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
				allowHeaders: ['Content-Type', 'Authorization'],
				allowCredentials: true,
			},
		});

		const apiDefaults = {
			handler: 'src/handlers/api.handler',
			link: [
				table,
				jwtAccessSecret,
				jwtRefreshSecret,
				vapidPublicKey,
				vapidPrivateKey,
			],
			timeout: '30 seconds' as const,
			memory: '512 MB' as const,
		};

		api.route('ANY /', apiDefaults);
		api.route('ANY /{proxy+}', apiDefaults);

		new sst.aws.CronV2('FirstFocusReminder', {
			schedule: 'rate(1 minute)',
			function: {
				handler: 'src/handlers/firstFocusReminder.handler',
				link: [table, vapidPublicKey, vapidPrivateKey],
				timeout: '60 seconds',
				memory: '512 MB',
			},
		});

		return {
			api: api.url,
			table: table.name,
		};
	},
});
