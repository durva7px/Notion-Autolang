import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  buildTestApp,
  connectedAgent,
  fakeTokenEndpoint,
  startOAuth,
  TEST_CONFIG
} from "./helpers.js";

describe("GET /auth/notion", () => {
  it("redirects to Notion's public OAuth page with the integration's details", async () => {
    const res = await request(buildTestApp()).get("/auth/notion");

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.origin + location.pathname).toBe(
      "https://api.notion.com/v1/oauth/authorize"
    );
    expect(location.searchParams.get("client_id")).toBe(TEST_CONFIG.notionClientId);
    expect(location.searchParams.get("redirect_uri")).toBe(TEST_CONFIG.notionRedirectUri);
    expect(location.searchParams.get("response_type")).toBe("code");
    expect(location.searchParams.get("owner")).toBe("user");
    expect(location.searchParams.get("state")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("sets a session cookie so the state can be checked on return", async () => {
    const res = await request(buildTestApp()).get("/auth/notion");

    expect(res.headers["set-cookie"].join(";")).toMatch(/autolang\.sid=/);
  });
});

describe("GET /auth/notion/callback", () => {
  it("exchanges the code for a token and sends the user to the connected page", async () => {
    const fetch = fakeTokenEndpoint();
    const agent = request.agent(buildTestApp({ fetch }));
    const state = await startOAuth(agent);

    const res = await agent
      .get("/auth/notion/callback")
      .query({ code: "auth-code", state });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/connected");

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.notion.com/v1/oauth/token");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(
      "Basic " + Buffer.from("test-client-id:test-client-secret").toString("base64")
    );
    expect(JSON.parse(init.body)).toEqual({
      grant_type: "authorization_code",
      code: "auth-code",
      redirect_uri: TEST_CONFIG.notionRedirectUri
    });
  });

  it("rejects a callback whose state doesn't match the session", async () => {
    const fetch = fakeTokenEndpoint();
    const agent = request.agent(buildTestApp({ fetch }));
    await startOAuth(agent);

    const res = await agent
      .get("/auth/notion/callback")
      .query({ code: "auth-code", state: "forged-state" });

    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a callback that arrives without starting the flow", async () => {
    const fetch = fakeTokenEndpoint();
    const res = await request(buildTestApp({ fetch }))
      .get("/auth/notion/callback")
      .query({ code: "auth-code", state: "anything" });

    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("explains when the user cancels on Notion's page", async () => {
    const agent = request.agent(buildTestApp());
    const state = await startOAuth(agent);

    const res = await agent
      .get("/auth/notion/callback")
      .query({ error: "access_denied", state });

    expect(res.status).toBe(400);
    expect(res.text).toMatch(/cancelled or denied/);
  });

  it("reports a bad gateway when Notion refuses the code", async () => {
    const fetch = fakeTokenEndpoint({ status: 400, body: { error: "invalid_grant" } });
    const agent = request.agent(buildTestApp({ fetch }));
    const state = await startOAuth(agent);

    const res = await agent
      .get("/auth/notion/callback")
      .query({ code: "expired-code", state });

    expect(res.status).toBe(502);
  });

  it("can't replay the same state twice", async () => {
    const fetch = fakeTokenEndpoint();
    const agent = request.agent(buildTestApp({ fetch }));
    const state = await startOAuth(agent);
    await agent.get("/auth/notion/callback").query({ code: "auth-code", state });

    const replay = await agent
      .get("/auth/notion/callback")
      .query({ code: "auth-code", state });

    expect(replay.status).toBe(400);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("GET /auth/status", () => {
  it("says not connected before the user authorizes", async () => {
    const res = await request(buildTestApp()).get("/auth/status");

    expect(res.body).toEqual({ connected: false });
  });

  it("shows the connected workspace without exposing tokens", async () => {
    const agent = await connectedAgent(buildTestApp());

    const res = await agent.get("/auth/status");

    expect(res.body).toEqual({
      connected: true,
      workspaceId: "ws-123",
      workspaceName: "Durva's Workspace"
    });
    expect(res.text).not.toMatch(/secret-access-token|secret-refresh-token/);
  });
});

describe("POST /auth/disconnect", () => {
  it("forgets the Notion connection", async () => {
    const agent = await connectedAgent(buildTestApp());

    const res = await agent.post("/auth/disconnect");
    const status = await agent.get("/auth/status");

    expect(res.body).toEqual({ disconnected: true });
    expect(status.body).toEqual({ connected: false });
  });
});
