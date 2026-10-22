const snippet = `

   
import  dotenv from "dotenv";
import { fileURLToPath } from "node:url";
// Load backend/.env no matter which directory the script is run from
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

if (!process.env.NOTION_API_KEY) {
  throw new Error("NOTION_API_KEY is not set — check backend/.env");
}

import { Client } from "@notionhq/client";

import { detectLanguage } from "../src/services/detector.js";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

async function main() {
  const pageId = process.env.NOTION_PAGE_ID;

  const response = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 100,
  });

  // Log the results
  console.log("Retrieved blocks:");
  for (const block of response.results) {
    if (block.type === "code") {
          console.log({
            id: block.id,
            type: block.type,
            has_children: block.has_children,
            content:
              block.type === "code"
                ? block.code.rich_text
                    .map((item) => item.plain_text)
                    .join("")
                : undefined,
            language:
              block.type === "code"
                ? block.code.language
                : undefined,
    });
    }
  }

  console.log("Detecting languages for code blocks...");

  for (const block of response.results) {
    if (block.type === "code") {
      const detectedResults = await detectLanguage(block.code.rich_text.map((item) => item.plain_text).join(""));
      const updatedLanguage = detectedResults.language;
      
`

export default snippet;