import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const BACKEND_DIR = fileURLToPath(new URL("..", import.meta.url));
const PORT = 3999;

// Boots the real server in plain Node (not vitest's module loader), so
// ESM/CommonJS interop problems that vitest would hide surface here.
describe("server.js", () => {
  it("starts in plain Node and answers /health", async () => {
    const child = spawn(process.execPath, ["server.js"], {
      cwd: BACKEND_DIR,
      env: {
        ...process.env,
        PORT: String(PORT),
        NOTION_CLIENT_ID: "smoke-client-id",
        NOTION_CLIENT_SECRET: "smoke-client-secret",
        NOTION_REDIRECT_URI: `http://localhost:${PORT}/auth/notion/callback`,
        SESSION_SECRET: "smoke-session-secret"
      }
    });

    let output = "";
    child.stdout.on("data", chunk => (output += chunk));
    child.stderr.on("data", chunk => (output += chunk));

    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Server did not start:\n${output}`)), 8000);
        child.on("exit", code => {
          clearTimeout(timer);
          reject(new Error(`Server exited with ${code}:\n${output}`));
        });
        child.stdout.on("data", () => {
          if (output.includes("Server is running")) {
            clearTimeout(timer);
            resolve();
          }
        });
      });

      const res = await fetch(`http://localhost:${PORT}/health`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: "ok", message: "Server is healthy!" });
    } finally {
      child.kill();
    }
  }, 15000);
});
