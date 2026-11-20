export const NOTION_HOME = "https://www.notion.so/";

/**
 * Notion's OAuth response has no workspace URL, so open a page the user shared
 * with the integration: it is guaranteed to live in the connected workspace.
 */
export async function findWorkspaceUrl(notion) {
  try {
    const response = await notion.search({
      filter: { property: "object", value: "page" },
      page_size: 1
    });
    const url = response.results[0]?.url;
    return isNotionUrl(url) ? url : NOTION_HOME;
  } catch (error) {
    console.error("Could not look up a workspace page:", error.message);
    return NOTION_HOME;
  }
}

// Notion serves pages from notion.so and (now) app.notion.com.
const NOTION_DOMAINS = ["notion.so", "notion.com"];

export function isNotionUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      NOTION_DOMAINS.some(
        domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      )
    );
  } catch {
    return false;
  }
}
