# Tests

Backend, frontend and extension tests. Backend tests run from `backend/`:

```bash
npm test            # run once
npm run test:watch  # re-run on save
```

Stack: [vitest](https://vitest.dev) + [supertest](https://github.com/ladjs/supertest). 82 tests, 10 files. Frontend: 12 tests, 1 file ([see below](#frontend-frontendsrcapptestjsx)). Extension: 54 tests, 6 files ([see below](#extension-extensiontests)).

## Seams under test

We agreed to test at three seams only. Each is a public interface; tests never reach past them.

| Seam | What's real | What's faked |
|---|---|---|
| **HTTP API** (`createApp`) | Express, sessions, cookies, routing, HTML | Notion's token endpoint (injected `fetch`) and the Notion SDK client (injected `createNotionClient`) |
| **Language detection** (`detectLanguage`, `detectLanguageWithConfidence`, `detectLanguageWithHighlight`) | flourite and highlight.js | nothing |
| **Page processor** (`previewPage`, `applyLanguageChanges`) | detection, pagination, nesting | the Notion SDK client (`tests/fake-notion.js`) |
| **Block state store** (`get`, `set`) | the in-memory store | nothing |
| **Website** (`<App />` in `frontend/`, rendered for a given URL) | React components, routing on the query string | nothing (jsdom stands in for the browser; `VITE_API_URL` is stubbed) |
| **Extension modules** (`notionPage`, `syncScheduler`, `syncClient`, `connection`, `status`, `popupView` in `extension/src/`) | URL parsing, DOM checks, timing logic, badge and popup rendering | timers (vitest fake timers), `fetch`, `chrome.storage.session` (an in-memory store), the DOM (jsdom) |

Plus one **smoke test** that boots `server.js` in plain Node, because vitest's module loader hides ESM/CommonJS import errors that crash the real server.

## Test helpers

- `tests/helpers.js`: `buildTestApp(overrides)` builds the app with test config. `fakeTokenEndpoint()` stands in for `fetch` against `https://api.notion.com/v1/oauth/token`. `startOAuth(agent)` begins the flow and returns the `state`. `connectedAgent(app)` returns a supertest agent whose session has finished OAuth.
- `tests/fake-notion.js`: an in-memory Notion client (`search`, `pages.retrieve`, `blocks.children.list` with real cursor pagination, `blocks.update`) plus block builders `codeBlock`, `paragraph`, `toggle`.

---

## `tests/server.smoke.test.js`: server boots

| Test | Checks |
|---|---|
| starts in plain Node and answers /health | `node server.js` starts with required env vars and `GET /health` returns `200 {status:"ok"}`. Guards against the Notion SDK's CommonJS named-import crash that vitest doesn't catch. |

## `tests/health.test.js`: `GET /health`

| Test | Checks |
|---|---|
| reports the server is healthy as JSON | 200 with `{ status: "ok", message: "Server is healthy!" }`, and only one response is sent (the old code sent two and threw). |

## `tests/auth.test.js`: Notion OAuth

### `GET /auth/notion`
| Test | Checks |
|---|---|
| redirects to Notion's public OAuth page with the integration's details | 302 to `https://api.notion.com/v1/oauth/authorize` with `client_id`, `redirect_uri`, `response_type=code`, `owner=user` and a 64-hex-char `state`. |
| sets a session cookie so the state can be checked on return | An `autolang.sid` cookie is set. |

### `GET /auth/notion/callback`
| Test | Checks |
|---|---|
| exchanges the code for a token and sends the user to the connected page | POSTs to Notion's token URL with Basic auth (`client_id:client_secret`) and the `authorization_code` body, then 302 to `/connected`. |
| rejects a callback whose state doesn't match the session | 400, and the token endpoint is never called (CSRF protection). |
| rejects a callback that arrives without starting the flow | 400 when the session has no stored state. |
| explains when the user cancels on Notion's page | `?error=access_denied` gives 400 with a "cancelled or denied" message. |
| reports a bad gateway when Notion refuses the code | Token endpoint error gives 502. |
| can't replay the same state twice | The second callback with the same state gets 400, and the token is exchanged only once. |

### `GET /auth/status`
| Test | Checks |
|---|---|
| says not connected before the user authorizes | `{ connected: false }` |
| shows the connected workspace without exposing tokens | `{ connected, workspaceId, workspaceName }`, and the access and refresh tokens never appear in the response. |

### `POST /auth/disconnect`
| Test | Checks |
|---|---|
| forgets the Notion connection | `{ disconnected: true }`, after which status reports not connected. |

## `tests/frontend-redirect.test.js`: returning to the website after auth

With `frontendUrls` configured (`FRONTEND_URLS` env), the OAuth callback sends the user back to the website instead of the backend's own page.

| Test | Checks |
|---|---|
| sends the user back to the website with the connected workspace | 302 to `<site>/?notion=connected&workspace=…&open=…`, where `open` is the first shared page. |
| never puts tokens in the redirect URL | Neither the access nor the refresh token appears in `Location`. |
| still keeps the connection in the session for the API | `/auth/status` reports connected afterwards. |
| sends the user back with an error when they cancel on Notion | `?notion=error&reason=access_denied`. |
| sends the user back with an error when the state is invalid | `reason=invalid_state`, and the token endpoint is never called. |
| sends the user back with an error when Notion refuses the code | `reason=token_exchange_failed`. |
| falls back to Notion's home as the open link when no pages are shared | `open=https://www.notion.so/`. |
| returns to the site that started the flow when it is allowed | `/auth/notion?return_to=http://localhost:5173` leads back to the local site. |
| ignores a return_to that isn't on the allowlist | An unknown origin falls back to the first allowed site (no open redirect). |
| uses the first allowed site when no return_to is given | The default is the first entry in `FRONTEND_URLS`. |
| accepts Notion's current app.notion.com page links | Notion now serves pages from `app.notion.com`; these pass through as the `open` link. (Found in the real sign-in, where every page link was being dropped.) |
| rejects look-alike hosts | `https://notion.com.evil.example/…` falls back to `https://www.notion.so/`. |

## `tests/connected.test.js`: user-facing pages

### `GET /connected`
| Test | Checks |
|---|---|
| sends users who haven't connected back to the start page | 302 to `/`. |
| shows the connected message and opens a page in the connected workspace | Shows "Notion workspace connected" and the workspace name. The **Open workspace** button (`#open-workspace`) links to the first page shared with the integration, using the session's access token. |
| falls back to Notion's home when no pages are shared | The button links to `https://www.notion.so/`. |
| still shows the page when Notion search fails | A Notion error (e.g. 429) still gives a 200 page with the fallback link. |
| never links outside notion.so even if Notion returns an odd URL | A `javascript:` URL is replaced by the fallback link. |
| escapes the workspace name | A `<script>` workspace name is rendered as text, not HTML. |

### `GET /`
| Test | Checks |
|---|---|
| offers a Connect Notion button that starts the OAuth flow | The page links to `/auth/notion`. |
| sends already-connected users to the connected page | 302 to `/connected`. |

## `tests/language-detector.test.js`: language detection

Expected values are hand-labelled snippets, not recomputed by the code under test.

| Test | Checks |
|---|---|
| recognises {javascript, python, c++, sql, go} and returns Notion's name for it | flourite's names are mapped to Notion's code-block language names (`Javascript` → `javascript`, `C++` → `c++`, …). |
| returns null for empty code so the block is left alone | `""` and whitespace give `null`. |
| returns null when it can't tell what the code is | Prose gives `null` (flourite's `Unknown`), never a wrong guess. |
| (confidence) returns the same language as detectLanguage, with a confidence between 0 and 1 | Every sample: same language as `detectLanguage`, confidence in (0, 1]. |
| (confidence) is more confident about a full snippet than a one-liner | The Python sample beats `x = 1`. Confidence is the winner's flourite score minus the runner-up's, over the winner's score + 2. |
| (confidence) has zero confidence when there is no language | Empty code and prose give `{ language: null, confidence: 0 }`. |
| (highlight.js) returns a Notion language name for recognisable code | Python sample gives `python`. |
| (highlight.js) returns null for empty code | `""` gives `null`. |

