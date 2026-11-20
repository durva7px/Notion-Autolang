import { describe, it, expect } from "vitest";
import { previewPage, applyLanguageChanges } from "../services/processor.js";
import { codeBlock, fakeNotionClient, paragraph, toggle } from "./fake-notion.js";

const PY = `def add(a, b):
    return a + b

print(add(1, 2))`;

const JS = `const sum = (a, b) => a + b;
console.log(sum(1, 2));
export default sum;`;

describe("previewPage", () => {
  it("suggests a language for each code block and ignores other blocks", async () => {
    const notion = fakeNotionClient({
      children: { page: [paragraph("para"), codeBlock("py", PY), codeBlock("js", JS)] }
    });

    const suggestions = await previewPage(notion, "page");

    expect(suggestions).toEqual([
      expect.objectContaining({
        blockId: "py",
        currentLanguage: "plain text",
        suggestedLanguage: "python",
        willChange: true
      }),
      expect.objectContaining({
        blockId: "js",
        currentLanguage: "plain text",
        suggestedLanguage: "javascript",
        willChange: true
      })
    ]);
  });

  it("marks blocks that already have the right language as unchanged", async () => {
    const notion = fakeNotionClient({ children: { page: [codeBlock("py", PY, "python")] } });

    const [suggestion] = await previewPage(notion, "page");

    expect(suggestion.willChange).toBe(false);
  });

  it("marks blocks it can't recognise as unchanged", async () => {
    const notion = fakeNotionClient({ children: { page: [codeBlock("x", "hello there")] } });

    const [suggestion] = await previewPage(notion, "page");

    expect(suggestion).toMatchObject({ suggestedLanguage: null, willChange: false });
  });

  it("reads every page of results, not just the first 100", async () => {
    const blocks = Array.from({ length: 5 }, (_, i) => codeBlock(`b${i}`, PY));
    const notion = fakeNotionClient({ children: { page: blocks }, pageSize: 2 });

    const suggestions = await previewPage(notion, "page");

    expect(suggestions.map(s => s.blockId)).toEqual(["b0", "b1", "b2", "b3", "b4"]);
  });

  it("finds code blocks nested inside toggles", async () => {
    const notion = fakeNotionClient({
      children: { page: [toggle("t")], t: [codeBlock("nested", PY)] }
    });

    const suggestions = await previewPage(notion, "page");

    expect(suggestions.map(s => s.blockId)).toEqual(["nested"]);
  });

  it("includes a short snippet of the code for the user to review", async () => {
    const notion = fakeNotionClient({ children: { page: [codeBlock("py", PY)] } });

    const [suggestion] = await previewPage(notion, "page");

    expect(suggestion.snippet).toBe(PY);
  });
});

describe("applyLanguageChanges", () => {
  it("sets the suggested language on the selected blocks only", async () => {
    const notion = fakeNotionClient({
      children: { page: [codeBlock("py", PY), codeBlock("js", JS)] }
    });

    const results = await applyLanguageChanges(notion, "page", ["py"]);

    expect(results).toEqual([{ blockId: "py", status: "updated", language: "python" }]);
    expect(notion.blocks.update).toHaveBeenCalledTimes(1);
    expect(notion.blocks.update).toHaveBeenCalledWith({
      block_id: "py",
      code: { language: "python" }
    });
  });

  it("refuses to touch blocks that aren't code blocks on this page", async () => {
    const notion = fakeNotionClient({ children: { page: [codeBlock("py", PY)] } });

    const results = await applyLanguageChanges(notion, "page", ["someone-elses-block"]);

    expect(results).toEqual([{ blockId: "someone-elses-block", status: "not_found" }]);
    expect(notion.blocks.update).not.toHaveBeenCalled();
  });

  it("skips blocks that need no change", async () => {
    const notion = fakeNotionClient({
      children: { page: [codeBlock("py", PY, "python"), codeBlock("x", "hello there")] }
    });

    const results = await applyLanguageChanges(notion, "page", ["py", "x"]);

    expect(results).toEqual([
      { blockId: "py", status: "skipped", language: "python" },
      { blockId: "x", status: "skipped", language: null }
    ]);
    expect(notion.blocks.update).not.toHaveBeenCalled();
  });

  it("reports a failed update without stopping the rest", async () => {
    const notion = fakeNotionClient({
      children: { page: [codeBlock("py", PY), codeBlock("js", JS)] }
    });
    notion.blocks.update.mockRejectedValueOnce(new Error("conflict"));

    const results = await applyLanguageChanges(notion, "page", ["py", "js"]);

    expect(results).toEqual([
      { blockId: "py", status: "failed", language: "python", error: "conflict" },
      { blockId: "js", status: "updated", language: "javascript" }
    ]);
  });
});
