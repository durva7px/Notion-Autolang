
import { detectLanguage } from "./detector.js";

import {
  getCodeBlocks,
  updateBlockLanguage
} from "./notion-dom.js";

// Prevent multiple scans from running simultaneously.
let isProcessing = false;

function scanPage() {
  const blocks = getCodeBlocks();

  return blocks.map(block => {
    const prediction = detectLanguage(block.code);

    return {
      ...block,
      suggestedLanguage: prediction?.language ?? null,
      relevance: prediction?.relevance ?? 0
    };
  });
}

async function applySuggestions(blockIds) {
  if (isProcessing) {
    throw new Error("A scan is already being processed.");
  }

  isProcessing = true;

  const results = [];

  try {
    const blocks = scanPage();

    for (const block of blocks) {
      if (!blockIds.includes(block.id)) {
        continue;
      }

      if (!block.suggestedLanguage) {
        results.push({
          id: block.id,
          status: "skipped",
          reason: "No reliable prediction"
        });

        continue;
      }

      if (
        block.currentLanguage?.toLowerCase() ===
        block.suggestedLanguage.toLowerCase()
      ) {
        results.push({
          id: block.id,
          status: "skipped",
          reason: "Already using suggested language"
        });

        continue;
      }

      try {
        await updateBlockLanguage(
          block.id,
          block.suggestedLanguage
        );

        results.push({
          id: block.id,
          status: "applied",
          language: block.suggestedLanguage
        });
      } catch (error) {
        results.push({
          id: block.id,
          status: "failed",
          reason: error.message
        });
      }
    }

    return results;
  } finally {
    isProcessing = false;
  }
}

// Listen for requests from the popup.
chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    if (message.type === "SCAN_PAGE") {
      sendResponse({
        success: true,
        blocks: scanPage()
      });

      return false;
    }

    if (message.type === "APPLY_SUGGESTIONS") {
      applySuggestions(message.blockIds)
        .then(results => {
          sendResponse({
            success: true,
            results
          });
        })
        .catch(error => {
          sendResponse({
            success: false,
            error: error.message
          });
        });

      // Keep the message channel open for async work.
      return true;
    }

    return false;
  }
);

console.log("Notion AutoLang loaded.");
