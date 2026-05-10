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
		});

		const api = new sst.aws.ApiGatewayV2('Api', {
			cors: {
				allowOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
				allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
				allowHeaders: ['Content-Type', 'Authorization'],
			},
		});

		const apiDefaults = {
			handler: 'src/handlers/api.handler',
			link: [table],
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
