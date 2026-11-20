// Reading Notion's page: which page is open, and whether a change touched a code block.
// Notion's markup isn't a public API; if it changes, this is the one file to update.

export const CODE_BLOCK_SELECTOR = '.notion-code-block'

const PAGE_ID = /([0-9a-f]{32})$/i

/**
 * The id of the page being edited, in the dashed form Notion's API uses, or null.
 * A page open in a side peek (`?p=`) wins over the page behind it.
 */
export function pageIdFromUrl(href) {
  let url
  try {
    url = new URL(href)
  } catch {
    return null
  }

  const peek = url.searchParams.get('p')
  const raw = (peek && PAGE_ID.exec(peek)?.[1]) || PAGE_ID.exec(url.pathname)?.[1]
  return raw ? dashed(raw.toLowerCase()) : null
}

function dashed(hex) {
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}

/** True when any MutationObserver record touched (or added) a code block. */
export function isCodeBlockChange(mutations) {
  return mutations.some(
    mutation => insideCodeBlock(mutation.target) || [...mutation.addedNodes].some(containsCodeBlock)
  )
}

function insideCodeBlock(node) {
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
  return Boolean(element?.closest(CODE_BLOCK_SELECTOR))
}

function containsCodeBlock(node) {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node.matches(CODE_BLOCK_SELECTOR) || node.querySelector(CODE_BLOCK_SELECTOR) !== null)
  )
}
