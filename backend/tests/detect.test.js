import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildTestApp, TEST_CONFIG } from "./helpers.js";

const SITE = "https://autolang.test";
const PYTHON = `def calculate_average(numbers):

  total = sum(numbers)
  count = len(numbers)

  if count == 0:
    return 0

  return total / count`;

const app = (config = {}, overrides = {}) =>
  buildTestApp({ config: { ...TEST_CONFIG, frontendUrls: [SITE], ...config }, ...overrides });

const detect = (server, body) => request(server).post("/detect").send(body);

describe("POST /detect (playground, no Notion connection needed)", () => {
  it("detects the language of a snippet with the same confidence check as sync", async () => {
    const res = await detect(app(), { code: PYTHON });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ language: "python", confidence: expect.any(Number), confident: true });
    expect(res.body.confidence).toBeGreaterThanOrEqual(0.4);
  });

  it("says when it is not confident enough to change a block", async () => {
    const res = await detect(app(), { code: "const a = 1;" });

    expect(res.status).toBe(200);
    expect(res.body.confident).toBe(false);
  });

  it("returns no language for empty or unrecognisable code", async () => {
    for (const code of ["", "   ", "hello there"]) {
      const res = await detect(app(), { code });
      expect(res.body).toEqual({ language: null, confidence: 0, confident: false });
    }
  });

  it("uses the configured confidence threshold", async () => {
    const res = await detect(app({ confidenceThreshold: 0.99 }), { code: PYTHON });

    expect(res.body.language).toBe("python");
    expect(res.body.confident).toBe(false);
  });

  it("rejects a request without a code string", async () => {
    for (const body of [{}, { code: 42 }, { code: ["x"] }]) {
      const res = await detect(app(), body);
      expect(res.status).toBe(400);
    }
  });

  it("rejects snippets longer than 20,000 characters", async () => {
    const res = await detect(app(), { code: "x".repeat(20_001) });

    expect(res.status).toBe(413);
  });
});

describe("POST /detect from the website (CORS)", () => {
  it("lets the website read the response", async () => {
    const res = await request(app()).post("/detect").set("Origin", SITE).send({ code: PYTHON });

    expect(res.headers["access-control-allow-origin"]).toBe(SITE);
    expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("answers the browser's preflight for JSON requests", async () => {
    const res = await request(app())
      .options("/detect")
      .set("Origin", SITE)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(SITE);
    expect(res.headers["access-control-allow-methods"]).toMatch(/POST/);
    expect(res.headers["access-control-allow-headers"]).toMatch(/content-type/i);
  });

  it("does not open the endpoint to other sites", async () => {
    const res = await request(app())
      .post("/detect")
      .set("Origin", "https://evil.example")
      .send({ code: PYTHON });

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("does not add CORS headers to other routes", async () => {
    const res = await request(app()).get("/health").set("Origin", SITE);

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("POST /detect rate limit", () => {
  it("answers 429 once one visitor sends too many requests in a minute", async () => {
    const server = app({}, { detectRateLimit: { max: 3, windowMs: 60_000 } });

    for (let i = 0; i < 3; i++) {
      expect((await detect(server, { code: PYTHON })).status).toBe(200);
    }
    const blocked = await detect(server, { code: PYTHON });

    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("lets requests through again after the window", async () => {
    let now = 0;
    const server = app({}, { detectRateLimit: { max: 1, windowMs: 60_000, now: () => now } });

    expect((await detect(server, { code: PYTHON })).status).toBe(200);
    expect((await detect(server, { code: PYTHON })).status).toBe(429);
    now = 60_001;
    expect((await detect(server, { code: PYTHON })).status).toBe(200);
  });
});
