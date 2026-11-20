import { vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

export const TEST_CONFIG = {
  notionClientId: "test-client-id",
  notionClientSecret: "test-client-secret",
  notionRedirectUri: "http://localhost:3000/auth/notion/callback",
  sessionSecret: "test-session-secret",
  secureCookies: false
};

export const TOKEN_RESPONSE = {
  access_token: "secret-access-token",
  refresh_token: "secret-refresh-token",
  token_type: "bearer",
  bot_id: "bot-123",
  workspace_id: "ws-123",
  workspace_name: "Durva's Workspace",
  workspace_icon: null,
  owner: { type: "user" }
};

/** A stand-in for global fetch that answers Notion's token endpoint. */
export function fakeTokenEndpoint({ status = 200, body = TOKEN_RESPONSE } = {}) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" }
    })
  );
}

export function buildTestApp(overrides = {}) {
  return createApp({
    config: TEST_CONFIG,
    fetch: fakeTokenEndpoint(),
    createNotionClient: () => {
      throw new Error("Notion client not expected in this test");
    },
    ...overrides
  });
}

/** Starts the OAuth flow on an agent and returns the state Notion would echo back. */
export async function startOAuth(agent) {
  const res = await agent.get("/auth/notion");
  return new URL(res.headers.location).searchParams.get("state");
}

/** Returns an agent whose session has completed the Notion OAuth flow. */
export async function connectedAgent(app) {
  const agent = request.agent(app);
  const state = await startOAuth(agent);
  await agent.get("/auth/notion/callback").query({ code: "auth-code", state });
  return agent;
}
