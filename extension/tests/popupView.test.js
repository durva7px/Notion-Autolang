import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/dom'
import { renderPopup } from '../src/popupView.js'

const NOW = Date.UTC(2026, 10, 20, 12, 0, 0)
const connected = { state: 'connected', workspaceName: "Durva's Notion" }

let root
let actions
beforeEach(() => {
  document.body.innerHTML = '<main id="root"></main>'
  root = document.getElementById('root')
  actions = { connect: vi.fn(), disconnect: vi.fn(), retry: vi.fn() }
})

const render = view => renderPopup(root, view, actions, { now: NOW })

describe('popup', () => {
  it('says it is checking before the status is known', () => {
    render(null)

    expect(screen.getByText(/Checking/)).toBeTruthy()
  })

  it('shows the connected workspace and a Disconnect button', () => {
    render({ connection: connected, lastSync: null })

    expect(screen.getByRole('heading').textContent).toMatch(/Connected/)
    expect(screen.getByText("Durva's Notion")).toBeTruthy()
    screen.getByRole('button', { name: 'Disconnect' }).click()
    expect(actions.disconnect).toHaveBeenCalled()
  })

  it('tells the user to open a Notion page when nothing has synced yet', () => {
    render({ connection: connected, lastSync: null })

    expect(screen.getByText(/Open a Notion page/)).toBeTruthy()
  })

  it('shows the last sync', () => {
    render({ connection: connected, lastSync: { ok: true, updated: 2, at: NOW - 3 * 60_000 } })

    expect(screen.getByText('Last sync 3 min ago: 2 blocks updated')).toBeTruthy()
  })

  it('shows a recent sync as just now, and one block in the singular', () => {
    render({ connection: connected, lastSync: { ok: true, updated: 1, at: NOW - 5_000 } })

    expect(screen.getByText('Last sync just now: 1 block updated')).toBeTruthy()
  })

  it('shows a failed sync with its reason', () => {
    render({ connection: connected, lastSync: { ok: false, error: '429: rate limited', at: NOW } })

    expect(screen.getByText(/Last sync failed: 429: rate limited/)).toBeTruthy()
  })

  it('offers Connect Notion when no workspace is connected', () => {
    render({ connection: { state: 'disconnected' }, lastSync: null })

    expect(screen.getByRole('heading').textContent).toMatch(/Not connected/)
    screen.getByRole('button', { name: 'Connect Notion' }).click()
    expect(actions.connect).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Disconnect' })).toBeNull()
  })

  it('explains how to start the backend when it is offline, with a retry', () => {
    render({ connection: { state: 'offline' }, lastSync: null })

    expect(screen.getByRole('heading').textContent).toMatch(/Backend not running/)
    expect(within(root).getByText('npm start --prefix backend')).toBeTruthy()
    screen.getByRole('button', { name: 'Try again' }).click()
    expect(actions.retry).toHaveBeenCalled()
  })

  it('replaces what was shown before', () => {
    render({ connection: { state: 'disconnected' }, lastSync: null })
    render({ connection: connected, lastSync: null })

    expect(screen.queryByRole('button', { name: 'Connect Notion' })).toBeNull()
    expect(screen.getAllByRole('heading')).toHaveLength(1)
  })

  it('shows workspace names as text, never as markup', () => {
    render({ connection: { state: 'connected', workspaceName: '<img src=x onerror=alert(1)>' }, lastSync: null })

    expect(root.querySelector('img')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy()
  })
})
