import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Resource } from 'sst';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
	marshallOptions: { removeUndefinedValues: true },
});

export const TABLE_NAME = Resource.TimeMgmrTable.name;

export function getDocumentClient(): DynamoDBDocumentClient {
	return client;
}
