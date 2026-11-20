/**
 * Decides when to sync a page:
 * - waits until changes have stopped for `delayMs` (each change restarts the wait)
 * - never runs two syncs for one page at once; changes during a sync queue exactly one more
 * Pages are handled independently.
 */
export function createSyncScheduler({ delayMs, sync, onError = () => {} }) {
  const pages = new Map() // pageId -> { timer, running, again }

  function stateFor(pageId) {
    if (!pages.has(pageId)) pages.set(pageId, { timer: null, running: false, again: false })
    return pages.get(pageId)
  }

  async function run(pageId) {
    const state = stateFor(pageId)
    state.timer = null
    if (state.running) {
      state.again = true
      return
    }

    state.running = true
    try {
      await sync(pageId)
    } catch (error) {
      onError(pageId, error)
    } finally {
      state.running = false
    }

    if (state.again) {
      state.again = false
      await run(pageId)
    }
  }

  return {
    schedule(pageId) {
      const state = stateFor(pageId)
      clearTimeout(state.timer)
      state.timer = setTimeout(() => run(pageId), delayMs)
    },
  }
}
