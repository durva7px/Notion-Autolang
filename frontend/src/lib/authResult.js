const NOTION_HOME = 'https://www.notion.so/'

/**
 * Reads the outcome the backend appends after Notion auth:
 *   ?notion=connected&workspace=…&open=…   or   ?notion=error&reason=…
 * Returns null when the page wasn't opened from the auth flow.
 */
export function readAuthResult(search) {
  const params = new URLSearchParams(search)
  const status = params.get('notion')

  if (status === 'connected') {
    return {
      status,
      workspace: params.get('workspace') || 'Your workspace',
      openUrl: safeNotionUrl(params.get('open')),
    }
  }

  if (status === 'error') {
    return { status, reason: params.get('reason') || 'unknown' }
  }

  return null
}

// Notion serves pages from notion.so and (now) app.notion.com.
const NOTION_DOMAINS = ['notion.so', 'notion.com']

// The query string is user-controlled: only ever link to Notion.
function safeNotionUrl(value) {
  try {
    const url = new URL(value)
    const isNotion = NOTION_DOMAINS.some(
      domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    )
    return url.protocol === 'https:' && isNotion ? url.toString() : NOTION_HOME
  } catch {
    return NOTION_HOME
  }
}
