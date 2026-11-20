# Tests

Backend, frontend and extension tests. Backend tests run from `backend/`:

```bash
npm test            # run once
npm run test:watch  # re-run on save
```

Stack: [vitest](https://vitest.dev) + [supertest](https://github.com/ladjs/supertest). 82 tests, 10 files. Frontend: 12 tests, 1 file ([see below](#frontend-frontendsrcapptestjsx)). Extension: 21 tests, 3 files ([see below](#extension-extensiontests)).

## Seams under test

We agreed to test at three seams only. Each is a public interface; tests never reach past them.

| Seam | What's real | What's faked |
|---|---|---|
| **HTTP API** (`createApp`) | Express, sessions, cookies, routing, HTML | Notion's token endpoint (injected `fetch`) and the Notion SDK client (injected `createNotionClient`) |
| **Language detection** (`detectLanguage`, `detectLanguageWithConfidence`, `detectLanguageWithHighlight`) | flourite and highlight.js | nothing |
| **Page processor** (`previewPage`, `applyLanguageChanges`) | detection, pagination, nesting | the Notion SDK client (`tests/fake-notion.js`) |
| **Block state store** (`get`, `set`) | the in-memory store | nothing |
| **Website** (`<App />` in `frontend/`, rendered for a given URL) | React components, routing on the query string | nothing (jsdom stands in for the browser; `VITE_API_URL` is stubbed) |
| **Extension modules** (`notionPage`, `syncScheduler`, `syncClient` in `extension/src/`) | URL parsing, DOM checks, timing logic | timers (vitest fake timers), `fetch`, the DOM (jsdom) |

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

### Step 01: Sign Up to Authorize Workspace
| Test | Checks |
|---|---|
| links to the backend Notion auth, asking to come back to this site | The step 01 card is a link to `<VITE_API_URL>/auth/notion?return_to=<this site's origin>`. |
| defaults to the local backend when no API URL is configured | With no `VITE_API_URL` it points at `http://localhost:3000`. |
| leaves the other steps as plain cards | Steps 02 and 03 aren't links. |

### Returning from Notion auth
| Test | Checks |
|---|---|
| shows the connected message with the workspace name | `?notion=connected` shows the "Notion workspace connected" heading and the workspace name. |
| offers an Open workspace button that opens the connected workspace | The button links to the `open` URL in a new tab with `rel=noopener`. |
| never links anywhere but notion.so, whatever the URL says | A `javascript:` `open` value becomes `https://www.notion.so/` (the query string is user-controlled). |
| points to the next step: installing the extension | Step 02 is shown under "What's next?". |
| explains a cancelled authorization and lets the user try again | `reason=access_denied` shows a "couldn't connect" heading, a cancelled message and a **Try again** link back to auth. |
| shows a generic message for other errors | Any other reason shows "something went wrong". |
| shows the normal landing page without auth parameters | No `notion` param renders the landing page. |

### Open workspace link hosts
| Test | Checks |
|---|---|
| keeps Notion's current app.notion.com links | `https://app.notion.com/p/…` is kept as the button's link. |
| rejects look-alike hosts | `https://notion.com.evil.example/…` becomes `https://www.notion.so/`. |

## Extension: `extension/tests/`

Run from `extension/` with `npm test`. Stack: vitest + jsdom. `manifest.json`, `content.js` and `background.js` are thin Chrome glue and are checked by hand (see "Not covered").

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
| explains when the user still needs to connect Notion | 401 becomes "Connect your Notion workspace first: open …/auth/notion". |
| passes on the backend's error otherwise | e.g. `404: Could not find page`. |

---

## Not covered by automated tests

- **The real Notion OAuth round trip.** It needs a person to sign in on notion.com. To check it by hand, run `npm start`, open `http://localhost:3000`, click **Connect Notion**, approve, and land on the connected page.
- **`services/notion.js`** is a one-line wrapper around the SDK `Client`. The smoke test covers that it loads in Node.
- **Detector accuracy.** That's measured, not asserted: `npm run compare-detectors` (built-in samples) or `npm run compare-detectors -- notion` (blocks on `NOTION_PAGE_ID`).
- **The extension inside Chrome on a real Notion page** (`manifest.json`, `content.js`, `background.js`, and that `.notion-code-block` is still Notion's class). Check by hand with the steps in `extension/README.md`.
- **The confidence threshold's value.** 0.4 is a starting point. Tune it by running the detectors over your own blocks.
