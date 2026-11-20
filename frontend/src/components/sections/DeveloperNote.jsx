import Section from '../ui/Section.jsx'
import Emoji from '../ui/Emoji.jsx'
import envelope from '../../assets/icons/envelope.png'
import bulb from '../../assets/icons/bulb.png'
import styles from './DeveloperNote.module.css'

export default function DeveloperNote() {
  return (
    <Section
      id="about"
      className={styles.section}
      title={
        <span className={styles.title}>
          Note from the developer <Emoji src={envelope} className={styles.envelope} />
        </span>
      }
    >
      <div className={styles.body}>
        <aside className={styles.callout} data-animate="callout">
          <img src={bulb} alt="" className={styles.bulb} />
          <p>
            I love using Notion to document what I learn while building software. But I kept running into the same tiny
            interruption:{' '}
            <strong>writing code, stopping to select its language, and then going back to writing.</strong>
          </p>
        </aside>

        <p className={styles.lead}>AutoLang started with a simple question:</p>
        <blockquote className={styles.quote}>What if Notion could figure that out itself?</blockquote>

        <p className={styles.paragraph}>
          What began as a language-detection experiment has evolved into an exploration of{' '}
          <strong>browser extensions, OAuth, API integration</strong>s, and designing <strong>automation</strong> that
          genuinely reduces friction.
        </p>
        <p className={styles.paragraph}>
          I&apos;m building AutoLang in public, sharing both the implementation and the decisions behind it. Because
          sometimes the most interesting software starts with the smallest inconvenience.
        </p>
      </div>
    </Section>
  )
}
