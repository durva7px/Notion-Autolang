# Notion AutoLang extension

Watches Notion pages while you write. When a code block is added or edited and
you pause for 2 seconds, it asks the backend to sync that page
(`POST /pages/:pageId/sync`). The backend sets the language of new and edited
code blocks it is confident about, and never touches a block whose language you
picked by hand.

## Try it locally (Chrome)

1. Start the backend: `npm start` in `backend/` (runs on `http://localhost:3000`).
2. In **the same Chrome**, open `http://localhost:3000/auth/notion` and approve.
   The extension uses this sign-in's cookie.
3. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**
   and pick this `extension/` folder.
4. Open a Notion page you shared with AutoLang, add a code block and type some
   code. About 2 seconds after you stop, its language should change.

To see what it's doing, click **service worker** on the extension's card in
`chrome://extensions`: synced changes and errors are logged as `[AutoLang] …`.
After editing the extension's files, click the reload icon on its card and
refresh the Notion tab.

## Files

- `manifest.json`: runs `src/content.js` on Notion; lets the extension call the local backend.
- `src/content.js`: watches the page and reports code-block changes.
- `src/background.js`: waits for a pause, then calls the backend.
- `src/notionPage.js`: page id from the URL, "did a code block change?". Notion's markup lives here only.
- `src/syncScheduler.js`: the wait-for-a-pause, one-sync-at-a-time logic.
- `src/syncClient.js`: the request to the backend.
- `src/config.js`: backend address and delay.

Tests: `npm test` in this folder. See `backend/tests.md`.
