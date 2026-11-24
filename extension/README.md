# Notion AutoLang extension

Watches Notion pages while you write. When a code block is added or edited and
you pause for 2 seconds, it asks the backend to sync that page
(`POST /pages/:pageId/sync`). The backend sets the language of new and edited
code blocks it is confident about, and never touches a block whose language you
picked by hand.

## Try it locally (Chrome)

1. Start the backend: `npm start` in `backend/` (runs on `http://localhost:3000`).
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**
   and pick this `extension/` folder.
3. Click the extension's icon, then **Connect Notion**, and approve.
4. Open a Notion page you shared with AutoLang, add a code block and type some
   code. About 2 seconds after you stop, its language should change.

## The popup and badge

The popup shows **Connected** (with the workspace and the last sync),
**Not connected** (with a **Connect Notion** button) or **Backend not running**.
The icon shows a `!` when something needs you: magenta for "connect" or
"start the backend", amber for "the last sync failed". Hover it for the reason.

Pages that were already open keep working:
- Installing or reloading the extension adds it to open Notion tabs.
- Connecting syncs every open Notion page straight away.

To see what it's doing, click **service worker** on the extension's card in
`chrome://extensions`: synced changes and errors are logged as `[AutoLang] …`.
After editing the extension's files, click the reload icon on its card.

To see every popup state at once without loading the extension:
`npm run preview:popup`, then open <http://localhost:5180/dev/popup-preview.html>.

## Publish to the Chrome Web Store

1. Set `API_URL` in `src/config.js` to the deployed backend, and raise `version` in `manifest.json` (every upload needs a higher version).
2. `npm run build:store` in this folder. It writes `dist/notion-autolang-<version>.zip` with `manifest.json`, `src/` and `icons/` only, and drops `localhost` from `host_permissions` in the zipped manifest. It stops with a list of problems if `API_URL` is still local, the backend isn't in `host_permissions`, or icons are missing.
3. Optional: unzip it and use **Load unpacked** on the folder to try exactly what you'll upload.
4. Upload the zip in the Chrome Web Store Developer Dashboard. Privacy policy URL: `https://notion-autolang.vercel.app/privacy`.

`dist/` and `*.zip` are git-ignored.

## Files

- `manifest.json`: runs `src/content.js` on Notion; adds the popup and icons; lets the extension call the deployed backend and, in development, `localhost:3000`.
- `icons/`: the toolbar and store icons. `icon.svg` is the source; the PNGs are rendered from it.
- `scripts/build-store.js`: builds the Chrome Web Store zip (`npm run build:store`).
- `src/content.js`: watches the page and reports code-block changes.
- `src/background.js`: waits for a pause, then calls the backend; keeps the badge current; handles Connect/Disconnect.
- `src/popup.html`, `popup.js`, `popup.css`: the popup. Drawing is in `popupView.js`.
- `src/connection.js`: sign-in status, connect address, disconnect.
- `src/status.js`: badge rules, and re-syncing open pages after connecting.
- `src/notionPage.js`: page id from the URL, "did a code block change?". Notion's markup lives here only.
- `src/syncScheduler.js`: the wait-for-a-pause, one-sync-at-a-time logic.
- `src/syncClient.js`: the request to the backend.
- `src/config.js`: backend address and delay.

Tests: `npm test` in this folder. See `backend/tests.md`.
