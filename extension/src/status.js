// What the extension shows about itself: the toolbar badge, and the state the
// popup reads. View: { connection: { state, workspaceName? }, lastSync }.

const COLOR_NEEDS_YOU = '#d046d8' // site magenta: connect, or start the backend
const COLOR_FAILED = '#c98a4a' // site amber: a sync went wrong

/** Badge text, colour and tooltip for a view. */
export function badgeFor({ connection, lastSync }) {
  if (connection.state === 'offline') {
    return { text: '!', color: COLOR_NEEDS_YOU, title: "AutoLang: can't reach the backend" }
  }
  if (connection.state !== 'connected') {
    return { text: '!', color: COLOR_NEEDS_YOU, title: 'AutoLang: connect your Notion workspace' }
  }
  if (lastSync && !lastSync.ok) {
    return { text: '!', color: COLOR_FAILED, title: `AutoLang: last sync failed (${lastSync.error})` }
  }
  return { text: '', color: COLOR_NEEDS_YOU, title: `AutoLang: connected to ${connection.workspaceName}` }
}

/**
 * Tracks the connection and the last sync. `store` persists the view (the
 * service worker can be stopped between events), and `onConnected` fires when
 * the user goes from not connected to connected, so open pages can be synced.
 */
export function createStatusTracker({ getStatus, store, onConnected = () => {}, onChange = () => {} }) {
  async function save(view) {
    await store.set(view)
    onChange(view)
    return view
  }

  // The view so far, checking the connection first if there's none yet.
  async function known() {
    return (await store.get()) ?? api.refresh()
  }

  const api = {
    async current() {
      return store.get()
    },

    async refresh() {
      const previous = await store.get()
      const connection = await getStatus()
      const view = await save({ connection, lastSync: previous?.lastSync ?? null })
      if (previous && previous.connection.state !== 'connected' && connection.state === 'connected') {
        onConnected()
      }
      return view
    },

    async syncSucceeded(results) {
      const previous = await known()
      const updated = results.filter(result => result.status === 'updated').length
      return save({ ...previous, lastSync: { ok: true, updated, at: Date.now() } })
    },

    async syncFailed(error) {
      const previous = await known()
      const connection = error.code === 'not_connected' ? { state: 'disconnected' } : previous.connection
      return save({ connection, lastSync: { ok: false, error: error.message, at: Date.now() } })
    },
  }
  return api
}
