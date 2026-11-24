import LandingPage from './pages/LandingPage.jsx'
import AuthResultPage from './pages/AuthResultPage.jsx'
import FaqPage from './pages/FaqPage.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'
import { readAuthResult } from './lib/authResult.js'

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '')
  if (path === '/faq') return <FaqPage />
  if (path === '/privacy') return <PrivacyPage />
  const authResult = readAuthResult(window.location.search)
  return authResult ? <AuthResultPage result={authResult} /> : <LandingPage />
}
