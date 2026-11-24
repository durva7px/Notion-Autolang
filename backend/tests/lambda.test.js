import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createLambdaHandler } from "../lambda.js";
import { createFakeDocumentClient } from "./fake-dynamodb.js";

const BACKEND_DIR = fileURLToPath(new URL("..", import.meta.url));

const ENV = {
  NOTION_CLIENT_ID: "lambda-client-id",
  NOTION_CLIENT_SECRET: "lambda-client-secret",
  NOTION_REDIRECT_URI: "https://api.example.test/auth/notion/callback",
  SESSION_SECRET: "lambda-session-secret",
  SESSIONS_TABLE: "autolang-sessions",
  BLOCK_STATES_TABLE: "autolang-block-states"
};

/** What API Gateway's HTTP API (payload format 2.0) sends the function. */
function httpApiEvent(method, path, { cookies, headers = {} } = {}) {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: path,
    rawQueryString: "",
    cookies,
    headers: {
      host: "api.example.test",
      "x-forwarded-proto": "https",
      "x-forwarded-for": "203.0.113.7",
      ...headers
    },
    requestContext: {
      accountId: "123456789012",
      apiId: "api",
      domainName: "api.example.test",
      requestId: "request-1",
      routeKey: "$default",
      stage: "$default",
      timeEpoch: Date.now(),
      http: { method, path, protocol: "HTTP/1.1", sourceIp: "203.0.113.7", userAgent: "test" }
    },
    isBase64Encoded: false
  };
}

const CONTEXT = { awsRequestId: "request-1", functionName: "autolang-api" };

describe("Lambda handler (lambda.js)", () => {
  it("answers /health for an API Gateway HTTP API request", async () => {
    const handler = createLambdaHandler({ env: ENV, documentClient: createFakeDocumentClient() });

    const res = await handler(httpApiEvent("GET", "/health"), CONTEXT);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: "ok", message: "Server is healthy!" });
  });

  it("keeps sessions in the DynamoDB sessions table", async () => {
    const documentClient = createFakeDocumentClient();
    const handler = createLambdaHandler({ env: ENV, documentClient });

    await handler(httpApiEvent("GET", "/auth/notion"), CONTEXT);

    expect(documentClient.items("autolang-sessions")).toHaveLength(1);
  });

  it("sends a Secure session cookie, since API Gateway only serves HTTPS", async () => {
    const handler = createLambdaHandler({ env: ENV, documentClient: createFakeDocumentClient() });

    const res = await handler(httpApiEvent("GET", "/auth/notion"), CONTEXT);

    const cookie = (res.cookies ?? []).find(c => c.startsWith("autolang.sid="));
    expect(cookie).toMatch(/;\s*Secure/i);
    expect(cookie).toMatch(/;\s*HttpOnly/i);
  });

  it("refuses to start without its settings and names the missing ones", () => {
    const { SESSION_SECRET, BLOCK_STATES_TABLE, ...partial } = ENV;

    expect(() => createLambdaHandler({ env: partial, documentClient: createFakeDocumentClient() }))
      .toThrow(/SESSION_SECRET.*BLOCK_STATES_TABLE|BLOCK_STATES_TABLE.*SESSION_SECRET/);
  });

  // Like server.smoke.test.js: plain Node catches ESM/CommonJS import errors vitest hides.
  it("loads and answers /health in plain Node", async () => {
    const script = `
      const { handler } = await import("./lambda.js");
      const res = await handler(${JSON.stringify(httpApiEvent("GET", "/health"))}, {});
      console.log(JSON.stringify(res));
    `;
    const output = await runNode(script, { ...ENV, AWS_REGION: "ap-southeast-2" });

    const res = JSON.parse(output.trim().split("\n").pop());
    expect(res.statusCode).toBe(200);
  }, 15000);
});

function runNode(script, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
      cwd: BACKEND_DIR,
      env: { ...process.env, ...env }
    });
    let out = "";
    let err = "";
    child.stdout.on("data", chunk => (out += chunk));
    child.stderr.on("data", chunk => (err += chunk));
    child.on("exit", code => (code === 0 ? resolve(out) : reject(new Error(`exit ${code}:\n${err}${out}`))));
  });
}
