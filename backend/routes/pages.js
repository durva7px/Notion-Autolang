import express from "express";

import { previewPage, applyLanguageChanges, syncPage } from "../services/processor.js";

const BLOCK_ID_PATTERN = /^[0-9a-f-]{32,36}$/i;
const MAX_BLOCKS_PER_APPLY = 100;

export function createPagesRouter({ createNotionClient, blockStates, confidenceThreshold }) {
  const router = express.Router();

  // Every /pages route needs an authorized Notion connection.
  router.use((req, res, next) => {
    const accessToken = req.session.notion?.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: "Connect your Notion workspace first." });
    }
    req.notion = createNotionClient(accessToken);
    next();
  });

  // Pages shared with the integration in the connected workspace.
  router.get("/", async (req, res) => {
    try {
      const pages = [];
      let cursor;
      do {
        const response = await req.notion.search({
          filter: { property: "object", value: "page" },
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {})
        });
        pages.push(...response.results);
        cursor = response.has_more ? response.next_cursor : undefined;
      } while (cursor);

      res.json(pages.map(page => ({ id: page.id, url: page.url, title: pageTitle(page) })));
    } catch (error) {
      sendNotionError(res, error, "Failed to load pages");
    }
  });

  // Suggest languages for a page's code blocks without changing anything.
  router.post("/:pageId/preview", async (req, res) => {
    try {
      const { pageId } = req.params;
      await req.notion.pages.retrieve({ page_id: pageId });
      const suggestions = await previewPage(req.notion, pageId);
      res.json({ pageId, totalBlocks: suggestions.length, suggestions });
    } catch (error) {
      sendNotionError(res, error, "Failed to preview page");
    }
  });

  // Apply the suggested language to the selected code blocks.
  router.post("/:pageId/apply", async (req, res) => {
    const blockIds = req.body?.blockIds;
    if (
      !Array.isArray(blockIds) ||
      blockIds.length === 0 ||
      blockIds.length > MAX_BLOCKS_PER_APPLY ||
      !blockIds.every(id => typeof id === "string" && BLOCK_ID_PATTERN.test(id))
    ) {
      return res.status(400).json({ error: "Invalid block selection" });
    }

    try {
      const { pageId } = req.params;
      await req.notion.pages.retrieve({ page_id: pageId });
      const results = await applyLanguageChanges(req.notion, pageId, blockIds);
      res.json({ results });
    } catch (error) {
      sendNotionError(res, error, "Failed to apply changes");
    }
  });

  // Called by the extension when code blocks change: sets the language of new
  // and edited blocks it is confident about, and leaves everything else alone.
  router.post("/:pageId/sync", async (req, res) => {
    const { pageId } = req.params;
    if (!BLOCK_ID_PATTERN.test(pageId)) {
      return res.status(400).json({ error: "Invalid page id" });
    }

    try {
      await req.notion.pages.retrieve({ page_id: pageId });
      const results = await syncPage(req.notion, pageId, { blockStates, confidenceThreshold });
      res.json({ pageId, results });
    } catch (error) {
      sendNotionError(res, error, "Failed to sync page");
    }
  });

  return router;
}

function pageTitle(page) {
  const titleProperty = Object.values(page.properties || {}).find(
    property => property.type === "title"
  );
  return titleProperty?.title?.map(item => item.plain_text).join("") || "Untitled";
}

function sendNotionError(res, error, context) {
  console.error(`${context}:`, error.message);
  const status = Number.isInteger(error.status) ? error.status : 500;
  res.status(status).json({ error: error.message });
}
