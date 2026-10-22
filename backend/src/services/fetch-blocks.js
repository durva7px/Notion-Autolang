/*
    Fetch code blocks from Notion database and return them as JSON objects
*/

import dotenv from "dotenv";
dotenv.config({ path: new URL("../../.env", import.meta.url) });
//const pageId = "20b20e09eb09807ca8cfdf7f08690996";
const PAGE_ID = process.env.NOTION_PAGE_ID;

import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// async function fetchCodeBlocks(pageId) {
//     const response = await notion.blocks.children.list({
//         block_id: pageId,
//         page_size: 100,
//     }).then(console.log(`pageID: ${pageId}`));

async function fetchCodeBlocks(pageId) {
    const response = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
    }).then(console.log(`pageID: ${pageId}`));

    const codeBlocks = response.results.filter(block => block.type === "code").map(block => ({
        id: block.id,
        type: block.type,
        has_children: block.has_children,
        content: block.code.rich_text.map(item => item.plain_text).join(""),    
    }));

    console.log("Fetched code blocks:", codeBlocks);
    return codeBlocks;
}

async function fetchBlocks(pageId) {
    const response = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
    }).then(console.log(`PageID: {pageId} accessed`));

    const fetchedBlocks = [];

    fetchedBlocks.push(...response.results)

    return fetchedBlocks;
}

//fetchCodeBlocks(PAGE_ID);

export { fetchCodeBlocks, fetchBlocks };