## `tests/processor.test.js`: page processing

### `previewPage(notion, pageId)`
| Test | Checks |
|---|---|
| suggests a language for each code block and ignores other blocks | Paragraphs are skipped, and each code block gets `{ blockId, currentLanguage, suggestedLanguage, willChange }`. |
| marks blocks that already have the right language as unchanged | `willChange: false` when the current language equals the suggestion. |
| marks blocks it can't recognise as unchanged | `suggestedLanguage: null`, `willChange: false`. |
| reads every page of results, not just the first 100 | Follows `next_cursor` (tested with page size 2 and 5 blocks). |
| finds code blocks nested inside toggles | Descends into blocks with `has_children` (but not into sub-pages or databases). |
| includes a short snippet of the code for the user to review | `snippet` holds the code text, capped at 300 chars. |

### `applyLanguageChanges(notion, pageId, blockIds)`
| Test | Checks |
|---|---|
| sets the suggested language on the selected blocks only | Calls `blocks.update` with `{ code: { language } }` for the selected IDs only. |
| refuses to touch blocks that aren't code blocks on this page | An unknown ID gives `not_found` and no update. |
| skips blocks that need no change | Already-correct and unrecognised blocks give `skipped`. |
| reports a failed update without stopping the rest | One failure gives `failed` with an error message, and later blocks still update. |

