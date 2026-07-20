import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createUser } from '../src/repositories/userRepository.js';

function resolveTableName(): string {
	if (process.env.TABLE_NAME) {
		return process.env.TABLE_NAME;
	}

	try {
		const outputsPath = resolve(process.cwd(), '.sst/outputs.json');
		const outputs = JSON.parse(readFileSync(outputsPath, 'utf8')) as {
			table?: string;
		};
		if (outputs.table) {
			return outputs.table;
		}
	} catch {
		// Fall through
	}

	throw new Error(
		'TABLE_NAME is required. Set TABLE_NAME env var or run after `sst dev`/`sst deploy`.'
	);
}

async function main(): Promise<void> {
	const email = process.argv[2];
	const password = process.argv[3];
	const name = process.argv[4];

	if (!email || !password) {
		console.error('Usage: npm run seed:user -- <email> <password> [name]');
		process.exit(1);
	}

	if (password.length < 8) {
		console.error('Password must be at least 8 characters');
		process.exit(1);
	}

	process.env.TABLE_NAME = resolveTableName();

	const user = await createUser({
		email,
		password,
		name,
	});

	console.log(`Created user: ${user.email} (${user.id})`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
