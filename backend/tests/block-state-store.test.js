import { describe, it, expect } from "vitest";
import { createMemoryBlockStateStore } from "../services/block-state-store.js";

describe("in-memory block state store", () => {
  it("returns null for a block it has never seen", async () => {
    const store = createMemoryBlockStateStore();

    expect(await store.get("block-1")).toBeNull();
  });

  it("returns what was saved for a block", async () => {
    const store = createMemoryBlockStateStore();

    await store.set("block-1", { hash: "abc", language: "python", manual: false });

    expect(await store.get("block-1")).toEqual({ hash: "abc", language: "python", manual: false });
  });

  it("replaces the previous state", async () => {
    const store = createMemoryBlockStateStore();
    await store.set("block-1", { hash: "abc", language: "python", manual: false });

    await store.set("block-1", { hash: "def", language: "go", manual: false });

    expect(await store.get("block-1")).toEqual({ hash: "def", language: "go", manual: false });
  });

  it("hands out copies, so callers can't change stored state by accident", async () => {
    const store = createMemoryBlockStateStore();
    const state = { hash: "abc", language: "python", manual: false };
    await store.set("block-1", state);

    state.hash = "changed";
    (await store.get("block-1")).language = "changed";

    expect(await store.get("block-1")).toEqual({ hash: "abc", language: "python", manual: false });
  });
});