## `tests/block-state-store.test.js`: block state store

What AutoLang remembers per code block: `{ hash, language, manual }`. The in-memory store is used locally and in tests; a DynamoDB store with the same `get`/`set` interface comes with Lambda.

| Test | Checks |
|---|---|
| returns null for a block it has never seen | Unknown ids give `null`. |
| returns what was saved for a block | `set` then `get` round-trips. |
| replaces the previous state | A second `set` overwrites. |
| hands out copies, so callers can't change stored state by accident | Mutating the saved or returned object doesn't change the store. |

## `tests/sync.test.js`: `POST /pages/:pageId/sync` (auto-sync for the extension)

Each test syncs a fake Notion page, then changes it the way a user would (`edit(block, { code, language })`) and syncs again. Default confidence threshold 0.4 (`CONFIDENCE_THRESHOLD`).

| Test | Checks |
|---|---|
| requires a connected Notion workspace | 401 without OAuth. |
| rejects a malformed page id | 400. |
| sets the language of a new code block it is confident about | `updated` with language and confidence; `blocks.update` called. |
| only looks at code blocks | Paragraphs aren't in the results. |
| leaves a block alone when its code hasn't changed since the last sync | Second sync gives `unchanged`; AutoLang's own language change isn't an edit (only code text is hashed), so no loop. |
| detects again when a block's code changes | Python changed to Go gives `updated` to `go`. |
| doesn't change a block when it isn't confident enough | Threshold 0.99 gives `low_confidence`, no update. |
| doesn't change a block when it can't tell the language | Prose gives `low_confidence` with `language: null`. |
| doesn't call Notion when the language is already right | `already_correct`, no update. |
| stops changing a block once the user picks a language by hand | After the user switches AutoLang's `python` to `ruby`, the block stays `manual`, even when its code later looks like Go. |
| treats a language the user changed away from a correct one as manual | Same, starting from a block that was already correct. |
| notices a hand-picked language even before AutoLang has set one | Too short to detect, then the user picks Ruby, then it looks like Python: stays `manual`. |
| tries again next time when Notion fails to update a block | `failed` with Notion's error, then `updated` on the next sync. |
| returns Notion's error when the page can't be read | 404 passes through. |

## `tests/detect.test.js`: `POST /detect` (the website's playground)

Public: no Notion connection, no cookies. Same detector and confidence threshold as sync, so the playground shows what AutoLang would do in Notion.

| Test | Checks |
|---|---|
| detects the language of a snippet with the same confidence check as sync | A Python snippet gives `200 { language: "python", confidence, confident: true }` with confidence ≥ 0.4. |
| says when it is not confident enough to change a block | `const a = 1;` gives `confident: false`. |
| returns no language for empty or unrecognisable code | `""`, whitespace and prose give `{ language: null, confidence: 0, confident: false }`. |
| uses the configured confidence threshold | Threshold 0.99 still names Python but with `confident: false`. |
| rejects a request without a code string | Missing, number and array `code` give 400. |
| rejects snippets longer than 20,000 characters | 413. |
| lets the website read the response | A `FRONTEND_URLS` origin gets `Access-Control-Allow-Origin` (no credentials). |
| answers the browser's preflight for JSON requests | `OPTIONS` gives 204 allowing `POST` and `Content-Type`. |
| does not open the endpoint to other sites | Another origin gets no CORS header. |
| does not add CORS headers to other routes | `/health` stays without CORS. |
| answers 429 once one visitor sends too many requests in a minute | Past the per-IP limit: 429 with `Retry-After`. Default 60 a minute. |
| lets requests through again after the window | With an injected clock, the limit resets after the window. |

