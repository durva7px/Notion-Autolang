import express from "express";

import { detectLanguageWithConfidence } from "../services/language-detector.js";

export const MAX_CODE_LENGTH = 20_000;
const DEFAULT_RATE_LIMIT = { max: 60, windowMs: 60_000 };

/**
 * Public language detection for the website's playground: no Notion connection.
 * Uses the same detector and confidence threshold as page sync, so the
 * playground shows what AutoLang would do to a Notion code block.
 */
export function createDetectRouter({ confidenceThreshold, allowedOrigins = [], rateLimit = {} }) {
  const router = express.Router();
  router.use(cors(allowedOrigins));

  router.post("/", limitPerVisitor({ ...DEFAULT_RATE_LIMIT, ...rateLimit }), (req, res) => {
    const code = req.body?.code;
    if (typeof code !== "string") {
      return res.status(400).json({ error: "Send the snippet as { code: string }." });
    }
    if (code.length > MAX_CODE_LENGTH) {
      return res.status(413).json({ error: `Snippets are limited to ${MAX_CODE_LENGTH} characters.` });
    }

    const { language, confidence } = detectLanguageWithConfidence(code);
    res.json({ language, confidence, confident: language !== null && confidence >= confidenceThreshold });
  });

  return router;
}

/** CORS for the website only. No cookies are involved, so credentials stay off. */
function cors(allowedOrigins) {
  return (req, res, next) => {
    const origin = req.get("Origin");
    if (origin && allowedOrigins.includes(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
      res.vary("Origin");
      if (req.method === "OPTIONS") {
        res.set({
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "600"
        });
      }
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  };
}

/** A fixed-window request limit per client IP, kept in memory. */
function limitPerVisitor({ max, windowMs, now = Date.now }) {
  const windows = new Map();

  return (req, res, next) => {
    const time = now();
    if (windows.size > 10_000) {
      for (const [ip, w] of windows) if (w.resetAt <= time) windows.delete(ip);
    }

    let w = windows.get(req.ip);
    if (!w || w.resetAt <= time) {
      w = { count: 0, resetAt: time + windowMs };
      windows.set(req.ip, w);
    }
    if (++w.count > max) {
      res.set("Retry-After", String(Math.ceil((w.resetAt - time) / 1000)));
      return res.status(429).json({ error: "Too many requests. Try again in a minute." });
    }
    next();
  };
}
