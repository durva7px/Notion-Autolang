import { useEffect, useRef, useState } from 'react'
import Section from '../ui/Section.jsx'
import Cursor from '../ui/Cursor.jsx'
import CodeBlock from './CodeBlock.jsx'
import { playground } from '../../content/landing.js'
import { detectLanguage, languageLabel } from '../../lib/detect.js'
import styles from './Playground.module.css'

const ERRORS = {
  rate_limited: 'Too many tries in a minute. Wait a moment, then keep typing.',
  unreachable: "The playground can't reach AutoLang right now. Try again in a moment.",
  failed: "The playground can't reach AutoLang right now. Try again in a moment.",
}

function statusText(result) {
  switch (result.state) {
    case 'detecting':
      return 'Detecting…'
    case 'error':
      return ERRORS[result.kind] ?? ERRORS.failed
    case 'done': {
      const { language, confidence, confident } = result
      if (!language) return 'Type some code and AutoLang will pick its language.'
      const percent = Math.round(confidence * 100)
      return confident
        ? `Detected ${languageLabel(language)} · ${percent}% confident`
        : `Not confident enough to change it yet (${languageLabel(language)}, ${percent}%). Keep typing.`
    }
    default:
      return ''
  }
}

/**
 * Live detection without the extension or a Notion connection. Like in Notion,
 * the block starts as Plain Text and only changes when AutoLang is confident.
 */
export default function Playground({ debounceMs = 600 }) {
  const [language, setLanguage] = useState('plain text')
  const [result, setResult] = useState({ state: 'detecting' })
  const timer = useRef()
  const inFlight = useRef()

  function detectAfterPause(code) {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => detect(code), debounceMs)
  }

  async function detect(code) {
    inFlight.current?.abort()
    const request = new AbortController()
    inFlight.current = request
    setResult({ state: 'detecting' })
    try {
      const answer = await detectLanguage(code, { signal: request.signal })
      if (inFlight.current !== request) return
      setResult({ state: 'done', ...answer })
      if (answer.confident) setLanguage(answer.language)
    } catch (error) {
      if (inFlight.current !== request || error.name === 'AbortError') return
      setResult({ state: 'error', kind: error.kind })
    }
  }

  // Detect the sample once on load; stop pending work on unmount.
  useEffect(() => {
    detectAfterPause(playground.sample)
    return () => {
      clearTimeout(timer.current)
      inFlight.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Section
      id="playground"
      title="AutoLang Playground"
      titleAccessory={<Cursor rotate={-90} className={styles.cursor} />}
    >
      <CodeBlock
        initialCode={playground.sample}
        language={languageLabel(language)}
        onCodeChange={detectAfterPause}
      />
      <p className={styles.status} role="status" data-state={result.state}>
        {statusText(result)}
      </p>
      <p className={styles.hint}>{playground.hint}</p>
    </Section>
  )
}