## `tests/pages.test.js`: `/pages` API

| Test | Checks |
|---|---|
| requires a connected Notion workspace | 401 without a session connection. |
| lists the pages shared with the integration with their titles | `[{ id, url, title }]`, joining rich-text title parts and falling back to "Untitled". |
| returns a language suggestion per code block | `POST /pages/:id/preview` gives `{ pageId, totalBlocks, suggestions }`. |
| returns 404 for a page the integration can't see | Notion's 404 is passed through. |
| updates the selected code blocks | `POST /pages/:id/apply` gives `{ results: [{ status: "updated", … }] }`. |
| rejects a block selection that is {missing, not an array, malformed id, too many} | 400 and no Notion writes. |

---

## Frontend: `frontend/src/App.test.jsx`

Run from `frontend/` with `npm test`. Stack: vitest + jsdom + Testing Library. Each test sets the browser URL, renders `<App />`, and queries by role and text like a user would.

### How to Use
| Test | Checks |
|---|---|
| starts with downloading the extension, then connecting Notion from it | The steps are, in order: Download the extension, Connect Notion from the extension, Start writing code. |
| no longer sends people to Notion auth from the website | No step links to `/auth/notion`; connecting happens in the extension's popup. |

### Demo video
| Test | Checks |
|---|---|
| plays the recorded demo in the demo section | `#demo` has a `<video>` with the bundled `autolang-demo….mp4` and a poster. |
| loops silently inline so it can autoplay, with controls to pause it | The video is muted, looping, `playsinline`, has controls and autoplays. |
| does not autoplay for people who prefer reduced motion | With `prefers-reduced-motion: reduce` it waits for a click. |
| describes the video for screen readers | The video has an accessible name. |

