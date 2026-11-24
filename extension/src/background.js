// Service worker: syncs Notion pages after edits, keeps the badge and popup
// status current, and runs the Connect / Disconnect buttons. Chrome can stop it
// between events, so anything that must survive lives in chrome.storage.session.
import { API_URL, NOTION_TABS, SYNC_DELAY_MS } from './config.js'
import { createConnection } from './connection.js'
import { pageIdFromUrl } from './notionPage.js'
import { badgeFor, createStatusTracker } from './status.js'
import { createSyncClient } from './syncClient.js'
import { createSyncScheduler } from './syncScheduler.js'

const connection = createConnection({ apiUrl: API_URL })
const client = createSyncClient({ apiUrl: API_URL })

const sessionValue = key => ({
  get: async () => (await chrome.storage.session.get(key))[key] ?? null,
  set: async value => chrome.storage.session.set({ [key]: value }),
})
const authTab = sessionValue('authTabId')

const tracker = createStatusTracker({
  getStatus: () => connection.getStatus(),
  store: sessionValue('status'),
  onChange: showBadge,
  onConnected: syncOpenNotionTabs,
})

const scheduler = createSyncScheduler({
  delayMs: SYNC_DELAY_MS,
  async sync(pageId) {
    const { results } = await client.syncPage(pageId)
    const changed = results.filter(result => result.status !== 'unchanged')
    if (changed.length > 0) console.info(`[AutoLang] ${pageId}`, changed)
    await tracker.syncSucceeded(results)
  },
  async onError(pageId, error) {
    console.warn(`[AutoLang] sync failed for ${pageId}: ${error.message}`)
    await tracker.syncFailed(error)
  },
})

function showBadge(view) {
  const { text, color, title } = badgeFor(view)
  chrome.action.setBadgeText({ text })
  chrome.action.setBadgeBackgroundColor({ color })
  chrome.action.setTitle({ title })
}

/** Syncs every open Notion page: after connecting, pages opened earlier catch up. */
async function syncOpenNotionTabs() {
  for (const tab of await chrome.tabs.query({ url: NOTION_TABS })) {
    const pageId = pageIdFromUrl(tab.url)
    if (pageId) scheduler.schedule(pageId)
  }
}

const handlers = {
  'code-changed': async ({ url }) => {
    const pageId = pageIdFromUrl(url)
    if (pageId) scheduler.schedule(pageId)
  },
  'get-status': () => tracker.refresh(),
  connect: async () => {
    const tab = await chrome.tabs.create({ url: connection.connectUrl() })
    await authTab.set(tab.id)
  },
  disconnect: async () => {
    await connection.disconnect()
    return tracker.refresh()
  },
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = handlers[message?.type]
  if (!handler) return false
  Promise.resolve(handler(message))
    .then(result => sendResponse({ ok: true, result }))
    .catch(error => sendResponse({ ok: false, error: error.message }))
  return true // the response is sent asynchronously
})

// Notice when the sign-in tab the popup opened finishes or is closed.
chrome.tabs.onUpdated.addListener(async (tabId, change) => {
  if (change.status !== 'complete' || tabId !== (await authTab.get())) return
  const view = await tracker.refresh()
  if (view.connection.state === 'connected') await authTab.set(null)
})
chrome.tabs.onRemoved.addListener(async tabId => {
  if (tabId !== (await authTab.get())) return
  await authTab.set(null)
  await tracker.refresh()
})

// Chrome doesn't add content scripts to tabs that were open before the
// extension was installed or reloaded, so add them now.
chrome.runtime.onInstalled.addListener(async () => {
  for (const tab of await chrome.tabs.query({ url: NOTION_TABS })) {
    chrome.scripting
      .executeScript({ target: { tabId: tab.id }, files: ['src/content.js'] })
      .catch(error => console.warn(`[AutoLang] couldn't add to tab ${tab.id}: ${error.message}`))
  }
  await tracker.refresh()
})
chrome.runtime.onStartup.addListener(() => tracker.refresh())
