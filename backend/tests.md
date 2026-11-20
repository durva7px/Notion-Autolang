# Tests

Backend and frontend tests. Backend tests run from `backend/`:

```bash
npm test            # run once
npm run test:watch  # re-run on save
```

Stack: [vitest](https://vitest.dev) + [supertest](https://github.com/ladjs/supertest). 61 tests, 8 files. Frontend: 12 tests, 1 file ([see below](#frontend-frontendsrcapptestjsx)).

## Seams under test

We agreed to test at three seams only. Each is a public interface; tests never reach past them.

| Seam | What's real | What's faked |
|---|---|---|
| **HTTP API** (`createApp`) | Express, sessions, cookies, routing, HTML | Notion's token endpoint (injected `fetch`) and the Notion SDK client (injected `createNotionClient`) |
| **Language detection** (`detectLanguage`, `detectLanguageWithHighlight`) | flourite and highlight.js | nothing |
| **Page processor** (`previewPage`, `applyLanguageChanges`) | detection, pagination, nesting | the Notion SDK client (`tests/fake-notion.js`) |
| **Website** (`<App />` in `frontend/`, rendered for a given URL) | React components, routing on the query string | nothing (jsdom stands in for the browser; `VITE_API_URL` is stubbed) |

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

---

## Not covered by automated tests

- **The real Notion OAuth round trip.** It needs a person to sign in on notion.com. To check it by hand, run `npm start`, open `http://localhost:3000`, click **Connect Notion**, approve, and land on the connected page.
- **`services/notion.js`** is a one-line wrapper around the SDK `Client`. The smoke test covers that it loads in Node.
- **Detector accuracy.** That's measured, not asserted: `npm run compare-detectors` (built-in samples) or `npm run compare-detectors -- notion` (blocks on `NOTION_PAGE_ID`).
