// Service worker: receives "a code block changed" from Notion tabs and syncs
// the page once editing pauses. Requests go from here, not the content script,
// so they count as the extension's own (host_permissions), not Notion's page.
import { API_URL, SYNC_DELAY_MS } from './config.js'
import { pageIdFromUrl } from './notionPage.js'
import { createSyncClient } from './syncClient.js'
import { createSyncScheduler } from './syncScheduler.js'

const client = createSyncClient({ apiUrl: API_URL })

const scheduler = createSyncScheduler({
  delayMs: SYNC_DELAY_MS,
  async sync(pageId) {
    const { results } = await client.syncPage(pageId)
    const changed = results.filter(result => result.status !== 'unchanged')
    if (changed.length > 0) console.info(`[AutoLang] ${pageId}`, changed)
  },
  onError(pageId, error) {
    console.warn(`[AutoLang] sync failed for ${pageId}: ${error.message}`)
  },
})

chrome.runtime.onMessage.addListener(message => {
  if (message?.type !== 'code-changed') return
  const pageId = pageIdFromUrl(message.url)
  if (pageId) scheduler.schedule(pageId)
})
