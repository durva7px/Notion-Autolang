// Draws the popup for a status view (see status.js). Pure DOM, no chrome.* calls,
// so it can be tested in jsdom. `actions`: { connect, disconnect, retry }.

export function renderPopup(root, view, actions, { now = Date.now() } = {}) {
  root.replaceChildren(...content(view, actions, now))
}

function content(view, actions, now) {
  if (!view) return [paragraph('Checking your connection…', 'muted')]

  const { connection, lastSync } = view

  if (connection.state === 'offline') {
    const command = el('code', {}, 'npm start --prefix backend')
    return [
      heading('Backend not running', 'warn'),
      paragraph(["AutoLang can't reach its backend. Start it with ", command, ', then try again.']),
      button('Try again', actions.retry),
    ]
  }

  if (connection.state !== 'connected') {
    return [
      heading('Not connected', 'warn'),
      paragraph('Connect your Notion workspace so AutoLang can set the language of your code blocks.'),
      button('Connect Notion', actions.connect, 'primary'),
    ]
  }

  return [
    heading('Connected', 'ok'),
    el('p', { className: 'workspace' }, connection.workspaceName),
    syncLine(lastSync, now),
    button('Disconnect', actions.disconnect, 'quiet'),
  ]
}

function syncLine(lastSync, now) {
  if (!lastSync) return paragraph('Open a Notion page and edit a code block to get started.', 'muted')
  if (!lastSync.ok) return paragraph(`Last sync failed: ${lastSync.error}`, 'error')
  const blocks = lastSync.updated === 1 ? '1 block' : `${lastSync.updated} blocks`
  return paragraph(`Last sync ${ago(lastSync.at, now)}: ${blocks} updated`, 'muted')
}

function ago(at, now) {
  const minutes = Math.floor((now - at) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`
}

const heading = (text, tone) => el('h1', { className: `status ${tone}` }, text)
const paragraph = (children, className = '') => el('p', { className }, children)

function button(label, onClick, variant = 'secondary') {
  const node = el('button', { type: 'button', className: variant }, label)
  node.addEventListener('click', onClick)
  return node
}

// Text always goes in as text nodes, never as HTML.
function el(tag, props, children) {
  const node = Object.assign(document.createElement(tag), props)
  node.append(...[children].flat())
  return node
}
