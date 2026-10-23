# Notion AutoLang

> 🚧 **Under construction.** This project is in early development. Features are being built one at a time, nothing is deployed yet, and things will change. It is not ready for general use.

Notion AutoLang detects the programming language of code blocks in your Notion pages and sets it for you automatically. A Chrome extension watches the Notion page you are on, a backend predicts each block's language, and the change is logged so you can review or undo it.

## How it works

1. The **Chrome extension** notices activity on a Notion page and sends the page ID to the backend.
2. The **backend** fetches that page's code blocks through the Notion API.
3. Each block's language is predicted, with a confidence score.
4. If the confidence is above a threshold and the block's content has changed, the backend updates the block's language in Notion.
5. Every update is stored in **Supabase** and shown as an activity log in the extension.

## Repository layout

This is a monorepo managed with npm workspaces.

```
notion-autolang/
  backend/           Express API: Notion OAuth, block fetching, language detection, Supabase
  frontend/          Landing page (React + Vite)
  extension/         Chrome extension (Manifest V3)
  packages/shared/   Code shared between workspaces, such as the Notion language list
  .github/workflows/ CI and release workflows
```

## Tech stack

- **Language:** JavaScript throughout
- **Backend:** Node.js, Express, Notion public OAuth, express-session
- **Database:** Supabase (Postgres)
- **Frontend:** React, Vite, CSS Modules
- **Extension:** Chrome Manifest V3
- **Language detection:** being evaluated (highlight.js for v1, flourite (testing))

## Getting started

Requires Node.js 20 or later.

```bash
git clone https://github.com/<your-username>/notion-autolang.git
cd notion-autolang
npm install
```

Copy the example environment file and fill in your own values:

```bash
cp backend/.env.example backend/.env
```

| Variable | Purpose |
| --- | --- |
| `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` | Your Notion public integration's OAuth credentials |
| `NOTION_REDIRECT_URI` | OAuth callback, e.g. `http://localhost:3000/notion/callback` |
| `SESSION_SECRET` | A long random string for signing session cookies |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase project credentials (backend only) |
| `DATABASE_URL` | Postgres connection string for the session store |

Never commit `.env` files. The extension and the landing page hold no secrets.

### Run each part

```bash
npm run dev --workspace backend    # API on http://localhost:3000
npm run dev --workspace frontend   # Landing page on http://localhost:5173
```

To load the extension, open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose the `extension/` folder.

## Roadmap

- [x] Landing page design
- [x] Notion OAuth sign-in
- [x] Fetch code blocks for a page
- [x] Language prediction with confidence scores
- [x] Update block languages in Notion
- [ ] Activity log in Supabase and in the extension
- [ ] Deploy the backend and landing page
- [ ] Publish the extension on the Chrome Web Store

## Contributing

Work happens on feature branches (`feat/...`, `fix/...`) and is merged into `main` through pull requests once CI passes. Since the project is still under construction, please open an issue before starting larger changes.

## License

License to be decided.
