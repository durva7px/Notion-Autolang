import LandingPage from './pages/LandingPage.jsx'
import AuthResultPage from './pages/AuthResultPage.jsx'
import { readAuthResult } from './lib/authResult.js'

export default function App() {
  const authResult = readAuthResult(window.location.search)
  return authResult ? <AuthResultPage result={authResult} /> : <LandingPage />
}
