import { detectLanguage } from "./language-detector.js";

const SNIPPET_LENGTH = 300;
const MAX_DEPTH = 10;
// Sub-pages and databases are separate pages; only look inside layout blocks.
const DONT_DESCEND_INTO = new Set(["child_page", "child_database"]);

/** Lists every block under `blockId`, following pagination. */
async function listChildren(notion, blockId) {
  const blocks = [];
  let cursor;
  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {})
    });
    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

/** Collects every code block on a page, including those nested in toggles, columns, etc. */
async function collectCodeBlocks(notion, blockId, depth = 0) {
  const found = [];
  for (const block of await listChildren(notion, blockId)) {
    if (block.type === "code") {
      found.push(block);
    } else if (
      block.has_children &&
      !DONT_DESCEND_INTO.has(block.type) &&
      depth < MAX_DEPTH
    ) {
      found.push(...(await collectCodeBlocks(notion, block.id, depth + 1)));
    }
  }
  return found;
}

function analyse(block) {
  const code = block.code.rich_text.map(item => item.plain_text).join("");
  const currentLanguage = block.code.language;
  const suggestedLanguage = detectLanguage(code);
  return {
    blockId: block.id,
    currentLanguage,
    suggestedLanguage,
    willChange: suggestedLanguage !== null && suggestedLanguage !== currentLanguage,
    snippet: code.slice(0, SNIPPET_LENGTH)
  };
}

/** Suggests a language for every code block on a page without changing anything. */
export async function previewPage(notion, pageId) {
  const blocks = await collectCodeBlocks(notion, pageId);
  return blocks.map(analyse);
}

/**
 * Applies the suggested language to the selected code blocks. Only blocks that
 * are code blocks on this page are touched; each block reports its own outcome.
 */
export async function applyLanguageChanges(notion, pageId, blockIds) {
  const suggestions = new Map(
    (await previewPage(notion, pageId)).map(s => [s.blockId, s])
  );

  const results = [];
  for (const blockId of blockIds) {
    const suggestion = suggestions.get(blockId);
    if (!suggestion) {
      results.push({ blockId, status: "not_found" });
      continue;
    }

    const language = suggestion.suggestedLanguage;
    if (!suggestion.willChange) {
      results.push({ blockId, status: "skipped", language });
      continue;
    }

    try {
      await notion.blocks.update({ block_id: blockId, code: { language } });
      results.push({ blockId, status: "updated", language });
    } catch (error) {
      results.push({ blockId, status: "failed", language, error: error.message });
    }
  }
  return results;
}
