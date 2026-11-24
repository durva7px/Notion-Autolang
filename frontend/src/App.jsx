import LandingPage from './pages/LandingPage.jsx'
import AuthResultPage from './pages/AuthResultPage.jsx'
import FaqPage from './pages/FaqPage.jsx'
import { readAuthResult } from './lib/authResult.js'

export default function App() {
  if (window.location.pathname.replace(/\/+$/, '') === '/faq') return <FaqPage />
  const authResult = readAuthResult(window.location.search)
  return authResult ? <AuthResultPage result={authResult} /> : <LandingPage />
}
