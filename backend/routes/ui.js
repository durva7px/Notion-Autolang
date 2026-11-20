import express from "express";

import { findWorkspaceUrl } from "../services/workspace.js";

export function createUiRouter({ createNotionClient }) {
  const router = express.Router();

  router.get("/", (req, res) => {
    if (req.session.notion?.accessToken) {
      return res.redirect("/connected");
    }
    res.type("html").send(
      layout(
        "Connect Notion",
        `<h1>Notion AutoLang</h1>
         <p>Automatically set the right language on your Notion code blocks.</p>
         <a class="button" href="/auth/notion">Connect Notion</a>`
      )
    );
  });

  router.get("/connected", async (req, res) => {
    const connection = req.session.notion;
    if (!connection?.accessToken) {
      return res.redirect("/");
    }

    const workspaceUrl = await findWorkspaceUrl(
      createNotionClient(connection.accessToken)
    );

    res.type("html").send(
      layout(
        "Workspace connected",
        `<p class="check" aria-hidden="true">&#10003;</p>
         <h1>Notion workspace connected</h1>
         <p class="workspace">${escapeHtml(connection.workspaceName || "Your workspace")}</p>
         <a class="button" id="open-workspace" href="${escapeHtml(workspaceUrl)}"
            target="_blank" rel="noopener noreferrer">Open workspace</a>`
      )
    );
  });

  return router;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · Notion AutoLang</title>
  <style>
    :root { --bg: #f7f6f3; --card: #ffffff; --text: #37352f; --muted: #787774; --accent: #2383e2; --ok: #0f7b6c; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #191919; --card: #252525; --text: #e6e6e5; --muted: #9b9a97; --accent: #529cca; --ok: #4dab9a; }
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
           background: var(--bg); color: var(--text);
           font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
    main { width: 100%; max-width: 420px; background: var(--card); border-radius: 12px;
           padding: 40px 32px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    h1 { font-size: 1.5rem; margin: 0 0 8px; }
    p { margin: 0 0 24px; color: var(--muted); }
    .check { font-size: 2.5rem; color: var(--ok); margin: 0 0 8px; }
    .workspace { font-weight: 600; color: var(--text); }
    .button { display: inline-block; padding: 10px 20px; border-radius: 8px; background: var(--accent);
              color: #fff; text-decoration: none; font-weight: 600; }
    .button:hover { filter: brightness(1.08); }
  </style>
</head>
<body><main>${body}</main></body>
</html>`;
}
