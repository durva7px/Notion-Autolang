// Save as quickstart.mjs after running: npm install @notionhq/client
import { Client } from "@notionhq/client";
import dotenv from "dotenv";

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function main() {
  const page = await notion.pages.create({
    icon: { emoji: "🚀" },
    markdown: [
      "# Hello from the API",
      "",
      "## Welcome",
      "",
      "This page was created with the Notion API. You just made your first request!",
      "",
      "- Read the [API reference](https://developers.notion.com/reference/intro)",
      "- Explore [examples](https://developers.notion.com/page/examples)",
    ].join("\n"),
  });

  console.log("Created page:", page.url);
}

main();