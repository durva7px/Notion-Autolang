
import express from "express";

import { createNotionClient } from "../services/notion.js";

// import {
//   searchPages,
//   notionRequest
// } from "../services/notion.js";

import {
  previewPage,
  applyLanguageChanges
} from "../services/processor.js";

const router = express.Router();

// prevent access to these routes if the user hasn't connected their Notion workspace.
function requireNotion(req, res, next) {
  if (!req.session.notion?.accessToken) {
    return res.status(401).json({
      error: "Connect your Notion workspace first."
    });
  }

  next();
}

// middleware to ensure these routes cannot run without an authorized connection.
router.use(requireNotion);

// Get a list of accessible Notion pages for the connected workspace
router.get("/", async (req, res) => {
  try {
    const notion = createNotionClient(
      req.session.notion.accessToken
    );

    const response = await notion.search({
      filter: {
        property: "object",
        value: "page"
      },
      page_size: 100
    });

    const pages = response.results.map(page => ({
      id: page.id,
      url: page.url,
      title:
        Object.values(page.properties || {})
          .find(property => property.type === "title")
          ?.title
          ?.map(item => item.plain_text)
          .join("") || "Untitled"
    }));

    res.json(pages);
  } catch (error) {
    console.error("Failed to load pages:", error.message);

    res.status(error.status || 500).json({
      error: error.message
    });
  }
});

// Preview code blocks on a Notion page without applying changes
router.post("/:pageId/preview", async (req, res) => {
  try {
    const notion = createNotionClient(
      req.session.notion.accessToken
    );

    // Verify the page is accessible.
    await notion.pages.retrieve({
      page_id: req.params.pageId
    });

    const suggestions = await previewPage(
      notion,
      req.params.pageId
    );

    res.json({
      pageId: req.params.pageId,
      totalBlocks: suggestions.length,
      suggestions
    });

  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message
    });
  }
});

// Apply language changes to selected code blocks on a Notion page
router.post("/:pageId/apply", async (req, res) => {
  try {
    const { blockIds } = req.body;

    if (
      !Array.isArray(blockIds) ||
      blockIds.length > 100 ||
      !blockIds.every(
        id =>
          typeof id === "string" &&
          /^[0-9a-f-]{32,36}$/i.test(id)
      )
    ) {
      return res.status(400).json({
        error: "Invalid block selection"
      });
    }

    const notion = createNotionClient(
      req.session.notion.accessToken
    );

    // Verify page access before processing.
    await notion.pages.retrieve({
      page_id: req.params.pageId
    });

    const results = await applyLanguageChanges(
      notion,
      req.params.pageId,
      blockIds
    );

    res.json({ results });

  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message
    });
  }
});

export default router;
