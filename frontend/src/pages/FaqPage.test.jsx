import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App.jsx'
import { faqs } from '../content/faq.js'

function renderFaq() {
  window.history.replaceState(null, '', '/faq')
  return render(<App />)
}

describe('FAQ page (/faq)', () => {
  it('has its own heading and not the landing page', () => {
    renderFaq()

    expect(screen.getByRole('heading', { level: 1, name: /Frequently asked questions/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /How to Use/i })).toBeNull()
  })

  it('answers at least 10 questions', () => {
    renderFaq()

    expect(faqs.length).toBeGreaterThanOrEqual(10)
    for (const { question } of faqs) {
      expect(screen.getByText(question)).toBeInTheDocument()
    }
  })

  it('covers privacy and Notion workspace access', () => {
    const questions = faqs.map(f => f.question).join('\n')

    expect(questions).toMatch(/store my code/i)
    expect(questions).toMatch(/workspace/i)
    expect(questions).toMatch(/access token/i)
    expect(questions).toMatch(/disconnect/i)
  })

  it('shows an answer when its question is opened', async () => {
    renderFaq()
    const [first] = faqs
    const summary = screen.getByText(first.question)
    const details = summary.closest('details')

    expect(details.open).toBe(false)
    await userEvent.click(summary)
    expect(details.open).toBe(true)
  })

  it('gives every question a link-able anchor', () => {
    renderFaq()

    const ids = [...document.querySelectorAll('details[id]')].map(d => d.id)
    expect(ids).toHaveLength(faqs.length)
    expect(new Set(ids).size).toBe(faqs.length)
  })

  it('sets the browser tab title', () => {
    renderFaq()

    expect(document.title).toMatch(/FAQ/)
  })
})
