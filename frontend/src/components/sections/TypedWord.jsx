import { useEffect, useState } from 'react'
import styles from './TypedWord.module.css'

const TYPE_MS = 110
const DELETE_MS = 60
const HOLD_MS = 1400
const GAP_MS = 250

/**
 * The pixel-font word with a blinking caret after it.
 * `base` stays fixed while each extension is typed out in its own colour, held, then deleted.
 */
export default function TypedWord({ base, extensions, className = '', ...props }) {
  const [index, setIndex] = useState(0)
  const [length, setLength] = useState(extensions[0].ext.length)
  const [deleting, setDeleting] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(query.matches)
    const onChange = (e) => setReducedMotion(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const current = extensions[index].ext
    let delay
    let step

    if (reducedMotion) {
      // Swap whole words instead of typing character by character.
      delay = HOLD_MS
      step = () => {
        const next = (index + 1) % extensions.length
        setIndex(next)
        setLength(extensions[next].ext.length)
      }
    } else if (!deleting && length === current.length) {
      delay = HOLD_MS
      step = () => setDeleting(true)
    } else if (deleting && length === 0) {
      delay = GAP_MS
      step = () => {
        setDeleting(false)
        setIndex((index + 1) % extensions.length)
      }
    } else {
      delay = deleting ? DELETE_MS : TYPE_MS
      step = () => setLength(length + (deleting ? -1 : 1))
    }

    const timer = setTimeout(step, delay)
    return () => clearTimeout(timer)
  }, [index, length, deleting, reducedMotion, extensions])

  const { ext, color } = extensions[index]
  const typing = length !== ext.length || deleting

  return (
    <span className={`${styles.wrap} ${className}`} data-animate="typed-word" {...props}>
      <span className={styles.word} aria-hidden="true">
        {base}
        <span style={{ color }}>{ext.slice(0, length)}</span>
      </span>
      <span className={styles.srOnly}>
        {base}
        {extensions[0].ext}
      </span>
      <span className={`${styles.caret} ${typing ? '' : styles.blink}`} aria-hidden="true" />
    </span>
  )
}
