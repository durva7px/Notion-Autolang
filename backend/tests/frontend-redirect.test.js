import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { buildTestApp, fakeTokenEndpoint, startOAuth, TEST_CONFIG } from "./helpers.js";

const FRONTEND_URL = "https://notion-autolang.vercel.app";
const LOCAL_SITE = "http://localhost:5173";

function frontendApp(overrides = {}) {
  return buildTestApp({
    config: { ...TEST_CONFIG, frontendUrls: [FRONTEND_URL, LOCAL_SITE] },
    createNotionClient: () => ({
      search: vi.fn(async () => ({
        results: [{ object: "page", id: "p1", url: "https://www.notion.so/Shared-abc" }],
        has_more: false,
        next_cursor: null
      }))
    }),
    ...overrides
  });
}

function redirectTarget(res) {
  return new URL(res.headers.location);
}

describe("OAuth callback when the website (FRONTEND_URLS) is configured", () => {
  it("sends the user back to the website with the connected workspace", async () => {
    const agent = request.agent(frontendApp());
    const state = await startOAuth(agent);

    const res = await agent.get("/auth/notion/callback").query({ code: "auth-code", state });

    expect(res.status).toBe(302);
    const target = redirectTarget(res);
    expect(target.origin).toBe(FRONTEND_URL);
    expect(target.pathname).toBe("/");
    expect(target.searchParams.get("notion")).toBe("connected");
    expect(target.searchParams.get("workspace")).toBe("Durva's Workspace");
    expect(target.searchParams.get("open")).toBe("https://www.notion.so/Shared-abc");
  });

  it("never puts tokens in the redirect URL", async () => {
    const agent = request.agent(frontendApp());
    const state = await startOAuth(agent);

    const res = await agent.get("/auth/notion/callback").query({ code: "auth-code", state });

    expect(res.headers.location).not.toMatch(/secret-access-token|secret-refresh-token/);
  });

  it("still keeps the connection in the session for the API", async () => {
    const agent = request.agent(frontendApp());
    const state = await startOAuth(agent);
    await agent.get("/auth/notion/callback").query({ code: "auth-code", state });

    const status = await agent.get("/auth/status");

    expect(status.body.connected).toBe(true);
  });

  it("sends the user back with an error when they cancel on Notion", async () => {
    const agent = request.agent(frontendApp());
    const state = await startOAuth(agent);

    const res = await agent
      .get("/auth/notion/callback")
      .query({ error: "access_denied", state });

    const target = redirectTarget(res);
    expect(target.origin).toBe(FRONTEND_URL);
    expect(target.searchParams.get("notion")).toBe("error");
    expect(target.searchParams.get("reason")).toBe("access_denied");
  });

  it("sends the user back with an error when the state is invalid", async () => {
    const fetch = fakeTokenEndpoint();
    const agent = request.agent(frontendApp({ fetch }));
    await startOAuth(agent);

    const res = await agent
      .get("/auth/notion/callback")
      .query({ code: "auth-code", state: "forged" });

    expect(redirectTarget(res).searchParams.get("reason")).toBe("invalid_state");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the user back with an error when Notion refuses the code", async () => {
    const fetch = fakeTokenEndpoint({ status: 400, body: { error: "invalid_grant" } });
    const agent = request.agent(frontendApp({ fetch }));
    const state = await startOAuth(agent);

    const res = await agent
      .get("/auth/notion/callback")
      .query({ code: "expired", state });

    expect(redirectTarget(res).searchParams.get("reason")).toBe("token_exchange_failed");
  });

  it("falls back to Notion's home as the open link when no pages are shared", async () => {
    const agent = request.agent(
      frontendApp({
        createNotionClient: () => ({
          search: async () => ({ results: [], has_more: false, next_cursor: null })
        })
      })
    );
    const state = await startOAuth(agent);

    const res = await agent.get("/auth/notion/callback").query({ code: "auth-code", state });

    expect(redirectTarget(res).searchParams.get("open")).toBe("https://www.notion.so/");
  });
});

describe("Choosing which website to return to", () => {
  async function connectFrom(returnTo) {
    const agent = request.agent(frontendApp());
    const start = await agent.get("/auth/notion").query(returnTo ? { return_to: returnTo } : {});
    const state = new URL(start.headers.location).searchParams.get("state");
    const res = await agent.get("/auth/notion/callback").query({ code: "auth-code", state });
    return redirectTarget(res);
  }

  it("returns to the site that started the flow when it is allowed", async () => {
    const target = await connectFrom(LOCAL_SITE);

    expect(target.origin).toBe(LOCAL_SITE);
    expect(target.searchParams.get("notion")).toBe("connected");
  });

  it("ignores a return_to that isn't on the allowlist", async () => {
    const target = await connectFrom("https://evil.example.com");

    expect(target.origin).toBe(FRONTEND_URL);
  });

  it("uses the first allowed site when no return_to is given", async () => {
    const target = await connectFrom(undefined);

    expect(target.origin).toBe(FRONTEND_URL);
  });
});

describe("Which page links count as Notion", () => {
  async function openLinkFor(pageUrl) {
    const agent = request.agent(
      frontendApp({
        createNotionClient: () => ({
          search: async () => ({
            results: [{ object: "page", id: "p1", url: pageUrl }],
            has_more: false,
            next_cursor: null
          })
        })
      })
    );
    const state = await startOAuth(agent);
    const res = await agent.get("/auth/notion/callback").query({ code: "auth-code", state });
    return redirectTarget(res).searchParams.get("open");
  }

  it("accepts Notion's current app.notion.com page links", async () => {
    expect(await openLinkFor("https://app.notion.com/p/Snippets-abc123")).toBe(
      "https://app.notion.com/p/Snippets-abc123"
    );
  });

  it("rejects look-alike hosts", async () => {
    expect(await openLinkFor("https://notion.com.evil.example/p/x")).toBe("https://www.notion.so/");
  });
});
