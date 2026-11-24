import { describe, it, expect, vi } from 'vitest'
import { createSyncClient } from '../src/syncClient.js'

const PAGE = '1a2b3c4d-5e6f-4071-8293-a4b5c6d7e8f9'

function respond(status, body) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

describe('createSyncClient', () => {
  it("posts to the page's sync endpoint with the session cookie and returns the results", async () => {
    const fetch = respond(200, { pageId: PAGE, results: [{ blockId: 'b', status: 'updated' }] })
    const client = createSyncClient({ apiUrl: 'http://localhost:3000', fetch })

    const body = await client.syncPage(PAGE)

    expect(fetch).toHaveBeenCalledWith(`http://localhost:3000/pages/${PAGE}/sync`, {
      method: 'POST',
      credentials: 'include',
    })
    expect(body.results).toEqual([{ blockId: 'b', status: 'updated' }])
  })

  it('explains when the user still needs to connect Notion', async () => {
    const client = createSyncClient({ apiUrl: 'http://localhost:3000', fetch: respond(401, { error: 'x' }) })

    await expect(client.syncPage(PAGE)).rejects.toThrow(/Connect your Notion workspace/)
    await expect(client.syncPage(PAGE)).rejects.toMatchObject({ code: 'not_connected' })
  })

  it("passes on the backend's error otherwise", async () => {
    const client = createSyncClient({
      apiUrl: 'http://localhost:3000',
      fetch: respond(404, { error: 'Could not find page' }),
    })

    await expect(client.syncPage(PAGE)).rejects.toThrow('404: Could not find page')
  })
})
