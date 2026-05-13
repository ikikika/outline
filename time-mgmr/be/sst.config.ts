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
			link: [table, jwtAccessSecret, jwtRefreshSecret],
			timeout: '30 seconds',
			memory: '512 MB',
		};

		api.route('ANY /', apiDefaults);
		api.route('ANY /{proxy+}', apiDefaults);

		return {
			api: api.url,
			table: table.name,
		};
	},
});
