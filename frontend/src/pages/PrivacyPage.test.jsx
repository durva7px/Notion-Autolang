import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App.jsx'

function renderPrivacy() {
  window.history.replaceState(null, '', '/privacy')
  return render(<App />)
}

const pageText = () => document.querySelector('main').textContent

describe('Privacy policy page (/privacy)', () => {
  it('has its own heading and not the landing page', () => {
    renderPrivacy()

    expect(screen.getByRole('heading', { level: 1, name: /Privacy policy/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /How to Use/i })).toBeNull()
  })

  it('also opens with a trailing slash', () => {
    window.history.replaceState(null, '', '/privacy/')
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: /Privacy policy/i })).toBeInTheDocument()
  })

  it('says when it took effect', () => {
    renderPrivacy()

    expect(pageText()).toMatch(/Effective\s+24 November 2026/)
  })

  it('explains what the extension sends and what the backend keeps', () => {
    renderPrivacy()
    const text = pageText()

    expect(text).toMatch(/page.{0,20}ID/i)
    expect(text).toMatch(/access token/i)
    expect(text).toMatch(/7 days/)
    expect(text).toMatch(/SHA-256/)
    expect(text).toMatch(/Playground/)
  })

  it('names who processes the data', () => {
    renderPrivacy()
    const text = pageText()

    expect(text).toMatch(/Notion/)
    expect(text).toMatch(/Amazon Web Services|AWS/)
    expect(text).toMatch(/Vercel/)
  })

  it('makes the Chrome Web Store commitments: no selling, Limited Use', () => {
    renderPrivacy()
    const text = pageText()

    expect(text).toMatch(/not sell/i)
    expect(text).toMatch(/Chrome Web Store User Data Policy/)
    expect(text).toMatch(/Limited Use/)
  })

  it('tells people how to delete their data and how to get in touch', () => {
    renderPrivacy()

    expect(pageText()).toMatch(/Disconnect/)
    expect(screen.getByRole('link', { name: /GitHub issue/i }))
      .toHaveAttribute('href', 'https://github.com/durva7px/Notion-Autolang/issues')
  })

  it('sets the browser tab title', () => {
    renderPrivacy()

    expect(document.title).toBe('Privacy policy · Notion AutoLang')
  })
})