### Returning from Notion auth
| Test | Checks |
|---|---|
| shows the connected message with the workspace name | `?notion=connected` shows the "Notion workspace connected" heading and the workspace name. |
| offers an Open workspace button that opens the connected workspace | The button links to the `open` URL in a new tab with `rel=noopener`. |
| never links anywhere but notion.so, whatever the URL says | A `javascript:` `open` value becomes `https://www.notion.so/` (the query string is user-controlled). |
| marks step 02 (connecting from the extension) as done | The page says "Step 02 complete" (the extension's sign-in lands here). |
| points only to what is left: writing code in Notion | Only step 03 is shown under "What's next?"; steps 01 and 02 are not. |
| explains a cancelled authorization and lets the user try again | `reason=access_denied` shows a "couldn't connect" heading, a cancelled message and a **Try again** link back to auth. |
| sends Try again to the configured backend, asking to come back to this site | **Try again** links to `<VITE_API_URL>/auth/notion?return_to=<this site's origin>`. |
| defaults Try again to the local backend when no API URL is configured | With no `VITE_API_URL` it points at `http://localhost:3000`. |
| shows a generic message for other errors | Any other reason shows "something went wrong". |
| shows the normal landing page without auth parameters | No `notion` param renders the landing page. |

### Open workspace link hosts
| Test | Checks |
|---|---|
| keeps Notion's current app.notion.com links | `https://app.notion.com/p/…` is kept as the button's link. |
| rejects look-alike hosts | `https://notion.com.evil.example/…` becomes `https://www.notion.so/`. |

## Frontend: `frontend/src/components/sections/Playground.test.jsx`

Renders `<Playground />` with `fetch` stubbed (and a short or fake-timer debounce).

| Test | Checks |
|---|---|
| detects the sample snippet live when the page loads | Starts as Plain Text, POSTs the sample to `<VITE_API_URL>/detect` without cookies, then shows Python and "Detected Python". |
| needs no extension or Notion sign-in | No `Authorization` header. |
| re-detects what the visitor types | Typing TypeScript sends the new code and shows TypeScript. |
| waits for a pause in typing before asking | A burst of edits sends one request, with the last code. |
| leaves the language alone when it isn't confident, like in Notion | `confident: false` keeps the label and says "not confident enough". |
| asks for code when the block is empty | `language: null` asks the visitor to type some code. |
| shows only the answer for the latest code when replies arrive out of order | A slow earlier reply doesn't overwrite a newer one. |
| says so when AutoLang can't be reached, and keeps the language | A network error shows "can't reach AutoLang". |
| asks the visitor to slow down when rate limited | 429 shows "too many tries". |
| shows Notion's language names the way Notion's menu does | `languageLabel` gives TypeScript, JavaScript, C++, C#, SQL, Plain Text, Python, Elixir. |

## Frontend: `frontend/src/Navigation.test.jsx`

Header and footer, checked on both `/` and `/faq`. `fetch` is stubbed because the landing page's playground calls the backend.

| Test | Checks |
|---|---|
| links to About Us, Demo and Playground sections of the home page | The main nav links to `/#about`, `/#demo` and `/#playground`, so they work from any page. |
| has FAQ where Account used to be | A FAQ link to `/faq`; no Account link. |
| no longer shows Support or Resources | Neither link is in the header. |
| stays flat at the top of the page and lifts off the content once scrolled | The sticky header's `data-scrolled` turns on after scrolling and off again at the top (it adds a shadow and slims the bar). |
| starts lifted when the page opens part-way down, e.g. at /#demo | Already scrolled on load gives `data-scrolled="true"`. |
| scrolls to the section named in the link, e.g. /#demo from the FAQ | Opening `/#demo` scrolls the demo section into view once the page has rendered. |
| links to the GitHub repository in a new tab | **GitHub Repository** goes to `github.com/durva7px/Notion-Autolang` with `target=_blank` and `rel=noopener`. |
| links Developer Connect to the developer's GitHub profile in a new tab | **Developer Connect** goes to `github.com/durva7px`, same attributes. |
| puts the two links on either side of the copyright | Document order: repository, copyright, profile. |
| drops Help, Support and Contact Us | None of these links are in the footer. |

## Frontend: `frontend/src/pages/FaqPage.test.jsx`

| Test | Checks |
|---|---|
| has its own heading and not the landing page | `/faq` shows "Frequently asked questions" and not How to Use. |
| answers at least 10 questions | Every question in `content/faq.js` is on the page (there are 15). |
| covers privacy and Notion workspace access | Questions about storing code, workspace access, the access token and disconnecting exist. |
| shows an answer when its question is opened | Clicking a question opens its `<details>`. |
| gives every question a link-able anchor | Each question has a unique `id`, so `/faq#store-code` links straight to it. |
| sets the browser tab title | The tab reads "FAQ · Notion AutoLang". |

## Extension: `extension/tests/`

Run from `extension/` with `npm test`. Stack: vitest + jsdom. `manifest.json`, `content.js`, `background.js`, `popup.html` and `popup.js` are thin Chrome glue and are checked by hand (see "Not covered").

### `notionPage.test.js`
| Test | Checks |
|---|---|
| reads the page id from {notion.so title, workspace path, app.notion.com/p/, bare id, #block link, ?v= view} | All give the dashed API form of the id in the path. |
| uses the page open in a side peek | `?p=<id>` wins over the page behind it. |
| returns null when no page is open | `/`, `/login` and invalid URLs give `null`. |
| is true when text inside a code block changes | A `characterData` change in `.notion-code-block`. |
| is true when a code block is added to the page | An added subtree containing `.notion-code-block`. |
| is false for changes elsewhere on the page | Text blocks are ignored. |

### `syncScheduler.test.js` (fake timers)
| Test | Checks |
|---|---|
| syncs a page once the user stops changing it | Nothing before 2 s of quiet; one sync at 2 s. |
| waits for a quiet moment: each change restarts the wait | Five quick changes give one sync. |
| handles pages independently | Two pages, two syncs. |
| never runs two syncs for the same page at once, and runs one more after changes during a sync | Changes during a sync queue exactly one follow-up. |
| keeps working after a sync fails | `onError` gets the error; later changes still sync. |

### `syncClient.test.js`
| Test | Checks |
|---|---|
| posts to the page's sync endpoint with the session cookie and returns the results | `POST <api>/pages/<id>/sync` with `credentials: 'include'`. |
| explains when the user still needs to connect Notion | 401 becomes "Connect your Notion workspace first" with `code: 'not_connected'`. |
| passes on the backend's error otherwise | e.g. `404: Could not find page`. |

### `connection.test.js`
| Test | Checks |
|---|---|
| reports the connected workspace | `GET /auth/status` with the cookie gives `{ state: 'connected', workspaceName }`. |
| reports when no workspace is connected | `{ state: 'disconnected' }`. |
| reports the backend as offline when it can't be reached | A network error gives `{ state: 'offline' }`. |
| reports the backend as offline when it answers with an error | A 500 gives `offline`. |
| gives the address that starts Notion sign-in | `<api>/auth/notion`. |
| disconnects through the backend | `POST /auth/disconnect` with the cookie. |
| fails loudly when disconnecting fails | The backend's error is thrown. |

### `status.test.js`
| Test | Checks |
|---|---|
| (badge) shows nothing when connected and syncing fine | Empty badge; tooltip names the workspace. |
| (badge) asks to connect when no workspace is connected | `!` and "connect your Notion workspace". |
| (badge) says when the backend is not running | `!` and "can't reach the backend". |
| (badge) flags a failed sync even while connected | `!` with the error in the tooltip. |
| (badge) uses different colours for "needs you" and "something failed" | Magenta vs amber. |
| re-syncs open pages when the user goes from not connected to connected | `onConnected` fires once. This is the fix for pages opened before signing in. |
| remembers the previous state across service worker restarts | The view is kept in the store, so a restart between "not connected" and "connected" still re-syncs. |
| doesn't re-sync when it was already connected | No `onConnected`. |
| doesn't re-sync the first time it ever checks | No previous state, no `onConnected`. |
| reports every change so the badge can update | `onChange` gets each new view. |
| records sync results | `lastSync` counts `updated` blocks. |
| records sync failures | `lastSync` keeps the error. |
| marks the workspace as disconnected when a sync is refused for that reason | A `not_connected` error flips the connection. |
| then re-syncs once the user connects again | Reconnecting fires `onConnected`. |
| checks the connection first when a sync finishes / fails | Before any status check, a sync result triggers one. |

### `popupView.test.js`
| Test | Checks |
|---|---|
| says it is checking before the status is known | "Checking…". |
| shows the connected workspace and a Disconnect button | Heading, workspace name; the button calls `disconnect`. |
| tells the user to open a Notion page when nothing has synced yet | Hint text. |
| shows the last sync | "Last sync 3 min ago: 2 blocks updated". |
| shows a recent sync as just now, and one block in the singular | "just now", "1 block". |
| shows a failed sync with its reason | "Last sync failed: 429: rate limited". |
| offers Connect Notion when no workspace is connected | The button calls `connect`; no Disconnect. |
| explains how to start the backend when it is offline, with a retry | Shows `npm start --prefix backend`; Try again calls `retry`. |
| replaces what was shown before | Re-rendering leaves one heading. |
| shows workspace names as text, never as markup | A name containing `<img onerror>` creates no element. |

To look at every popup state at once: `npm run preview:popup` in `extension/`, then open `http://localhost:5180/dev/popup-preview.html`.

---

## Not covered by automated tests

- **The real Notion OAuth round trip.** It needs a person to sign in on notion.com. To check it by hand, run `npm start`, open `http://localhost:3000`, click **Connect Notion**, approve, and land on the connected page.
- **`services/notion.js`** is a one-line wrapper around the SDK `Client`. The smoke test covers that it loads in Node.
- **Detector accuracy.** That's measured, not asserted: `npm run compare-detectors` (built-in samples) or `npm run compare-detectors -- notion` (blocks on `NOTION_PAGE_ID`).
- **The extension inside Chrome on a real Notion page** (`manifest.json`, `content.js`, `background.js`, `popup.js`, the badge, adding itself to tabs that were already open, and that `.notion-code-block` is still Notion's class). Check by hand with the steps in `extension/README.md`.
- **The confidence threshold's value.** 0.4 is a starting point. Tune it by running the detectors over your own blocks.
