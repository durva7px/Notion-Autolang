import express from "express";
import session from "express-session";

import userRoutes from "./routes/user.routes.js";
import { createAuthRouter, SESSION_COOKIE } from "./routes/auth.js";
import { createUiRouter } from "./routes/ui.js";
import { createPagesRouter } from "./routes/pages.js";
import { createDetectRouter } from "./routes/detect.js";
import { createNotionClient as defaultCreateNotionClient } from "./services/notion.js";
import { createMemoryBlockStateStore } from "./services/block-state-store.js";

// Below this, AutoLang leaves a block's language alone. Tune with scripts/compare-detectors.js.
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.4;

/**
 * Builds the Express app. All external dependencies are passed in so tests
 * can swap Notion's HTTP endpoints for fakes.
 */
export function createApp({
  config,
  fetch = globalThis.fetch,
  createNotionClient = defaultCreateNotionClient,
  blockStates = createMemoryBlockStateStore(),
  // express-session store; undefined uses its in-memory store (fine for one local process).
  sessionStore,
  detectRateLimit
}) {
  const app = express();
  // Behind a proxy (e.g. a hosting platform), so req.ip is the visitor, not the proxy.
  if (config.trustProxy !== undefined) app.set("trust proxy", config.trustProxy);
  const confidenceThreshold = config.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;

  // Public and stateless, so it sits before the session middleware.
  app.use(
    "/detect",
    express.json(),
    createDetectRouter({
      confidenceThreshold,
      allowedOrigins: config.frontendUrls,
      rateLimit: detectRateLimit
    })
  );

  app.use(express.json());
  app.use(
    session({
      name: SESSION_COOKIE,
      store: sessionStore,
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
  app.use("/pages", createPagesRouter({
      createNotionClient,
      blockStates,
      confidenceThreshold
    }));
  app.use("/", createUiRouter({ createNotionClient }));

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "Server is healthy!" });
  });

  return app;
}
