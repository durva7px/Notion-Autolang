import session from "express-session";
import { DeleteCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * An express-session store backed by DynamoDB, so a login (and the Notion
 * token in it) works on every Lambda instance and survives cold starts.
 *
 * Table: partition key `id` (String), on-demand capacity, with TTL turned on
 * for the `expires` attribute (epoch seconds). DynamoDB's TTL deletes expired
 * items lazily (up to a couple of days late), so `get` also checks the time.
 *
 * `documentClient` is a DynamoDBDocumentClient (or a fake in tests); `now`
 * returns the time in milliseconds and exists so tests can move the clock.
 */
export function createDynamoSessionStore({ documentClient, tableName, now = Date.now }) {
  return new DynamoSessionStore({ documentClient, tableName, now });
}

class DynamoSessionStore extends session.Store {
  constructor({ documentClient, tableName, now }) {
    super();
    this.documentClient = documentClient;
    this.tableName = tableName;
    this.now = now;
  }

  get(id, callback) {
    this.#run(callback, async () => {
      const { Item } = await this.documentClient.send(
        new GetCommand({ TableName: this.tableName, Key: { id } })
      );
      if (!Item || Item.expires * 1000 <= this.now()) return null;
      return JSON.parse(Item.session);
    });
  }

  set(id, sess, callback) {
    this.#run(callback, async () => {
      await this.documentClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: { id, session: JSON.stringify(sess), expires: this.#expiresAt(sess) }
        })
      );
    });
  }

  // Called on requests that don't change the session; saving it again moves its expiry on.
  touch(id, sess, callback) {
    this.set(id, sess, callback);
  }

  destroy(id, callback) {
    this.#run(callback, async () => {
      await this.documentClient.send(
        new DeleteCommand({ TableName: this.tableName, Key: { id } })
      );
    });
  }

  #expiresAt(sess) {
    const expires = sess.cookie?.expires
      ? new Date(sess.cookie.expires).getTime()
      : this.now() + DEFAULT_TTL_MS;
    return Math.floor(expires / 1000);
  }

  #run(callback = () => {}, work) {
    work().then(result => callback(null, result), error => callback(error));
  }
}
