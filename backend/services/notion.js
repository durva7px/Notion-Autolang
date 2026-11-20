import notionSdk from "@notionhq/client";

// The SDK is CommonJS; Node can't pull its named exports into ESM.
const { Client } = notionSdk;

/** Creates a Notion API client acting as the connected user's integration. */
export function createNotionClient(accessToken) {
  return new Client({ auth: accessToken });
}
