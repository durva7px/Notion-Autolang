
import { Client } from "@notionhq/client";

/**
 * Creates a Notion client for a specific user's
 * authorized workspace.
 *
 * Never expose the access token to the frontend.
 */
export function createNotionClient(accessToken) {
  if (!accessToken) {
    throw new Error("Notion access token is required.");
  }

  return new Client({
    auth: accessToken
  });
}
