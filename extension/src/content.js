// Runs inside Notion tabs. Watches the page and tells the background worker
// whenever a code block is added or edited. Content scripts can't use static
// imports, so the shared helpers are loaded with a dynamic import.
;(async () => {
  const { isCodeBlockChange } = await import(chrome.runtime.getURL('src/notionPage.js'))

  const observer = new MutationObserver(mutations => {
    if (isCodeBlockChange(mutations)) notify()
  })

  function notify() {
    try {
      chrome.runtime.sendMessage({ type: 'code-changed', url: location.href }).catch(() => {})
    } catch {
      // The extension was reloaded or removed; this copy of the script is orphaned.
      observer.disconnect()
    }
  }

  observer.observe(document.body, { childList: true, subtree: true, characterData: true })

  // Sync whatever is on the page when it first opens.
  notify()
})()
