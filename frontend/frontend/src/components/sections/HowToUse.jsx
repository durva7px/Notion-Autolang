import Section from '../ui/Section.jsx'
import Cursor from '../ui/Cursor.jsx'
import StepCard from './StepCard.jsx'
import { steps } from '../../content/landing.js'
import styles from './HowToUse.module.css'

export default function HowToUse() {
  return (
    <Section id="how-to-use" title="How to Use?">
      <ol className={styles.steps}>
        {steps.map((step, i) => (
          <li key={step.number} className={`${styles.item} ${i % 2 ? styles.offset : ''}`}>
            <StepCard {...step} />
            {i === 0 && <Cursor rotate={-8} className={styles.cursor} />}
          </li>
        ))}
      </ol>
    </Section>
  )
}
