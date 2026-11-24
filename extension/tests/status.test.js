import { describe, it, expect, vi } from 'vitest'
import { badgeFor, createStatusTracker } from '../src/status.js'

const connected = { state: 'connected', workspaceName: "Durva's Notion" }
const disconnected = { state: 'disconnected' }
const offline = { state: 'offline' }

describe('badgeFor', () => {
  it('shows nothing when connected and syncing fine', () => {
    expect(badgeFor({ connection: connected, lastSync: { ok: true } })).toMatchObject({
      text: '',
      title: "AutoLang: connected to Durva's Notion",
    })
  })

  it('asks to connect when no workspace is connected', () => {
    expect(badgeFor({ connection: disconnected })).toMatchObject({
      text: '!',
      title: 'AutoLang: connect your Notion workspace',
    })
  })

  it('says when the backend is not running', () => {
    expect(badgeFor({ connection: offline })).toMatchObject({
      text: '!',
      title: "AutoLang: can't reach the backend",
    })
  })

  it('flags a failed sync even while connected', () => {
    const badge = badgeFor({ connection: connected, lastSync: { ok: false, error: '429: rate limited' } })

    expect(badge).toMatchObject({ text: '!', title: 'AutoLang: last sync failed (429: rate limited)' })
  })

  it('uses different colours for "needs you" and "something failed"', () => {
    const needsYou = badgeFor({ connection: disconnected }).color
    const failed = badgeFor({ connection: connected, lastSync: { ok: false, error: 'x' } }).color

    expect(needsYou).not.toBe(failed)
  })
})

/** chrome.storage.session stand-in: the service worker can sleep between events. */
function memoryStore(initial = null) {
  let value = initial
  return { get: async () => value, set: async next => (value = next) }
}

function tracker({ statuses, store = memoryStore() }) {
  const getStatus = vi.fn()
  for (const status of statuses) getStatus.mockResolvedValueOnce(status)
  const onConnected = vi.fn()
  const onChange = vi.fn()
  return { tracker: createStatusTracker({ getStatus, store, onConnected, onChange }), onConnected, onChange, store }
}

describe('createStatusTracker', () => {
  it('re-syncs open pages when the user goes from not connected to connected', async () => {
    const { tracker: t, onConnected } = tracker({ statuses: [disconnected, connected] })

    await t.refresh()
    await t.refresh()

    expect(onConnected).toHaveBeenCalledTimes(1)
  })

  it('remembers the previous state across service worker restarts', async () => {
    const store = memoryStore()
    await tracker({ statuses: [disconnected], store }).tracker.refresh()

    const { tracker: afterRestart, onConnected } = tracker({ statuses: [connected], store })
    await afterRestart.refresh()

    expect(onConnected).toHaveBeenCalledTimes(1)
  })

  it("doesn't re-sync when it was already connected", async () => {
    const { tracker: t, onConnected } = tracker({ statuses: [connected, connected] })

    await t.refresh()
    await t.refresh()

    expect(onConnected).not.toHaveBeenCalled()
  })

  it("doesn't re-sync the first time it ever checks", async () => {
    const { tracker: t, onConnected } = tracker({ statuses: [connected] })

    await t.refresh()

    expect(onConnected).not.toHaveBeenCalled()
  })

  it('reports every change so the badge can update', async () => {
    const { tracker: t, onChange } = tracker({ statuses: [connected] })

    const view = await t.refresh()

    expect(view).toEqual({ connection: connected, lastSync: null })
    expect(onChange).toHaveBeenLastCalledWith(view)
  })

  it('records sync results', async () => {
    const { tracker: t, onChange } = tracker({ statuses: [connected] })
    await t.refresh()

    await t.syncSucceeded([{ status: 'updated' }, { status: 'unchanged' }, { status: 'updated' }])

    expect(onChange).toHaveBeenLastCalledWith({
      connection: connected,
      lastSync: { ok: true, updated: 2, at: expect.any(Number) },
    })
  })

  it('records sync failures', async () => {
    const { tracker: t, onChange } = tracker({ statuses: [connected] })
    await t.refresh()

    await t.syncFailed(new Error('429: rate limited'))

    expect(onChange).toHaveBeenLastCalledWith({
      connection: connected,
      lastSync: { ok: false, error: '429: rate limited', at: expect.any(Number) },
    })
  })

  it('marks the workspace as disconnected when a sync is refused for that reason', async () => {
    const { tracker: t } = tracker({ statuses: [connected] })
    await t.refresh()

    const view = await t.syncFailed(Object.assign(new Error('Connect first'), { code: 'not_connected' }))

    expect(view.connection).toEqual(disconnected)
  })

  it('then re-syncs once the user connects again', async () => {
    const { tracker: t, onConnected } = tracker({ statuses: [connected, connected] })
    await t.refresh()
    await t.syncFailed(Object.assign(new Error('Connect first'), { code: 'not_connected' }))

    await t.refresh()

    expect(onConnected).toHaveBeenCalledTimes(1)
  })
})

describe('createStatusTracker before its first status check', () => {
  it('checks the connection first when a sync finishes', async () => {
    const { tracker: t } = tracker({ statuses: [connected] })

    const view = await t.syncSucceeded([{ status: 'updated' }])

    expect(view.connection).toEqual(connected)
    expect(view.lastSync).toMatchObject({ ok: true, updated: 1 })
  })

  it('checks the connection first when a sync fails', async () => {
    const { tracker: t } = tracker({ statuses: [connected] })

    const view = await t.syncFailed(new Error('boom'))

    expect(view.connection).toEqual(connected)
    expect(view.lastSync).toMatchObject({ ok: false, error: 'boom' })
  })
})
