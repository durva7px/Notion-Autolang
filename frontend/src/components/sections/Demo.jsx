import { useState } from 'react'
import Section from '../ui/Section.jsx'
import { demo } from '../../content/landing.js'
import styles from './Demo.module.css'

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** The demo recording. Loops silently; waits for a click when reduced motion is on. */
export default function Demo({ src = demo.video, poster = demo.poster, label = demo.label }) {
  const [autoPlay] = useState(() => !prefersReducedMotion())

  return (
    <Section id="demo" title="See how it works!">
      <div className={styles.frame} data-animate="demo">
        <video
          className={styles.video}
          src={src}
          poster={poster}
          aria-label={label}
          autoPlay={autoPlay}
          muted
          loop
          playsInline
          controls
          preload="metadata"
        />
      </div>
    </Section>
  )
}
