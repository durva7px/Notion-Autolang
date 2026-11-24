import dotenv from "dotenv";

import { createApp } from "./app.js";

dotenv.config({ path: new URL("./.env", import.meta.url), quiet: true });

const REQUIRED = [
  "NOTION_CLIENT_ID",
  "NOTION_CLIENT_SECRET",
  "NOTION_REDIRECT_URI",
  "SESSION_SECRET"
];

const missing = REQUIRED.filter(name => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const config = {
  notionClientId: process.env.NOTION_CLIENT_ID,
  notionClientSecret: process.env.NOTION_CLIENT_SECRET,
  notionRedirectUri: process.env.NOTION_REDIRECT_URI,
  sessionSecret: process.env.SESSION_SECRET,
  // Websites allowed to start OAuth and receive the result (comma-separated
  // origins; the first is the default). Empty: the backend shows its own page.
  frontendUrls: (process.env.FRONTEND_URLS || "")
    .split(",")
    .map(url => url.trim())
    .filter(Boolean)
    .map(url => new URL(url).origin),
  secureCookies: process.env.NODE_ENV === "production",
  // 0–1; blank uses the app default.
  // Set when running behind a proxy so the playground's rate limit sees real
  // visitor IPs: a hop count (e.g. 1) or "true".
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  confidenceThreshold: process.env.CONFIDENCE_THRESHOLD
    ? Number(process.env.CONFIDENCE_THRESHOLD)
    : undefined
};

const PORT = process.env.PORT || 3000;

createApp({ config }).listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

function parseTrustProxy(value) {
  if (!value) return undefined;
  if (value === "true") return true;
  return /^\d+$/.test(value) ? Number(value) : value;
}
