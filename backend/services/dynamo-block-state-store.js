import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

/**
 * The block state store from block-state-store.js, kept in a DynamoDB table so
 * every Lambda instance sees the same state and it survives cold starts.
 *
 * Table: partition key `blockId` (String), on-demand capacity.
 * `documentClient` is a DynamoDBDocumentClient (or a fake in tests).
 */
export function createDynamoBlockStateStore({ documentClient, tableName }) {
  return {
    async get(blockId) {
      const { Item } = await documentClient.send(
        new GetCommand({ TableName: tableName, Key: { blockId } })
      );
      if (!Item) return null;
      return { hash: Item.hash, language: Item.language, manual: Item.manual };
    },
    async set(blockId, { hash, language, manual }) {
      await documentClient.send(
        new PutCommand({ TableName: tableName, Item: { blockId, hash, language, manual } })
      );
    }
  };
}
