import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSyncScheduler } from '../src/syncScheduler.js'

const DELAY = 2000

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

/** A sync whose calls stay in flight until the test resolves them. */
function controllableSync() {
  const pending = []
  const sync = vi.fn(() => new Promise((resolve, reject) => pending.push({ resolve, reject })))
  return { sync, finish: () => pending.shift().resolve(), fail: () => pending.shift().reject(new Error('down')) }
}

describe('createSyncScheduler', () => {
  it('syncs a page once the user stops changing it', async () => {
    const sync = vi.fn(async () => {})
    const scheduler = createSyncScheduler({ delayMs: DELAY, sync })

    scheduler.schedule('page-1')
    await vi.advanceTimersByTimeAsync(DELAY - 1)
    expect(sync).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(sync).toHaveBeenCalledWith('page-1')
  })

  it('waits for a quiet moment: each change restarts the wait', async () => {
    const sync = vi.fn(async () => {})
    const scheduler = createSyncScheduler({ delayMs: DELAY, sync })

    for (let i = 0; i < 5; i++) {
      scheduler.schedule('page-1')
      await vi.advanceTimersByTimeAsync(DELAY - 100)
    }
    expect(sync).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(100)
    expect(sync).toHaveBeenCalledTimes(1)
  })

  it('handles pages independently', async () => {
    const sync = vi.fn(async () => {})
    const scheduler = createSyncScheduler({ delayMs: DELAY, sync })

    scheduler.schedule('page-1')
    scheduler.schedule('page-2')
    await vi.advanceTimersByTimeAsync(DELAY)

    expect(sync.mock.calls.map(([id]) => id).sort()).toEqual(['page-1', 'page-2'])
  })

  it('never runs two syncs for the same page at once, and runs one more after changes during a sync', async () => {
    const { sync, finish } = controllableSync()
    const scheduler = createSyncScheduler({ delayMs: DELAY, sync })

    scheduler.schedule('page-1')
    await vi.advanceTimersByTimeAsync(DELAY) // sync 1 starts
    scheduler.schedule('page-1')
    scheduler.schedule('page-1')
    await vi.advanceTimersByTimeAsync(DELAY * 3) // more changes while sync 1 runs
    expect(sync).toHaveBeenCalledTimes(1)

    finish() // sync 1 done
    await vi.advanceTimersByTimeAsync(0)
    expect(sync).toHaveBeenCalledTimes(2)

    finish()
    await vi.advanceTimersByTimeAsync(DELAY * 3)
    expect(sync).toHaveBeenCalledTimes(2)
  })

  it('keeps working after a sync fails', async () => {
    const { sync, fail, finish } = controllableSync()
    const onError = vi.fn()
    const scheduler = createSyncScheduler({ delayMs: DELAY, sync, onError })

    scheduler.schedule('page-1')
    await vi.advanceTimersByTimeAsync(DELAY)
    fail()
    await vi.advanceTimersByTimeAsync(0)
    expect(onError).toHaveBeenCalledWith('page-1', expect.any(Error))

    scheduler.schedule('page-1')
    await vi.advanceTimersByTimeAsync(DELAY)
    expect(sync).toHaveBeenCalledTimes(2)
    finish()
  })
})
