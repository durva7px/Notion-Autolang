import { describe, it, expect } from "vitest";
import { createDynamoBlockStateStore } from "../services/dynamo-block-state-store.js";
import { createFakeDocumentClient } from "./fake-dynamodb.js";

const TABLE = "autolang-block-states";

function buildStore(documentClient = createFakeDocumentClient()) {
  return createDynamoBlockStateStore({ documentClient, tableName: TABLE });
}

describe("DynamoDB block state store", () => {
  it("returns null for a block it has never seen", async () => {
    expect(await buildStore().get("block-1")).toBeNull();
  });

  it("returns what was saved for a block", async () => {
    const store = buildStore();

    await store.set("block-1", { hash: "abc", language: "python", manual: false });

    expect(await store.get("block-1")).toEqual({ hash: "abc", language: "python", manual: false });
  });

  it("replaces the previous state", async () => {
    const store = buildStore();
    await store.set("block-1", { hash: "abc", language: "python", manual: false });

    await store.set("block-1", { hash: "def", language: "go", manual: true });

    expect(await store.get("block-1")).toEqual({ hash: "def", language: "go", manual: true });
  });

  it("keeps blocks apart", async () => {
    const store = buildStore();
    await store.set("block-1", { hash: "abc", language: "python", manual: false });
    await store.set("block-2", { hash: "def", language: "go", manual: true });

    expect(await store.get("block-1")).toEqual({ hash: "abc", language: "python", manual: false });
    expect(await store.get("block-2")).toEqual({ hash: "def", language: "go", manual: true });
  });

  it("shares state between Lambda instances that use the same table", async () => {
    const documentClient = createFakeDocumentClient();
    await buildStore(documentClient).set("block-1", { hash: "abc", language: "rust", manual: true });

    expect(await buildStore(documentClient).get("block-1"))
      .toEqual({ hash: "abc", language: "rust", manual: true });
  });

  it("stores each block under its blockId key in the configured table", async () => {
    const documentClient = createFakeDocumentClient();
    await buildStore(documentClient).set("block-1", { hash: "abc", language: "python", manual: false });

    expect(documentClient.items(TABLE)).toEqual([
      { blockId: "block-1", hash: "abc", language: "python", manual: false }
    ]);
  });
});
