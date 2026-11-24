// Where the AutoLang backend lives. Set VITE_API_URL at build time (e.g. in
// Vercel's environment variables); defaults to the local backend.
const LOCAL_API = 'http://localhost:3000'

export function apiUrl() {
  return import.meta.env.API_URL || LOCAL_API
}

/** Starts Notion auth on the backend and asks it to return to this site. */
export function notionAuthUrl() {
  const url = new URL('/auth/notion', apiUrl())
  url.searchParams.set('return_to', window.location.origin)
  return url.toString()
}
