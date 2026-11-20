/*
    Dev utility: fetch the code blocks on one Notion page using the internal
    integration key (NOTION_API_KEY) and print them as JSON.

    Run:  node services/fetch-code-blocks.js [pageId]
    (defaults to NOTION_PAGE_ID from backend/.env)
*/

import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import notionSdk from "@notionhq/client";

// The SDK is CommonJS; Node can't pull its named exports into ESM.
const { Client } = notionSdk;

export async function fetchCodeBlocks(notion, pageId) {
  const blocks = [];
  let cursor;
  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {})
    });
    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return blocks
    .filter(block => block.type === "code")
    .map(block => ({
      id: block.id,
      language: block.code.language,
      content: block.code.rich_text.map(item => item.plain_text).join("")
    }));
}

export default fetchCodeBlocks;

// Only run when executed directly, never on import.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  dotenv.config({ path: new URL("../.env", import.meta.url), quiet: true });
  const pageId = process.argv[2] || process.env.NOTION_PAGE_ID;
  const notion = new Client({ auth: process.env.NOTION_API_KEY });

  console.log(`pageId: ${pageId}`);
  const codeBlocks = await fetchCodeBlocks(notion, pageId);
  console.log(JSON.stringify(codeBlocks, null, 2));
}
