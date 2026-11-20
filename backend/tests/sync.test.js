import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildTestApp, connectedAgent, TEST_CONFIG } from "./helpers.js";
import { codeBlock, paragraph, fakeNotionClient } from "./fake-notion.js";

const PAGE_ID = "11111111-1111-1111-1111-111111111111";
const BLOCK_ID = "22222222-2222-2222-2222-222222222222";
const OTHER_ID = "33333333-3333-3333-3333-333333333333";

const PY = `def add(a, b):
    return a + b

print(add(1, 2))`;
const GO = `package main

import "fmt"

func main() {
    fmt.Println("hello")
}`;

/** A connected agent plus the fake Notion page it syncs against. */
async function setup(blocks, configOverrides = {}) {
  const notion = fakeNotionClient({ children: { [PAGE_ID]: blocks } });
  const app = buildTestApp({
    config: { ...TEST_CONFIG, ...configOverrides },
    createNotionClient: () => notion
  });
  const agent = await connectedAgent(app);
  const sync = () => agent.post(`/pages/${PAGE_ID}/sync`);
  return { notion, sync, agent };
}

/** What the user does in Notion between syncs. */
function edit(block, { code, language }) {
  if (code !== undefined) block.code.rich_text = [{ plain_text: code }];
  if (language !== undefined) block.code.language = language;
}

const resultFor = (res, blockId) => res.body.results.find(r => r.blockId === blockId);

describe("POST /pages/:pageId/sync", () => {
  it("requires a connected Notion workspace", async () => {
    const res = await request(buildTestApp()).post(`/pages/${PAGE_ID}/sync`);

    expect(res.status).toBe(401);
  });

  it("rejects a malformed page id", async () => {
    const { agent } = await setup([]);

    const res = await agent.post("/pages/not-a-page/sync");

    expect(res.status).toBe(400);
  });

  it("sets the language of a new code block it is confident about", async () => {
    const { sync, notion } = await setup([codeBlock(BLOCK_ID, PY)]);

    const res = await sync();

    expect(res.status).toBe(200);
    expect(res.body.pageId).toBe(PAGE_ID);
    expect(resultFor(res, BLOCK_ID)).toMatchObject({ status: "updated", language: "python" });
    expect(resultFor(res, BLOCK_ID).confidence).toBeGreaterThan(0.4);
    expect(notion.blocks.update).toHaveBeenCalledWith({
      block_id: BLOCK_ID,
      code: { language: "python" }
    });
  });

  it("only looks at code blocks", async () => {
    const { sync } = await setup([paragraph(OTHER_ID), codeBlock(BLOCK_ID, PY)]);

    const res = await sync();

    expect(res.body.results.map(r => r.blockId)).toEqual([BLOCK_ID]);
  });

  it("leaves a block alone when its code hasn't changed since the last sync", async () => {
    const block = codeBlock(BLOCK_ID, PY);
    const { sync, notion } = await setup([block]);
    await sync();
    edit(block, { language: "python" }); // Notion now shows AutoLang's change

    const res = await sync();

    expect(resultFor(res, BLOCK_ID).status).toBe("unchanged");
    expect(notion.blocks.update).toHaveBeenCalledTimes(1);
  });

  it("detects again when a block's code changes", async () => {
    const block = codeBlock(BLOCK_ID, PY);
    const { sync, notion } = await setup([block]);
    await sync();
    edit(block, { language: "python" });

    edit(block, { code: GO });
    const res = await sync();

    expect(resultFor(res, BLOCK_ID)).toMatchObject({ status: "updated", language: "go" });
    expect(notion.blocks.update).toHaveBeenLastCalledWith({
      block_id: BLOCK_ID,
      code: { language: "go" }
    });
  });

  it("doesn't change a block when it isn't confident enough", async () => {
    const { sync, notion } = await setup([codeBlock(BLOCK_ID, PY)], { confidenceThreshold: 0.99 });

    const res = await sync();

    expect(resultFor(res, BLOCK_ID)).toMatchObject({ status: "low_confidence", language: "python" });
    expect(notion.blocks.update).not.toHaveBeenCalled();
  });

  it("doesn't change a block when it can't tell the language", async () => {
    const { sync, notion } = await setup([codeBlock(BLOCK_ID, "hello there")]);

    const res = await sync();

    expect(resultFor(res, BLOCK_ID)).toMatchObject({ status: "low_confidence", language: null });
    expect(notion.blocks.update).not.toHaveBeenCalled();
  });

  it("doesn't call Notion when the language is already right", async () => {
    const { sync, notion } = await setup([codeBlock(BLOCK_ID, PY, "python")]);

    const res = await sync();

    expect(resultFor(res, BLOCK_ID)).toMatchObject({ status: "already_correct", language: "python" });
    expect(notion.blocks.update).not.toHaveBeenCalled();
  });

  it("stops changing a block once the user picks a language by hand", async () => {
    const block = codeBlock(BLOCK_ID, PY);
    const { sync, notion } = await setup([block]);
    await sync(); // AutoLang sets python

    edit(block, { language: "ruby", code: `${PY}\n# more` }); // user overrides, keeps editing
    const first = await sync();
    edit(block, { code: GO }); // even very different code later
    const later = await sync();

    expect(resultFor(first, BLOCK_ID).status).toBe("manual");
    expect(resultFor(later, BLOCK_ID).status).toBe("manual");
    expect(notion.blocks.update).toHaveBeenCalledTimes(1);
  });

  it("treats a language the user changed away from a correct one as manual", async () => {
    const block = codeBlock(BLOCK_ID, PY, "python");
    const { sync, notion } = await setup([block]);
    await sync(); // already correct

    edit(block, { language: "ruby", code: `${PY}\n# edited` });
    const res = await sync();

    expect(resultFor(res, BLOCK_ID).status).toBe("manual");
    expect(notion.blocks.update).not.toHaveBeenCalled();
  });

  it("notices a hand-picked language even before AutoLang has set one", async () => {
    const block = codeBlock(BLOCK_ID, "x");
    const { sync, notion } = await setup([block]);
    await sync(); // too short to detect

    edit(block, { language: "ruby" });
    edit(block, { code: PY }); // later looks like Python
    const res = await sync();

    expect(resultFor(res, BLOCK_ID).status).toBe("manual");
    expect(notion.blocks.update).not.toHaveBeenCalled();
  });

  it("tries again next time when Notion fails to update a block", async () => {
    const { sync, notion } = await setup([codeBlock(BLOCK_ID, PY)]);
    notion.blocks.update.mockRejectedValueOnce(new Error("rate limited"));

    const failed = await sync();
    const retried = await sync();

    expect(resultFor(failed, BLOCK_ID)).toMatchObject({ status: "failed", error: "rate limited" });
    expect(resultFor(retried, BLOCK_ID).status).toBe("updated");
  });

  it("returns Notion's error when the page can't be read", async () => {
    const { agent } = await setup([]);

    const res = await agent.post("/pages/99999999-9999-9999-9999-999999999999/sync");

    expect(res.status).toBe(404);
  });
});
