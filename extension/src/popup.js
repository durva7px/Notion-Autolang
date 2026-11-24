// Popup: asks the background worker for the status and draws it. The status
// lives in chrome.storage.session, so the popup also redraws when it changes
// (for example when sign-in finishes in another tab).
import { renderPopup } from './popupView.js'

const root = document.getElementById('root')

async function send(type) {
  const response = await chrome.runtime.sendMessage({ type })
  if (!response?.ok) throw new Error(response?.error ?? 'No response from AutoLang')
  return response.result
}

const actions = {
  async connect() {
    await send('connect')
    window.close()
  },
  async disconnect() {
    draw(await send('disconnect'))
  },
  async retry() {
    draw(null)
    draw(await send('get-status'))
  },
}

function draw(view) {
  renderPopup(root, view, actions)
}

chrome.storage.session.onChanged.addListener(changes => {
  if (changes.status) draw(changes.status.newValue)
})

actions.retry().catch(error => {
  root.textContent = `Something went wrong: ${error.message}`
})
