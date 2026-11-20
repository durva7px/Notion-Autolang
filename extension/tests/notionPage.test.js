import { describe, it, expect } from 'vitest'
import { pageIdFromUrl, isCodeBlockChange } from '../src/notionPage.js'

const HEX = '1a2b3c4d5e6f40718293a4b5c6d7e8f9'
const DASHED = '1a2b3c4d-5e6f-4071-8293-a4b5c6d7e8f9'
const PEEK = 'ffffffffeeeeddddccccbbbbbbbbbbbb'

describe('pageIdFromUrl', () => {
  it.each([
    ['a titled page on notion.so', `https://www.notion.so/My-Snippets-${HEX}`],
    ['a page inside a workspace path', `https://www.notion.so/durva/My-Snippets-${HEX}`],
    ["Notion's app.notion.com page links", `https://app.notion.com/p/My-Snippets-${HEX}`],
    ['a bare page id', `https://www.notion.so/${HEX}`],
    ['a link to a block on the page', `https://www.notion.so/My-Snippets-${HEX}#${PEEK}`],
    ['a page with a view query', `https://www.notion.so/My-Snippets-${HEX}?v=${PEEK}`],
  ])('reads the page id from %s, in the dashed form the API uses', (_, url) => {
    expect(pageIdFromUrl(url)).toBe(DASHED)
  })

  it('uses the page open in a side peek, since that is the one being edited', () => {
    expect(pageIdFromUrl(`https://www.notion.so/Board-${HEX}?p=${PEEK}&pm=s`)).toBe(
      'ffffffff-eeee-dddd-cccc-bbbbbbbbbbbb'
    )
  })

  it.each(['https://www.notion.so/', 'https://app.notion.com/login', 'not a url'])(
    'returns null when no page is open: %s',
    url => {
      expect(pageIdFromUrl(url)).toBeNull()
    }
  )
})

describe('isCodeBlockChange', () => {
  function page(html) {
    document.body.innerHTML = html
    return document.body
  }

  it('is true when text inside a code block changes', () => {
    page('<div class="notion-code-block"><div contenteditable><span>print(1)</span></div></div>')
    const text = document.querySelector('span').firstChild

    expect(isCodeBlockChange([{ type: 'characterData', target: text, addedNodes: [] }])).toBe(true)
  })

  it('is true when a code block is added to the page', () => {
    page('<div id="root"></div>')
    const block = document.createElement('div')
    block.innerHTML = '<div class="notion-code-block">x</div>'

    expect(
      isCodeBlockChange([{ type: 'childList', target: document.getElementById('root'), addedNodes: [block] }])
    ).toBe(true)
  })

  it('is false for changes elsewhere on the page', () => {
    page('<div class="notion-text-block"><span>hello</span></div>')
    const text = document.querySelector('span').firstChild

    expect(isCodeBlockChange([{ type: 'characterData', target: text, addedNodes: [] }])).toBe(false)
  })
})
