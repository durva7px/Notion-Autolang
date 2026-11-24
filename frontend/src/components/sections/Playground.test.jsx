import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'
import Playground from './Playground.jsx'
import { languageLabel } from '../../lib/detect.js'
import { NOTION_LANGUAGES } from '../../lib/placeholder.js'

const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const PYTHON = { language: 'python', confidence: 0.63, confident: true }
const PYTHON_CODE = 'def average(numbers):\n    return sum(numbers) / len(numbers)'
const languageButton = () => screen.getByRole('button', { name: /^Language:/ })
const editor = () => screen.getByRole('textbox', { name: /code snippet/i })
const status = () => screen.getByRole('status')
// The demo-style popup next to the language label (hidden from screen readers; the status region speaks instead).
const popup = () => document.querySelector('[data-popup]')
const type = value => fireEvent.change(editor(), { target: { value } })

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
  it('starts as an empty Plain Text block with a Python example in a comment as its placeholder', () => {
    render(<Playground debounceMs={0} />)

    expect(languageButton()).toHaveTextContent('Plain Text')
    expect(editor()).toHaveValue('')
    expect(editor().placeholder).toMatch(/def greet\(name\):/)
    expect(editor().placeholder.split('\n').every(line => line.startsWith('#'))).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('captions the code block the way Notion does', () => {
    render(<Playground debounceMs={0} />)
    const figure = screen.getByRole('figure')
    const caption = within(figure).getByText('Write your code here and AutoLang will detect the language')

    expect(caption.tagName).toBe('FIGCAPTION')
    expect(within(figure).getByRole('textbox', { name: /code snippet/i })).toBeInTheDocument()
    expect(caption.compareDocumentPosition(editor()) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
  })

  it('has no separate result text under the block', async () => {
    render(<Playground debounceMs={0} />)
    type(PYTHON_CODE)
    await waitFor(() => expect(languageButton()).toHaveTextContent('Python'))

    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
  })

  it('detects what the visitor types and pops up the result, like the demo video', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.autolang.test')
    render(<Playground debounceMs={0} />)

    type(PYTHON_CODE)

    await waitFor(() => expect(languageButton()).toHaveTextContent('Python'))
    expect(popup()).toHaveTextContent('AutoLang detected Python')
    expect(status()).toHaveTextContent(/AutoLang detected Python/i)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.autolang.test/detect')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ code: PYTHON_CODE })
    expect(init.credentials).toBe('omit')
    expect(init.headers).not.toHaveProperty('Authorization')
  })

  it('hides the popup the moment the visitor types again', async () => {
    render(<Playground debounceMs={500} />)
    type(PYTHON_CODE)
    await waitFor(() => expect(popup()).not.toBeNull(), { timeout: 2000 })

    type(`${PYTHON_CODE}\n`)

    expect(popup()).toBeNull()
  })

  it('lets the popup fade away by itself after a couple of seconds', async () => {
    vi.useFakeTimers()
    render(<Playground debounceMs={0} />)
    type(PYTHON_CODE)
    await act(() => vi.advanceTimersByTimeAsync(10))
    expect(popup()).not.toBeNull()

    await act(() => vi.advanceTimersByTimeAsync(3000))

    expect(popup()).toBeNull()
  })

  it('waits for a pause in typing before asking', async () => {
    vi.useFakeTimers()
    render(<Playground debounceMs={500} />)

    for (const value of ['f', 'fn', 'fn m', 'fn main() {}']) {
      type(value)
      await act(() => vi.advanceTimersByTimeAsync(100))
    }
    expect(fetchMock).not.toHaveBeenCalled()

    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).code).toBe('fn main() {}')
  })

  it("leaves the language alone and shows no popup when it isn't confident, like in Notion", async () => {
    fetchMock.mockResolvedValueOnce(reply({ language: 'dart', confidence: 0, confident: false }))
    render(<Playground debounceMs={0} />)

    type('const a = 1;')

    await waitFor(() => expect(status()).toHaveTextContent(/not confident enough/i))
    expect(languageButton()).toHaveTextContent('Plain Text')
    expect(popup()).toBeNull()
  })

  it("doesn't ask when the block is emptied, and shows the placeholder again", async () => {
    vi.useFakeTimers()
    render(<Playground debounceMs={500} />)
    type('x')
    type('')

    await act(() => vi.advanceTimersByTimeAsync(1000))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(editor()).toHaveValue('')
  })

  it('shows only the answer for the latest code when replies arrive out of order', async () => {
    let releaseSlow
    fetchMock
      .mockImplementationOnce(() => new Promise(resolve => { releaseSlow = () => resolve(reply(PYTHON)) }))
      .mockResolvedValueOnce(reply({ language: 'go', confidence: 0.9, confident: true }))
    render(<Playground debounceMs={0} />)
    type(PYTHON_CODE)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    type('package main\n\nfunc main() {}')
    await waitFor(() => expect(languageButton()).toHaveTextContent('Go'))
    await act(async () => releaseSlow())

    expect(languageButton()).toHaveTextContent('Go')
  })

  it("pops up a warning when AutoLang can't be reached, and keeps the language", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    render(<Playground debounceMs={0} />)
    type(PYTHON_CODE)

    await waitFor(() => expect(popup()).toHaveTextContent(/can.t reach AutoLang/i))
    expect(popup()).toHaveAttribute('data-popup', 'error')
    expect(status()).toHaveTextContent(/can.t reach AutoLang/i)
    expect(languageButton()).toHaveTextContent('Plain Text')
  })

  it('asks the visitor to slow down when rate limited', async () => {
    fetchMock.mockResolvedValueOnce(reply({ error: 'Too many requests' }, 429))
    render(<Playground debounceMs={0} />)
    type(PYTHON_CODE)

    await waitFor(() => expect(popup()).toHaveTextContent(/too many tries/i))
  })
})

