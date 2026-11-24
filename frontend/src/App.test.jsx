import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import App from './App.jsx'

function renderAt(path) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('How to Use', () => {
  const stepTitles = () =>
    within(document.getElementById('how-to-use'))
      .getAllByRole('heading', { level: 3 })
      .map(h => h.textContent.trim())

  it('starts with downloading the extension, then connecting Notion from it', () => {
    renderAt('/')

    const [first, second, third] = stepTitles()
    expect(first).toMatch(/Download the extension/i)
    expect(second).toMatch(/Connect Notion from the extension/i)
    expect(third).toMatch(/Start writing code/i)
  })

  it('no longer sends people to Notion auth from the website', () => {
    renderAt('/')

    const links = within(document.getElementById('how-to-use')).queryAllByRole('link')
    expect(links.filter(a => a.getAttribute('href')?.includes('/auth/notion'))).toEqual([])
  })
})

describe('Demo video', () => {
  const demoVideo = () => document.querySelector('#demo video')

  it('plays the recorded demo in the demo section', () => {
    renderAt('/')

    const video = demoVideo()
    expect(video).not.toBeNull()
    expect(video.getAttribute('src')).toMatch(/autolang-demo-light.*\.mp4$/)
    expect(video.getAttribute('poster')).toMatch(/autolang-demo-light-poster/)
  })

  it('loops silently inline so it can autoplay, with controls to pause it', () => {
    renderAt('/')

    const video = demoVideo()
    expect(video.muted).toBe(true)
    expect(video.loop).toBe(true)
    expect(video).toHaveAttribute('playsinline')
    expect(video).toHaveAttribute('controls')
    expect(video.autoplay).toBe(true)
  })

  it('does not autoplay for people who prefer reduced motion', () => {
    const original = window.matchMedia
    window.matchMedia = query => ({ ...original(query), matches: query.includes('reduce') })
    try {
      renderAt('/')
      expect(demoVideo().autoplay).toBe(false)
    } finally {
      window.matchMedia = original
    }
  })

  it('describes the video for screen readers', () => {
    renderAt('/')

    expect(demoVideo()).toHaveAccessibleName(/code block/i)
  })
})

describe('Returning from Notion auth', () => {
  const connectedUrl = (open = 'https://www.notion.so/Shared-abc') =>
    `/?${new URLSearchParams({ notion: 'connected', workspace: "Durva's Notion", open })}`

  it('shows the connected message with the workspace name', () => {
    renderAt(connectedUrl())

    expect(screen.getByRole('heading', { name: /Notion workspace connected/i })).toBeInTheDocument()
    expect(screen.getByText("Durva's Notion")).toBeInTheDocument()
  })

  it('offers an Open workspace button that opens the connected workspace', () => {
    renderAt(connectedUrl())

    const open = screen.getByRole('link', { name: /Open workspace/i })
    expect(open).toHaveAttribute('href', 'https://www.notion.so/Shared-abc')
    expect(open).toHaveAttribute('target', '_blank')
    expect(open).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('never links anywhere but notion.so, whatever the URL says', () => {
    renderAt(connectedUrl('javascript:alert(1)'))

    expect(screen.getByRole('link', { name: /Open workspace/i })).toHaveAttribute(
      'href',
      'https://www.notion.so/'
    )
  })

  it('marks step 02 (connecting from the extension) as done', () => {
    renderAt(connectedUrl())

    expect(screen.getByText(/Step 02 complete/i)).toBeInTheDocument()
  })

  it('points only to what is left: writing code in Notion', () => {
    renderAt(connectedUrl())

    expect(screen.getByText(/Start writing code/i)).toBeInTheDocument()
    expect(screen.queryByText(/Download the extension/i)).toBeNull()
    expect(screen.queryByText(/Connect Notion from the extension/i)).toBeNull()
  })

  it('explains a cancelled authorization and lets the user try again', () => {
    renderAt('/?notion=error&reason=access_denied')

    expect(screen.getByRole('heading', { name: /couldn.t connect/i })).toBeInTheDocument()
    expect(screen.getByText(/cancelled/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Try again/i }).getAttribute('href')).toMatch(
      /\/auth\/notion\?return_to=/
    )
  })

  it('sends Try again to the configured backend, asking to come back to this site', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.autolang.test')
    renderAt('/?notion=error&reason=access_denied')

    const href = new URL(screen.getByRole('link', { name: /Try again/i }).getAttribute('href'))
    expect(href.origin + href.pathname).toBe('https://api.autolang.test/auth/notion')
    expect(href.searchParams.get('return_to')).toBe(window.location.origin)
  })

  it('defaults Try again to the local backend when no API URL is configured', () => {
    vi.stubEnv('VITE_API_URL', '')
    renderAt('/?notion=error&reason=access_denied')

    expect(screen.getByRole('link', { name: /Try again/i }).getAttribute('href')).toMatch(
      /^http:\/\/localhost:3000\/auth\/notion\?/
    )
  })

  it('shows a generic message for other errors', () => {
    renderAt('/?notion=error&reason=token_exchange_failed')

    expect(screen.getByRole('heading', { name: /couldn.t connect/i })).toBeInTheDocument()
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('shows the normal landing page without auth parameters', () => {
    renderAt('/')

    expect(screen.queryByRole('heading', { name: /Notion workspace connected/i })).toBeNull()
    expect(screen.getByRole('heading', { name: /How to Use/i })).toBeInTheDocument()
  })
})

describe('Open workspace link hosts', () => {
  const openHref = open => {
    renderAt(`/?${new URLSearchParams({ notion: 'connected', workspace: 'W', open })}`)
    return screen.getByRole('link', { name: /Open workspace/i }).getAttribute('href')
  }

  it("keeps Notion's current app.notion.com links", () => {
    expect(openHref('https://app.notion.com/p/Snippets-abc123')).toBe(
      'https://app.notion.com/p/Snippets-abc123'
    )
  })

  it('rejects look-alike hosts', () => {
    expect(openHref('https://notion.com.evil.example/p/x')).toBe('https://www.notion.so/')
  })
})
