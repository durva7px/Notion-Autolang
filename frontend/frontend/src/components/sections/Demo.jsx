import Section from '../ui/Section.jsx'
import styles from './Demo.module.css'

/** Placeholder frame for the demo video. Pass `src` once the recording exists. */
export default function Demo({ src }) {
  return (
    <Section id="demo" title="See how it works!">
      <div className={styles.frame} data-animate="demo">
        {src ? (
          <video className={styles.video} src={src} controls playsInline />
        ) : (
          <span className={styles.placeholder}>demo video</span>
        )}
      </div>
    </Section>
  )
}
