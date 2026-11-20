/** Calls the backend's sync endpoint for a page. */
export function createSyncClient({ apiUrl, fetch = globalThis.fetch }) {
  return {
    async syncPage(pageId) {
      const response = await fetch(`${apiUrl}/pages/${pageId}/sync`, {
        method: 'POST',
        credentials: 'include', // the backend's session cookie says which workspace this is
      })
      const body = await response.json().catch(() => ({}))

      if (response.status === 401) {
        throw new Error(`Connect your Notion workspace first: open ${apiUrl}/auth/notion`)
      }
      if (!response.ok) {
        throw new Error(`${response.status}: ${body.error ?? 'Sync failed'}`)
      }
      return body
    },
  }
}
