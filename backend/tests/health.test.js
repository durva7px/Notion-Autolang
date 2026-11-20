import { describe, it, expect } from "vitest";
import request from "supertest";
import { buildTestApp } from "./helpers.js";

describe("GET /health", () => {
  it("reports the server is healthy as JSON", async () => {
    const res = await request(buildTestApp()).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", message: "Server is healthy!" });
  });
});
