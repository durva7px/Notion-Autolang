import { useEffect, useRef, useState } from 'react'
import Section from '../ui/Section.jsx'
import Cursor from '../ui/Cursor.jsx'
import CodeBlock from './CodeBlock.jsx'
import { playground } from '../../content/landing.js'
import { detectLanguage, languageLabel } from '../../lib/detect.js'
import { placeholderFor } from '../../lib/placeholder.js'
import styles from './Playground.module.css'

const ERRORS = {
  rate_limited: 'Too many tries. Wait a moment',
  unreachable: "Can't reach AutoLang right now",
  failed: "Can't reach AutoLang right now",
}

// How long the popup stays, matching its CSS animation.
const POPUP_MS = { detected: 2300, error: 4000 }

/**
 * Live detection without the extension or a Notion connection. Like in Notion,
 * the block starts as Plain Text and only changes when AutoLang is confident;
 * the result pops up beside the language label, as in the demo video.
 */
export default function Playground({ debounceMs = 600 }) {
  const [language, setLanguage] = useState('plain text')
  const [popup, setPopup] = useState(null)
  // For screen readers, since the popup is visual only.
  const [announcement, setAnnouncement] = useState('')
  const timer = useRef()
  const popupTimer = useRef()
  const inFlight = useRef()

  function showPopup(kind, text) {
    clearTimeout(popupTimer.current)
    setPopup({ kind, text })
    popupTimer.current = setTimeout(() => setPopup(null), POPUP_MS[kind])
  }

  function hidePopup() {
    clearTimeout(popupTimer.current)
    setPopup(null)
  }

  function handleCodeChange(code) {
    hidePopup()
    clearTimeout(timer.current)
    if (!code.trim()) {
      inFlight.current?.abort()
      inFlight.current = undefined
      setAnnouncement('')
      return
    }
    timer.current = setTimeout(() => detect(code), debounceMs)
  }

  function handleLanguageChange(value) {
    hidePopup()
    setLanguage(value)
  }

  async function detect(code) {
    inFlight.current?.abort()
    const request = new AbortController()
    inFlight.current = request
    try {
      const answer = await detectLanguage(code, { signal: request.signal })
      if (inFlight.current !== request) return
      const { language: found, confidence, confident } = answer
      if (confident) {
        setLanguage(found)
        const text = `AutoLang detected ${languageLabel(found)}`
        showPopup('detected', text)
        setAnnouncement(text)
      } else if (found) {
        setAnnouncement(
          `Not confident enough to change it yet (${languageLabel(found)}, ${Math.round(confidence * 100)}%). Keep typing.`,
        )
      } else {
        setAnnouncement('Type some code and AutoLang will pick its language.')
      }
    } catch (error) {
      if (inFlight.current !== request || error.name === 'AbortError') return
      const text = ERRORS[error.kind] ?? ERRORS.failed
      showPopup('error', text)
      setAnnouncement(text)
    }
  }

  // Stop pending work on unmount.
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      clearTimeout(popupTimer.current)
      inFlight.current?.abort()
    },
    [],
  )

  return (
    <Section
      id="playground"
      title="AutoLang Playground"
      titleAccessory={<Cursor rotate={-90} className={styles.cursor} />}
    >
      <figure className={styles.figure}>
        <CodeBlock
          language={language}
          onLanguageChange={handleLanguageChange}
          popup={popup}
          placeholder={placeholderFor(language)}
          onCodeChange={handleCodeChange}
        />
        <figcaption className={styles.caption}>{playground.caption}</figcaption>
      </figure>
      <p className={styles.srOnly} role="status">
        {announcement}
      </p>
    </Section>
  )
}
