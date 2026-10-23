
import express from "express";
import crypto from "node:crypto";

const router = express.Router();

router.get("/notion", (req, res) => {
  const state = crypto.randomBytes(32).toString("hex");

  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID,
    response_type: "code",
    owner: "user",
    redirect_uri: process.env.NOTION_REDIRECT_URI,
    state
  });

  // Save the session before redirecting.
  req.session.save(error => {
    if (error) {
      return res.status(500).send("Session error");
    }

    res.redirect(
      `https://api.notion.com/v1/oauth/authorize?${params}`
    );
  });
});

router.get("/notion/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(
      "Notion authorization was cancelled or denied."
    );
  }

  if (
    typeof code !== "string" ||
    typeof state !== "string" ||
    !req.session.oauthState ||
    state !== req.session.oauthState
  ) {
    return res.status(400).send(
      "Invalid OAuth callback or state."
    );
  }

  delete req.session.oauthState;

  try {
    const credentials = Buffer.from(
      `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(
      "https://api.notion.com/v1/oauth/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: process.env.NOTION_REDIRECT_URI
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Notion OAuth failed:",
        response.status,
        data.code || data.error
      );

      return res.status(502).send(
        "Unable to connect to Notion."
      );
    }

    // Local MVP: server-side session storage.
    // Never send access/refresh tokens to the frontend.
    req.session.notion = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      workspaceId: data.workspace_id,
      workspaceName: data.workspace_name,
      botId: data.bot_id
    };

    req.session.save(error => {
      if (error) {
        return res.status(500).send(
          "Unable to save the connection."
        );
      }

      res.redirect("/auth/status"); // add "successfully connected" endpoint to render UI
    });
  } catch (error) {
    console.error("OAuth callback error:", error.message);

    res.status(500).send(
      "An unexpected authorization error occurred."
    );
  }
});

router.get("/status", (req, res) => {
  const connection = req.session.notion;

  if (!connection) {
    return res.json({
      connected: false
    });
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
      return res.status(500).json({
        error: "Unable to disconnect"
      });
    }

    res.clearCookie("autolang.sid");
    res.json({ disconnected: true });
  });
});

export default router;
