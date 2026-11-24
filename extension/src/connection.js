/**
 * The extension's view of the backend sign-in:
 *   { state: 'connected', workspaceName } | { state: 'disconnected' } | { state: 'offline' }
 * 'offline' means the backend couldn't be reached or answered with an error.
 */
export function createConnection({ apiUrl, fetch = globalThis.fetch }) {
  return {
    async getStatus() {
      try {
        const response = await fetch(`${apiUrl}/auth/status`, { credentials: 'include' })
        if (!response.ok) return { state: 'offline' }
        const body = await response.json()
        return body.connected
          ? { state: 'connected', workspaceName: body.workspaceName }
          : { state: 'disconnected' }
      } catch {
        return { state: 'offline' }
      }
    },

    connectUrl() {
      return `${apiUrl}/auth/notion`
    },

    async disconnect() {
      const response = await fetch(`${apiUrl}/auth/disconnect`, { method: 'POST', credentials: 'include' })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? 'Disconnect failed')
      }
    },
  }
}
