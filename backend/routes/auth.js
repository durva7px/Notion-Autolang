import express from "express";
import crypto from "node:crypto";

import { findWorkspaceUrl } from "../services/workspace.js";

export const SESSION_COOKIE = "autolang.sid";

const NOTION_AUTHORIZE_URL = "https://api.notion.com/v1/oauth/authorize";
const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";

export function createAuthRouter({ config, fetch, createNotionClient }) {
  const router = express.Router();

  router.get("/notion", (req, res) => {
    const state = crypto.randomBytes(32).toString("hex");
    req.session.oauthState = state;
    // Remember which website to send the user back to (allowlisted only).
    req.session.returnTo = pickReturnTo(config.frontendUrls, req.query.return_to);

    const params = new URLSearchParams({
      client_id: config.notionClientId,
      response_type: "code",
      owner: "user",
      redirect_uri: config.notionRedirectUri,
      state
    });

    // Save the session before redirecting so the state survives the round trip.
    req.session.save(error => {
      if (error) {
        return res.status(500).send("Session error");
      }
      res.redirect(`${NOTION_AUTHORIZE_URL}?${params}`);
    });
  });

  router.get("/notion/callback", async (req, res) => {
    const { code, state, error } = req.query;
    const expectedState = req.session.oauthState;
    const site = req.session.returnTo;

    // The state is single-use, whatever the outcome.
    delete req.session.oauthState;
    delete req.session.returnTo;

    // With a website configured, every outcome goes back to it; otherwise
    // the backend answers directly.
    const fail = (reason, status, message) =>
      site
        ? res.redirect(frontendRedirect(site, { notion: "error", reason }))
        : res.status(status).send(message);

    if (error) {
      return fail("access_denied", 400, "Notion authorization was cancelled or denied.");
    }

    if (
      typeof code !== "string" ||
      typeof state !== "string" ||
      !expectedState ||
      !safeEqual(state, expectedState)
    ) {
      return fail("invalid_state", 400, "Invalid OAuth callback or state.");
    }

    let data;
    try {
      const credentials = Buffer.from(
        `${config.notionClientId}:${config.notionClientSecret}`
      ).toString("base64");

      const response = await fetch(NOTION_TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: config.notionRedirectUri
        })
      });

      data = await response.json();

      if (!response.ok) {
        console.error("Notion OAuth failed:", response.status, data.code || data.error);
        return fail("token_exchange_failed", 502, "Unable to connect to Notion.");
      }
    } catch (err) {
      console.error("OAuth callback error:", err.message);
      return fail("token_exchange_failed", 502, "Unable to connect to Notion.");
    }

    // Only the website needs the link up front; the backend page looks it up itself.
    const workspaceUrl = site
      ? await findWorkspaceUrl(createNotionClient(data.access_token))
      : null;

    // New session id after login prevents session fixation.
    req.session.regenerate(regenError => {
      if (regenError) {
        return fail("session_error", 500, "Unable to save the connection.");
      }

      // Tokens stay server-side; never send them to the browser.
      req.session.notion = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        workspaceId: data.workspace_id,
        workspaceName: data.workspace_name,
        workspaceIcon: data.workspace_icon,
        botId: data.bot_id
      };

      req.session.save(saveError => {
        if (saveError) {
          return fail("session_error", 500, "Unable to save the connection.");
        }
        if (site) {
          return res.redirect(
            frontendRedirect(site, {
              notion: "connected",
              workspace: data.workspace_name || "",
              open: workspaceUrl
            })
          );
        }
        res.redirect("/connected");
      });
    });
  });

  router.get("/status", (req, res) => {
    const connection = req.session.notion;

    if (!connection) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      workspaceId: connection.workspaceId,
      workspaceName: connection.workspaceName
    });
  });

  router.post("/disconnect", (req, res) => {
    req.session.destroy(error => {
      if (error) {
        return res.status(500).json({ error: "Unable to disconnect" });
      }
      res.clearCookie(SESSION_COOKIE);
      res.json({ disconnected: true });
    });
  });

  return router;
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/** The website's home page with the OAuth outcome in the query string. */
function frontendRedirect(frontendUrl, params) {
  const url = new URL("/", frontendUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * The website to return to after OAuth: the requested origin if it is on the
 * allowlist, otherwise the first allowed site, or null when none is configured.
 */
function pickReturnTo(allowed = [], requested) {
  if (allowed.length === 0) return null;
  try {
    const origin = new URL(requested).origin;
    if (allowed.includes(origin)) return origin;
  } catch {
    // Not a URL; fall through to the default site.
  }
  return allowed[0];
}
