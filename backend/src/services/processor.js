
import { detectLanguage } from "./detector.js";

// Minimum confidence required for automatic suggestions.
// Set to null if your detector does not return confidence.
const MIN_CONFIDENCE = 0.8;

// Map detector output to Notion-supported language identifiers.
// Extend this based on the languages your detector supports.
const LANGUAGE_MAP = {
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  python: "python",
  py: "python",
  java: "java",
  cpp: "c++",
  "c++": "c++",
  c: "c",
  sql: "sql",
  json: "json",
  bash: "bash",
  shell: "shell",
  html: "html",
  xml: "xml",
  css: "css"
};

// Extract code text from a Notion code block.
function extractCode(block) {
  return block.code.rich_text
    .map(item => item.plain_text ?? item.text?.content ?? "")
    .join("");
}

// Normalize the language returned by detectLanguage().
function normalizeLanguage(language) {
  if (typeof language !== "string") {
    return null;
  }

  return LANGUAGE_MAP[language.trim().toLowerCase()] ?? null;
}

// Check whether a prediction meets the configured threshold.
function isConfident(result) {
  if (MIN_CONFIDENCE === null) {
    return true;
  }

  return (
    typeof result?.confidence === "number" &&
    Number.isFinite(result.confidence) &&
    result.confidence >= MIN_CONFIDENCE
  );
}

/**
 * Retrieve all immediate child blocks of a page or block.
 *
 * Notion paginates results, so we continue until
 * has_more is false.
 */
async function fetchAllChildren(notion, blockId) {
  const blocks = [];
  let cursor;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {})
    });

    blocks.push(...response.results);

    cursor = response.next_cursor;
  } while (cursor);

  return blocks;
}

/**
 * Recursively find code blocks.
 *
 * This also supports code blocks inside toggles,
 * columns and other nested containers.
 */
async function collectCodeBlocks(
  notion,
  parentId,
  visited = new Set()
) {
  if (visited.has(parentId)) {
    return [];
  }

  visited.add(parentId);

  const blocks = await fetchAllChildren(notion, parentId);
  const codeBlocks = [];

  for (const block of blocks) {
    if (block.type === "code") {
      codeBlocks.push(block);
    }

    if (block.has_children) {
      const nestedBlocks = await collectCodeBlocks(
        notion,
        block.id,
        visited
      );

      codeBlocks.push(...nestedBlocks);
    }
  }

  return codeBlocks;
}

/**
 * STEP 1: PREVIEW
 *
 * Detect languages without modifying any Notion blocks.
 *
 * @param {Client} notion - Authenticated Notion client
 * @param {string} pageId - Page to process
 */
export async function previewPage(notion, pageId) {
  const codeBlocks = await collectCodeBlocks(notion, pageId);

  const suggestions = [];

  for (const block of codeBlocks) {
    const code = extractCode(block);

    // Avoid detecting empty snippets.
    if (!code.trim()) {
      suggestions.push({
        blockId: block.id,
        codePreview: "",
        currentLanguage: block.code.language,
        detectedLanguage: null,
        confidence: null,
        shouldUpdate: false,
        reason: "Empty code block"
      });

      continue;
    }

    // Your existing detection function.
    const detectedResults = await detectLanguage(code);

    const detectedLanguage = normalizeLanguage(
      detectedResults?.language
    );

    const confidence = detectedResults?.confidence ?? null;

    const shouldUpdate =
      detectedLanguage !== null &&
      isConfident(detectedResults) &&
      detectedLanguage !== block.code.language;

    suggestions.push({
      blockId: block.id,
      codePreview: code.slice(0, 180),
      currentLanguage: block.code.language,
      detectedLanguage,
      confidence,
      shouldUpdate,
      reason: !detectedLanguage
        ? "Unsupported or undetected language"
        : !isConfident(detectedResults)
          ? "Low confidence"
          : detectedLanguage === block.code.language
            ? "Language already correct"
            : "Update suggested"
    });
  }

  return suggestions;
}

/**
 * STEP 2: APPLY
 *
 * Update only approved code blocks.
 *
 * Predictions are recalculated on the server rather
 * than trusting language values sent by the frontend.
 *
 * @param {Client} notion - Authenticated Notion client
 * @param {string} pageId - Page being processed
 * @param {string[]} approvedBlockIds - Selected block IDs
 */
export async function applyLanguageChanges(
  notion,
  pageId,
  approvedBlockIds
) {
  const suggestions = await previewPage(notion, pageId);

  const approved = new Set(approvedBlockIds);
  const results = [];

  for (const suggestion of suggestions) {
    if (
      !approved.has(suggestion.blockId) ||
      !suggestion.shouldUpdate
    ) {
      continue;
    }

    try {
      // Retrieve the latest version of the block.
      const latestBlock = await notion.blocks.retrieve({
        block_id: suggestion.blockId
      });

      if (latestBlock.type !== "code") {
        results.push({
          blockId: suggestion.blockId,
          status: "skipped",
          reason: "Block is no longer a code block"
        });

        continue;
      }

      // Detect again using the latest code content.
      const latestCode = extractCode(latestBlock);

      const latestDetection = await detectLanguage(latestCode);

      const latestLanguage = normalizeLanguage(
        latestDetection?.language
      );

      if (
        !latestLanguage ||
        !isConfident(latestDetection) ||
        latestLanguage === latestBlock.code.language
      ) {
        results.push({
          blockId: suggestion.blockId,
          status: "skipped",
          reason: "No eligible language change"
        });

        continue;
      }

      // Avoid overwriting a manual language change
      // made after the preview was generated.
      if (
        latestBlock.code.language !== suggestion.currentLanguage
      ) {
        results.push({
          blockId: suggestion.blockId,
          status: "skipped",
          reason: "Language changed since preview"
        });

        continue;
      }

      // Preserve your original Notion SDK update logic.
      const response = await notion.blocks.update({
        block_id: suggestion.blockId,
        code: {
          language: latestLanguage
        }
      });

      results.push({
        blockId: response.id,
        previousLanguage: latestBlock.code.language,
        updatedLanguage: response.code.language,
        status:
          response.code.language === latestLanguage
            ? "updated"
            : "unverified"
      });

    } catch (error) {
      console.error(
        `Failed to update block ${suggestion.blockId}:`,
        error.message
      );

      results.push({
        blockId: suggestion.blockId,
        status: "failed",
        reason: error.message
      });
    }
  }

  return results;
}
