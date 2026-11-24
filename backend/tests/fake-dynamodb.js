/**
 * An in-memory stand-in for the DynamoDB Document Client (`@aws-sdk/lib-dynamodb`).
 * It answers the real GetCommand, PutCommand and DeleteCommand objects, so the
 * stores under test build the same requests they send to AWS.
 */
export function createFakeDocumentClient() {
  const tables = new Map();
  const table = name => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name);
  };
  // Tables have a single string partition key; its value identifies the item.
  const keyOf = key => JSON.stringify(Object.values(key));
  const copy = value => structuredClone(value);

  return {
    async send(command) {
      const input = command.input;
      switch (command.constructor.name) {
        case "GetCommand": {
          const item = table(input.TableName).get(keyOf(input.Key));
          return { Item: item ? copy(item) : undefined };
        }
        case "PutCommand": {
          const { item, key } = splitKey(input.Item);
          table(input.TableName).set(keyOf(key), copy({ ...key, ...item }));
          return {};
        }
        case "DeleteCommand":
          table(input.TableName).delete(keyOf(input.Key));
          return {};
        default:
          throw new Error(`Fake DynamoDB does not support ${command.constructor.name}`);
      }
    },
    /** Everything stored in a table, for checks on what AWS would hold. */
    items(tableName) {
      return [...table(tableName).values()].map(copy);
    }
  };

  // The stores name their key first in each item.
  function splitKey(fullItem) {
    const [keyName] = Object.keys(fullItem);
    const { [keyName]: keyValue, ...item } = fullItem;
    return { key: { [keyName]: keyValue }, item };
  }
}
