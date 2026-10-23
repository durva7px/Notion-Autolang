import express from "express";
import {fetchCodeBlocks, fetchBlocks} from "../services/fetch-blocks.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

//const pageID = "3f920e09eb0980ac9f11d99ad9d4a4ec";

router.get("/fetch-blocks/:pageId", async (req, res) => {

    const pageId = req.params.pageId;

    try {
        const fetchedCodeBlocks = await fetchBlocks(pageId);
        res.json(fetchedCodeBlocks);
    } catch (error) {
        console.error("Error fetching code blocks:", error);
        res.status(500).json({ error: "Failed to fetch code blocks" });
    }
});

export default router;