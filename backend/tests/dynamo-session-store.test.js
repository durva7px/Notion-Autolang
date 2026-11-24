import { describe, it, expect } from "vitest";
import request from "supertest";
import { createDynamoSessionStore } from "../services/dynamo-session-store.js";
import { createFakeDocumentClient } from "./fake-dynamodb.js";
import { buildTestApp, startOAuth } from "./helpers.js";

const TABLE = "autolang-sessions";
const DAY_MS = 24 * 60 * 60 * 1000;

/** An app wired to a DynamoDB session table, as one Lambda instance would be. */
function buildInstance(documentClient, { now } = {}) {
  return buildTestApp({
    sessionStore: createDynamoSessionStore({ documentClient, tableName: TABLE, now })
  });
}

/** Signs in on one instance; returns the agent and its session cookie to replay elsewhere. */
async function connect(app) {
  const agent = request.agent(app);
  const state = await startOAuth(agent);
  const res = await agent.get("/auth/notion/callback").query({ code: "auth-code", state });
  const cookie = res.headers["set-cookie"].find(c => c.startsWith("autolang.sid=")).split(";")[0];
  return { agent, cookie };
}

describe("DynamoDB session store (through the HTTP API)", () => {
  it("keeps the Notion connection when the next request reaches another Lambda instance", async () => {
    const documentClient = createFakeDocumentClient();
    const first = buildInstance(documentClient);
    const second = buildInstance(documentClient);

    const { agent, cookie } = await connect(first);

    const res = await request(second).get("/auth/status").set("Cookie", cookie);

    expect(res.body).toEqual({
      connected: true,
      workspaceId: "ws-123",
      workspaceName: "Durva's Workspace"
    });
  });

  it("forgets the connection everywhere after disconnecting", async () => {
    const documentClient = createFakeDocumentClient();
    const first = buildInstance(documentClient);
    const second = buildInstance(documentClient);
    const { agent, cookie } = await connect(first);

    await agent.post("/auth/disconnect").expect(200);

    const res = await request(second).get("/auth/status").set("Cookie", cookie);
    expect(res.body).toEqual({ connected: false });
    expect(documentClient.items(TABLE)).toEqual([]);
  });

  it("treats an expired session as logged out, even before DynamoDB's TTL deletes it", async () => {
    const documentClient = createFakeDocumentClient();
    let clock = Date.now();
    const app = buildInstance(documentClient, { now: () => clock });
    const { cookie } = await connect(app);

    clock += 8 * DAY_MS; // sessions last 7 days

    const res = await request(app).get("/auth/status").set("Cookie", cookie);
    expect(res.body).toEqual({ connected: false });
  });

  it("stores an `expires` time in epoch seconds for DynamoDB's TTL to clean up", async () => {
    const documentClient = createFakeDocumentClient();
    const before = Math.floor(Date.now() / 1000);
    await connect(buildInstance(documentClient));

    const [item] = documentClient.items(TABLE);
    expect(item.expires).toBeGreaterThanOrEqual(before + 7 * 24 * 60 * 60 - 5);
    expect(item.expires).toBeLessThanOrEqual(before + 7 * 24 * 60 * 60 + 5);
  });

  it("does not store anything for visitors who never sign in", async () => {
    const documentClient = createFakeDocumentClient();

    await request(buildInstance(documentClient)).get("/health").expect(200);

    expect(documentClient.items(TABLE)).toEqual([]);
  });
});
