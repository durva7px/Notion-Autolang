import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildTestApp, connectedAgent } from "./helpers.js";
import { codeBlock, fakeNotionClient } from "./fake-notion.js";

const PAGE_ID = "11111111-1111-1111-1111-111111111111";
const BLOCK_ID = "22222222-2222-2222-2222-222222222222";
const PY = `def add(a, b):
    return a + b

print(add(1, 2))`;

async function setup(notion) {
  return connectedAgent(buildTestApp({ createNotionClient: () => notion }));
}

describe("/pages before connecting", () => {
  it("requires a connected Notion workspace", async () => {
    const res = await request(buildTestApp()).get("/pages");

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Connect your Notion workspace/);
  });
});

describe("GET /pages", () => {
  it("lists the pages shared with the integration with their titles", async () => {
    const notion = fakeNotionClient({
      pages: [
        {
          object: "page",
          id: PAGE_ID,
          url: "https://www.notion.so/Snippets",
          properties: {
            Name: { type: "title", title: [{ plain_text: "My " }, { plain_text: "Snippets" }] }
          }
        },
        { object: "page", id: "untitled", url: "https://www.notion.so/x", properties: {} }
      ]
    });
    const agent = await setup(notion);

    const res = await agent.get("/pages");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: PAGE_ID, url: "https://www.notion.so/Snippets", title: "My Snippets" },
      { id: "untitled", url: "https://www.notion.so/x", title: "Untitled" }
    ]);
  });
});

describe("POST /pages/:pageId/preview", () => {
  it("returns a language suggestion per code block", async () => {
    const notion = fakeNotionClient({ children: { [PAGE_ID]: [codeBlock(BLOCK_ID, PY)] } });
    const agent = await setup(notion);

    const res = await agent.post(`/pages/${PAGE_ID}/preview`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      pageId: PAGE_ID,
      totalBlocks: 1,
      suggestions: [{ blockId: BLOCK_ID, suggestedLanguage: "python", willChange: true }]
    });
  });

  it("returns 404 for a page the integration can't see", async () => {
    const agent = await setup(fakeNotionClient());

    const res = await agent.post(`/pages/${PAGE_ID}/preview`);

    expect(res.status).toBe(404);
  });
});

describe("POST /pages/:pageId/apply", () => {
  it("updates the selected code blocks", async () => {
    const notion = fakeNotionClient({ children: { [PAGE_ID]: [codeBlock(BLOCK_ID, PY)] } });
    const agent = await setup(notion);

    const res = await agent.post(`/pages/${PAGE_ID}/apply`).send({ blockIds: [BLOCK_ID] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      results: [{ blockId: BLOCK_ID, status: "updated", language: "python" }]
    });
  });

  it.each([
    ["missing", {}],
    ["not an array", { blockIds: BLOCK_ID }],
    ["malformed id", { blockIds: ["not-a-block-id"] }],
    ["too many", { blockIds: Array(101).fill(BLOCK_ID) }]
  ])("rejects a block selection that is %s", async (_label, body) => {
    const notion = fakeNotionClient({ children: { [PAGE_ID]: [] } });
    const agent = await setup(notion);

    const res = await agent.post(`/pages/${PAGE_ID}/apply`).send(body);

    expect(res.status).toBe(400);
    expect(notion.blocks.update).not.toHaveBeenCalled();
  });
});
