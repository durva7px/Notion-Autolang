
import "dotenv/config";

import express from "express";
import session from "express-session";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authRoutes from "./src/routes/auth.js";
import pageRoutes from "./src/routes/pages.js";
import blockRoutes from "./src/routes/block.route.js";

const app = express();

const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.resolve(
  __dirname,
  "../../frontend"
);

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is required");
}

if (
  !process.env.NOTION_CLIENT_ID ||
  !process.env.NOTION_CLIENT_SECRET ||
  !process.env.NOTION_REDIRECT_URI
) {
  throw new Error("Missing Notion OAuth configuration");
}

app.use(express.json({ limit: "100kb" }));

app.use(
  session({
    name: "autolang.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

app.use(express.static(frontendPath));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    application: "Notion AutoLang"
  });
});

app.use("/auth", authRoutes);
app.use("/api/pages", pageRoutes);
app.use("/blocks", blockRoutes);

app.listen(PORT, () => {
  console.log(
    `AutoLang running at http://localhost:${PORT}`
  );
});