describe('Playground language menu', () => {
  const openMenu = () => fireEvent.click(languageButton())
  const menu = () => screen.getByRole('listbox', { name: /languages/i })

  it('opens from the language label and lists every language Notion supports', () => {
    render(<Playground debounceMs={0} />)

    openMenu()

    expect(languageButton()).toHaveAttribute('aria-expanded', 'true')
    const options = within(menu()).getAllByRole('option')
    expect(options).toHaveLength(NOTION_LANGUAGES.length)
    expect(within(menu()).getByRole('option', { name: 'Plain Text' })).toHaveAttribute('aria-selected', 'true')
  })

  it('switches the language and the placeholder comment to match', () => {
    render(<Playground debounceMs={0} />)
    openMenu()

    fireEvent.click(within(menu()).getByRole('option', { name: 'JavaScript' }))

    expect(languageButton()).toHaveTextContent('JavaScript')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(editor().placeholder.split('\n').every(line => line.startsWith('//'))).toBe(true)
    expect(editor().placeholder).toMatch(/def greet/)
  })

  it('filters the list as the visitor searches', () => {
    render(<Playground debounceMs={0} />)
    openMenu()

    fireEvent.change(screen.getByRole('searchbox', { name: /search languages/i }), { target: { value: 'script' } })

    const names = within(menu()).getAllByRole('option').map(option => option.textContent)
    expect(names).toEqual(expect.arrayContaining(['JavaScript', 'TypeScript', 'CoffeeScript']))
    expect(names).not.toContain('Python')
  })

  it('picks the first match with Enter and closes with Escape', () => {
    render(<Playground debounceMs={0} />)
    openMenu()
    const search = screen.getByRole('searchbox', { name: /search languages/i })

    fireEvent.change(search, { target: { value: 'rust' } })
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(languageButton()).toHaveTextContent('Rust')

    openMenu()
    fireEvent.keyDown(screen.getByRole('searchbox', { name: /search languages/i }), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(languageButton()).toHaveTextContent('Rust')
  })

  it('still lets AutoLang change a language the visitor picked once they type', async () => {
    render(<Playground debounceMs={0} />)
    openMenu()
    fireEvent.click(within(menu()).getByRole('option', { name: 'Ruby' }))

    type(PYTHON_CODE)

    await waitFor(() => expect(languageButton()).toHaveTextContent('Python'))
  })

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
