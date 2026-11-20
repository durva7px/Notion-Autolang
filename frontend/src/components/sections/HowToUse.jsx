import Section from '../ui/Section.jsx'
import Cursor from '../ui/Cursor.jsx'
import StepCard from './StepCard.jsx'
import { steps } from '../../content/landing.js'
import { notionAuthUrl } from '../../config.js'
import styles from './HowToUse.module.css'

// Steps with an `action` in the content become links.
const actionHrefs = {
  'connect-notion': notionAuthUrl,
}

export default function HowToUse() {
  return (
    <Section id="how-to-use" title="How to Use?">
      <ol className={styles.steps}>
        {steps.map(({ action, ...step }, i) => (
          <li key={step.number} className={`${styles.item} ${i % 2 ? styles.offset : ''}`}>
            <StepCard {...step} href={actionHrefs[action]?.()} />
            {i === 0 && <Cursor rotate={-8} className={styles.cursor} />}
          </li>
        ))}
      </ol>
    </Section>
  )
}
