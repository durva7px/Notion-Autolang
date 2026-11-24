import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'
import Playground from './Playground.jsx'
import { playground } from '../../content/landing.js'
import { languageLabel } from '../../lib/detect.js'

const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const PYTHON = { language: 'python', confidence: 0.63, confident: true }
const languageButton = () => screen.getByRole('button', { name: /language/i })
const editor = () => screen.getByRole('textbox', { name: /code snippet/i })
const status = () => screen.getByRole('status')

let fetchMock
beforeEach(() => {
  fetchMock = vi.fn(async () => reply(PYTHON))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('AutoLang Playground', () => {
  it('detects the sample snippet live when the page loads', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.autolang.test')
    render(<Playground debounceMs={0} />)

    expect(languageButton()).toHaveTextContent('Plain Text')
    await waitFor(() => expect(languageButton()).toHaveTextContent('Python'))

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.autolang.test/detect')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ code: playground.sample })
    expect(init.credentials).toBe('omit')
    expect(status()).toHaveTextContent(/Detected Python/i)
  })

  it('captions the code block the way Notion does', () => {
    render(<Playground debounceMs={0} />)
    const figure = screen.getByRole('figure')
    const caption = within(figure).getByText('Write your code here and AutoLang will detect the language')

    expect(caption.tagName).toBe('FIGCAPTION')
    expect(within(figure).getByRole('textbox', { name: /code snippet/i })).toBeInTheDocument()
    expect(caption.compareDocumentPosition(editor()) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
  })

  it('shows the result as a heading 3, inside the live status region', async () => {
    render(<Playground debounceMs={0} />)

    const heading = await within(status()).findByRole('heading', { level: 3, name: /Detected Python/i })
    expect(heading).toBeInTheDocument()
  })

  it('needs no extension or Notion sign-in', async () => {
    render(<Playground debounceMs={0} />)
    await waitFor(() => expect(languageButton()).toHaveTextContent('Python'))

    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization')
  })

  it('re-detects what the visitor types', async () => {
    render(<Playground debounceMs={0} />)
    await waitFor(() => expect(languageButton()).toHaveTextContent('Python'))

    fetchMock.mockResolvedValueOnce(reply({ language: 'typescript', confidence: 0.8, confident: true }))
    fireEvent.change(editor(), { target: { value: 'const x: number = 1;\nexport type A = { x: number }' } })

    await waitFor(() => expect(languageButton()).toHaveTextContent('TypeScript'))
    expect(JSON.parse(fetchMock.mock.calls.at(-1)[1].body).code).toMatch(/^const x: number/)
  })

  it('waits for a pause in typing before asking', async () => {
    vi.useFakeTimers()
    render(<Playground debounceMs={500} />)
    await act(() => vi.advanceTimersByTimeAsync(500))
    const callsAfterLoad = fetchMock.mock.calls.length

    for (const value of ['f', 'fn', 'fn m', 'fn main() {}']) {
      fireEvent.change(editor(), { target: { value } })
      await act(() => vi.advanceTimersByTimeAsync(100))
    }
    expect(fetchMock.mock.calls.length).toBe(callsAfterLoad)

    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(fetchMock.mock.calls.length).toBe(callsAfterLoad + 1)
    expect(JSON.parse(fetchMock.mock.calls.at(-1)[1].body).code).toBe('fn main() {}')
  })

  it("leaves the language alone when it isn't confident, like in Notion", async () => {
    render(<Playground debounceMs={0} />)
    await waitFor(() => expect(languageButton()).toHaveTextContent('Python'))

    fetchMock.mockResolvedValueOnce(reply({ language: 'dart', confidence: 0, confident: false }))
    fireEvent.change(editor(), { target: { value: 'const a = 1;' } })

    await waitFor(() => expect(status()).toHaveTextContent(/not confident enough/i))
    expect(languageButton()).toHaveTextContent('Python')
  })

  it('asks for code when the block is empty', async () => {
    render(<Playground debounceMs={0} />)
    await waitFor(() => expect(languageButton()).toHaveTextContent('Python'))

    fetchMock.mockResolvedValueOnce(reply({ language: null, confidence: 0, confident: false }))
    fireEvent.change(editor(), { target: { value: '' } })

    await waitFor(() => expect(status()).toHaveTextContent(/type some code/i))
  })

  it('shows only the answer for the latest code when replies arrive out of order', async () => {
    let releaseSlow
    fetchMock
      .mockImplementationOnce(() => new Promise(resolve => { releaseSlow = () => resolve(reply(PYTHON)) }))
      .mockResolvedValueOnce(reply({ language: 'go', confidence: 0.9, confident: true }))
    render(<Playground debounceMs={0} />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    fireEvent.change(editor(), { target: { value: 'package main\n\nfunc main() {}' } })
    await waitFor(() => expect(languageButton()).toHaveTextContent('Go'))
    await act(async () => releaseSlow())

    expect(languageButton()).toHaveTextContent('Go')
  })

  it("says so when AutoLang can't be reached, and keeps the language", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    render(<Playground debounceMs={0} />)

    await waitFor(() => expect(status()).toHaveTextContent(/can.t reach AutoLang/i))
    expect(languageButton()).toHaveTextContent('Plain Text')
  })

  it('asks the visitor to slow down when rate limited', async () => {
    fetchMock.mockResolvedValueOnce(reply({ error: 'Too many requests' }, 429))
    render(<Playground debounceMs={0} />)

    await waitFor(() => expect(status()).toHaveTextContent(/too many tries/i))
  })
})

describe('languageLabel', () => {
  it("shows Notion's language names the way Notion's menu does", () => {
    expect(languageLabel('typescript')).toBe('TypeScript')
    expect(languageLabel('javascript')).toBe('JavaScript')
    expect(languageLabel('c++')).toBe('C++')
    expect(languageLabel('c#')).toBe('C#')
    expect(languageLabel('sql')).toBe('SQL')
    expect(languageLabel('plain text')).toBe('Plain Text')
    expect(languageLabel('python')).toBe('Python')
    expect(languageLabel('elixir')).toBe('Elixir')
  })
})
