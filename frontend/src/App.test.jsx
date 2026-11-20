import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App.jsx'

function renderAt(path) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Step 01: Sign Up to Authorize Workspace', () => {
  it('links to the backend Notion auth, asking to come back to this site', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.autolang.test')
    renderAt('/')

    const link = screen.getByRole('link', { name: /Sign Up to Authorize Workspace/i })
    const href = new URL(link.getAttribute('href'))

    expect(href.origin + href.pathname).toBe('https://api.autolang.test/auth/notion')
    expect(href.searchParams.get('return_to')).toBe(window.location.origin)
  })

  it('defaults to the local backend when no API URL is configured', () => {
    vi.stubEnv('VITE_API_URL', '')
    renderAt('/')

    const link = screen.getByRole('link', { name: /Sign Up to Authorize Workspace/i })

    expect(link.getAttribute('href')).toMatch(/^http:\/\/localhost:3000\/auth\/notion\?/)
  })

  it('leaves the other steps as plain cards', () => {
    renderAt('/')

    expect(screen.queryByRole('link', { name: /Download extension/i })).toBeNull()
    expect(screen.getByText(/Download extension and enable/i)).toBeInTheDocument()
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

  it('points to the next step: installing the extension', () => {
    renderAt(connectedUrl())

    expect(screen.getByText(/Download extension and enable/i)).toBeInTheDocument()
  })

  it('explains a cancelled authorization and lets the user try again', () => {
    renderAt('/?notion=error&reason=access_denied')

    expect(screen.getByRole('heading', { name: /couldn.t connect/i })).toBeInTheDocument()
    expect(screen.getByText(/cancelled/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Try again/i }).getAttribute('href')).toMatch(
      /\/auth\/notion\?return_to=/
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
