import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, fireEvent, act } from '@testing-library/react'
import App from './App.jsx'

const REPO = 'https://github.com/durva7px/Notion-Autolang'
const PROFILE = 'https://github.com/durva7px'

function renderAt(path) {
  window.history.replaceState(null, '', path)
  return render(<App />)
}

// The landing page's playground calls the backend on load.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })))
})
afterEach(() => vi.unstubAllGlobals())

const header = () => screen.getByRole('banner')
const footer = () => screen.getByRole('contentinfo')

describe.each(['/', '/faq'])('Header on %s', path => {
  it('links to About Us, Demo and Playground sections of the home page', () => {
    renderAt(path)
    const nav = within(header()).getByRole('navigation', { name: 'Main' })

    expect(within(nav).getByRole('link', { name: 'About Us' })).toHaveAttribute('href', '/#about')
    expect(within(nav).getByRole('link', { name: 'Demo' })).toHaveAttribute('href', '/#demo')
    expect(within(nav).getByRole('link', { name: 'Playground' })).toHaveAttribute('href', '/#playground')
  })

  it('has FAQ where Account used to be', () => {
    renderAt(path)

    expect(within(header()).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq')
    expect(within(header()).queryByRole('link', { name: /Account/i })).toBeNull()
  })

  it('no longer shows Support or Resources', () => {
    renderAt(path)

    expect(within(header()).queryByRole('link', { name: /Support|Resources/i })).toBeNull()
  })
})

describe('Sticky header', () => {
  const scrollTo = y => {
    window.scrollY = y
    fireEvent.scroll(window)
  }
  afterEach(() => {
    window.scrollY = 0
  })

  it('stays flat at the top of the page and lifts off the content once scrolled', () => {
    renderAt('/')
    expect(header()).toHaveAttribute('data-scrolled', 'false')

    act(() => scrollTo(400))
    expect(header()).toHaveAttribute('data-scrolled', 'true')

    act(() => scrollTo(0))
    expect(header()).toHaveAttribute('data-scrolled', 'false')
  })

  it('starts lifted when the page opens part-way down, e.g. at /#demo', () => {
    window.scrollY = 900
    renderAt('/faq')

    expect(header()).toHaveAttribute('data-scrolled', 'true')
  })
})

describe('Arriving on the home page from another page', () => {
  it('scrolls to the section named in the link, e.g. /#demo from the FAQ', () => {
    const scrolled = []
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function () {
      scrolled.push(this.id)
    }
    try {
      renderAt('/#demo')
    } finally {
      Element.prototype.scrollIntoView = original
    }

    expect(scrolled).toEqual(['demo'])
  })
})

describe.each(['/', '/faq'])('Footer on %s', path => {
  it('links to the GitHub repository in a new tab', () => {
    renderAt(path)
    const link = within(footer()).getByRole('link', { name: /GitHub Repository/i })

    expect(link).toHaveAttribute('href', REPO)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it("links Developer Connect to the developer's GitHub profile in a new tab", () => {
    renderAt(path)
    const link = within(footer()).getByRole('link', { name: /Developer Connect/i })

    expect(link).toHaveAttribute('href', PROFILE)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('puts the two links on either side of the copyright', () => {
    renderAt(path)
    const repo = within(footer()).getByRole('link', { name: /GitHub Repository/i })
    const copyright = within(footer()).getByText(/All rights reserved/i)
    const profile = within(footer()).getByRole('link', { name: /Developer Connect/i })

    expect(repo.compareDocumentPosition(copyright) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(copyright.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('drops Help, Support and Contact Us', () => {
    renderAt(path)

    expect(within(footer()).queryByRole('link', { name: /Help|Support|Contact/i })).toBeNull()
  })
})
