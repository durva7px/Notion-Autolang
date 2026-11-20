import express from "express";
import session from "express-session";

import userRoutes from "./routes/user.routes.js";
import { createAuthRouter, SESSION_COOKIE } from "./routes/auth.js";
import { createUiRouter } from "./routes/ui.js";
import { createPagesRouter } from "./routes/pages.js";
import { createNotionClient as defaultCreateNotionClient } from "./services/notion.js";

/**
 * Builds the Express app. All external dependencies are passed in so tests
 * can swap Notion's HTTP endpoints for fakes.
 */
export function createApp({
  config,
  fetch = globalThis.fetch,
  createNotionClient = defaultCreateNotionClient
}) {
  const app = express();

  app.use(express.json());
  app.use(
    session({
      name: SESSION_COOKIE,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.secureCookies,
        maxAge: 7 * 24 * 60 * 60 * 1000
      }
    })
  );

  app.use("/user", userRoutes);
  app.use("/auth", createAuthRouter({ config, fetch, createNotionClient }));
  app.use("/pages", createPagesRouter({ createNotionClient }));
  app.use("/", createUiRouter({ createNotionClient }));

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "Server is healthy!" });
  });

  return app;
}
