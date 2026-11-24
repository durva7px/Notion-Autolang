// Where the AutoLang backend runs. Change this when the backend is deployed,
// and add the new address to host_permissions in manifest.json.
export const API_URL = 'http://localhost:3000'

// How long Notion must be quiet (no code-block changes) before a page is synced.
export const SYNC_DELAY_MS = 2000

// Notion tabs the extension works in. Keep in sync with manifest.json.
export const NOTION_TABS = ['https://www.notion.so/*', 'https://*.notion.so/*', 'https://app.notion.com/*']
