// Builds the app's config from environment variables. Shared by server.js
// (local / long-running server) and lambda.js (AWS Lambda).

export const REQUIRED_ENV = [
  "NOTION_CLIENT_ID",
  "NOTION_CLIENT_SECRET",
  "NOTION_REDIRECT_URI",
  "SESSION_SECRET"
];

/**
 * Throws if any of `REQUIRED_ENV` plus `extraRequired` is missing, naming them all.
 * `defaults` fill settings the environment leaves blank (e.g. Lambda always
 * runs behind API Gateway over HTTPS).
 */
export function loadConfig(env, { extraRequired = [], defaults = {} } = {}) {
  const missing = [...REQUIRED_ENV, ...extraRequired].filter(name => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    notionClientId: env.NOTION_CLIENT_ID,
    notionClientSecret: env.NOTION_CLIENT_SECRET,
    notionRedirectUri: env.NOTION_REDIRECT_URI,
    sessionSecret: env.SESSION_SECRET,
    // Websites allowed to start OAuth and receive the result (comma-separated
    // origins; the first is the default). Empty: the backend shows its own page.
    frontendUrls: (env.FRONTEND_URLS || "")
      .split(",")
      .map(url => url.trim())
      .filter(Boolean)
      .map(url => new URL(url).origin),
    secureCookies: env.NODE_ENV === "production" || Boolean(defaults.secureCookies),
    // Set when running behind a proxy so the playground's rate limit sees real
    // visitor IPs: a hop count (e.g. 1) or "true".
    trustProxy: parseTrustProxy(env.TRUST_PROXY) ?? defaults.trustProxy,
    // 0–1; blank uses the app default.
    confidenceThreshold: env.CONFIDENCE_THRESHOLD
      ? Number(env.CONFIDENCE_THRESHOLD)
      : undefined
  };
}

function parseTrustProxy(value) {
  if (!value) return undefined;
  if (value === "true") return true;
  return /^\d+$/.test(value) ? Number(value) : value;
}
