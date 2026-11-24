import { describe, it, expect, vi } from 'vitest'
import { createConnection } from '../src/connection.js'

const API = 'http://localhost:3000'

function respond(status, body) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

describe('createConnection', () => {
  it('reports the connected workspace', async () => {
    const fetch = respond(200, { connected: true, workspaceId: 'ws', workspaceName: "Durva's Notion" })
    const connection = createConnection({ apiUrl: API, fetch })

    expect(await connection.getStatus()).toEqual({ state: 'connected', workspaceName: "Durva's Notion" })
    expect(fetch).toHaveBeenCalledWith(`${API}/auth/status`, { credentials: 'include' })
  })

  it('reports when no workspace is connected', async () => {
    const connection = createConnection({ apiUrl: API, fetch: respond(200, { connected: false }) })

    expect(await connection.getStatus()).toEqual({ state: 'disconnected' })
  })

  it("reports the backend as offline when it can't be reached", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    const connection = createConnection({ apiUrl: API, fetch })

    expect(await connection.getStatus()).toEqual({ state: 'offline' })
  })

  it('reports the backend as offline when it answers with an error', async () => {
    const connection = createConnection({ apiUrl: API, fetch: respond(500, { error: 'boom' }) })

    expect(await connection.getStatus()).toEqual({ state: 'offline' })
  })

  it('gives the address that starts Notion sign-in', () => {
    expect(createConnection({ apiUrl: API }).connectUrl()).toBe(`${API}/auth/notion`)
  })

  it('disconnects through the backend', async () => {
    const fetch = respond(200, { disconnected: true })
    const connection = createConnection({ apiUrl: API, fetch })

    await connection.disconnect()

    expect(fetch).toHaveBeenCalledWith(`${API}/auth/disconnect`, { method: 'POST', credentials: 'include' })
  })

  it('fails loudly when disconnecting fails', async () => {
    const connection = createConnection({ apiUrl: API, fetch: respond(500, { error: 'Unable to disconnect' }) })

    await expect(connection.disconnect()).rejects.toThrow('Unable to disconnect')
  })
})
