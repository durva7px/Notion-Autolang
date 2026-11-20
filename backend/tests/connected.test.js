import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { buildTestApp, connectedAgent } from "./helpers.js";

function fakeNotion({ searchResults = [], searchError } = {}) {
  return {
    search: vi.fn(async () => {
      if (searchError) throw searchError;
      return { results: searchResults, has_more: false, next_cursor: null };
    })
  };
}

function openWorkspaceHref(html) {
  const match = html.match(/<a[^>]*id="open-workspace"[^>]*href="([^"]+)"/);
  return match?.[1];
}

describe("GET /connected", () => {
  it("sends users who haven't connected back to the start page", async () => {
    const res = await request(buildTestApp()).get("/connected");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/");
  });

  it("shows the connected message and opens a page in the connected workspace", async () => {
    const notion = fakeNotion({
      searchResults: [
        { object: "page", id: "p1", url: "https://www.notion.so/Shared-Page-abc123" }
      ]
    });
    const createNotionClient = vi.fn(() => notion);
    const agent = await connectedAgent(buildTestApp({ createNotionClient }));

    const res = await agent.get("/connected");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Notion workspace connected");
    expect(res.text).toContain("Durva&#39;s Workspace");
    expect(openWorkspaceHref(res.text)).toBe("https://www.notion.so/Shared-Page-abc123");
    expect(createNotionClient).toHaveBeenCalledWith("secret-access-token");
  });

  it("falls back to Notion's home when no pages are shared", async () => {
    const createNotionClient = () => fakeNotion({ searchResults: [] });
    const agent = await connectedAgent(buildTestApp({ createNotionClient }));

    const res = await agent.get("/connected");

    expect(openWorkspaceHref(res.text)).toBe("https://www.notion.so/");
  });

  it("still shows the page when Notion search fails", async () => {
    const createNotionClient = () =>
      fakeNotion({ searchError: Object.assign(new Error("rate limited"), { status: 429 }) });
    const agent = await connectedAgent(buildTestApp({ createNotionClient }));

    const res = await agent.get("/connected");

    expect(res.status).toBe(200);
    expect(res.text).toContain("Notion workspace connected");
    expect(openWorkspaceHref(res.text)).toBe("https://www.notion.so/");
  });

  it("never links outside notion.so even if Notion returns an odd URL", async () => {
    const createNotionClient = () =>
      fakeNotion({ searchResults: [{ object: "page", id: "p1", url: "javascript:alert(1)" }] });
    const agent = await connectedAgent(buildTestApp({ createNotionClient }));

    const res = await agent.get("/connected");

    expect(openWorkspaceHref(res.text)).toBe("https://www.notion.so/");
  });

  it("escapes the workspace name", async () => {
    const { fakeTokenEndpoint, TOKEN_RESPONSE } = await import("./helpers.js");
    const fetch = fakeTokenEndpoint({
      body: { ...TOKEN_RESPONSE, workspace_name: "<script>alert(1)</script>" }
    });
    const agent = await connectedAgent(
      buildTestApp({ fetch, createNotionClient: () => fakeNotion() })
    );

    const res = await agent.get("/connected");

    expect(res.text).not.toContain("<script>alert(1)</script>");
    expect(res.text).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

describe("GET /", () => {
  it("offers a Connect Notion button that starts the OAuth flow", async () => {
    const res = await request(buildTestApp()).get("/");

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/<a[^>]*href="\/auth\/notion"/);
  });

  it("sends already-connected users to the connected page", async () => {
    const agent = await connectedAgent(buildTestApp());

    const res = await agent.get("/");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/connected");
  });
});
