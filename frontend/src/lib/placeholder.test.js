import { describe, it, expect } from 'vitest'
import { NOTION_LANGUAGES, placeholderFor } from './placeholder.js'

describe('Notion languages', () => {
  it('lists every language a Notion code block accepts, once each', () => {
    expect(NOTION_LANGUAGES).toHaveLength(90)
    expect(new Set(NOTION_LANGUAGES).size).toBe(NOTION_LANGUAGES.length)
    expect(NOTION_LANGUAGES).toEqual(expect.arrayContaining(['plain text', 'python', 'typescript', 'sql', 'java/c/c++/c#']))
  })
})

describe('placeholder', () => {
  it('is a Python example inside a comment', () => {
    const text = placeholderFor('python')

    expect(text).toMatch(/Write your code here/)
    expect(text).toMatch(/def greet\(name\):/)
    expect(text).toMatch(/return f"Hello, \{name\}!"/)
    expect(text.split('\n').every(line => line.startsWith('#'))).toBe(true)
  })

  it.each([
    ['javascript', '//'],
    ['typescript', '//'],
    ['go', '//'],
    ['sql', '--'],
    ['haskell', '--'],
    ['bash', '#'],
    ['yaml', '#'],
    ['clojure', ';'],
    ['latex', '%'],
    ['visual basic', "'"],
    ['fortran', '!'],
  ])('uses %s line comments (%s)', (language, marker) => {
    const lines = placeholderFor(language).split('\n')

    expect(lines.every(line => line.startsWith(marker))).toBe(true)
    expect(lines.join('\n')).toMatch(/def greet/)
  })

  it.each([
    ['html', '<!--', '-->'],
    ['markdown', '<!--', '-->'],
    ['css', '/*', '*/'],
    ['ocaml', '(*', '*)'],
  ])('wraps the example in a %s block comment', (language, open, close) => {
    const text = placeholderFor(language)

    expect(text.startsWith(open)).toBe(true)
    expect(text.endsWith(close)).toBe(true)
    expect(text).toMatch(/def greet/)
  })

  it('has a comment style for every Notion language', () => {
    for (const language of NOTION_LANGUAGES) {
      expect(placeholderFor(language), language).toMatch(/def greet/)
    }
  })

  it('keeps the Python indentation inside the comment', () => {
    expect(placeholderFor('javascript')).toMatch(/^\/\/ {5}return/m)
  })
})
