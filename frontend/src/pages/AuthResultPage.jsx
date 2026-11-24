import Header from '../components/layout/Header.jsx'
import Footer from '../components/layout/Footer.jsx'
import Section from '../components/ui/Section.jsx'
import GradientPill from '../components/ui/GradientPill.jsx'
import TryButton from '../components/ui/TryButton.jsx'
import StepCard from '../components/sections/StepCard.jsx'
import check from '../assets/icons/check.png'
import { steps } from '../content/landing.js'
import { notionAuthUrl } from '../config.js'
import styles from './AuthResultPage.module.css'

const ERROR_MESSAGES = {
  access_denied: 'You cancelled the authorization on Notion, so nothing was connected.',
}
const GENERIC_ERROR = 'Something went wrong while connecting your workspace. Please try again.'

/** Shown when the backend sends the user back here after Notion auth. */
export default function AuthResultPage({ result }) {
  return (
    <>
      <Header />
      <main>
        {result.status === 'connected' ? <Connected {...result} /> : <Failed {...result} />}
      </main>
      <Footer />
    </>
  )
}

function Connected({ workspace, openUrl }) {
  // Connecting (from the extension) is what just finished; show only the steps after it.
  const connectIndex = steps.findIndex(step => step.id === 'connect-notion')
  const doneStep = steps[connectIndex]
  const nextSteps = steps.slice(connectIndex + 1)

  return (
    <>
      <section className={styles.hero} data-section="connected">
        <div className={styles.inner}>
          <p className={styles.eyebrow}>
            <img src={check} alt="" aria-hidden="true" className={styles.check} />
            Step {doneStep.number} complete
          </p>
          <h1 className={styles.heading}>
            <span className={styles.lineOne}>Notion workspace</span>{' '}
            <span className={styles.lineTwo}>
              connected<span className={styles.dot}>.</span>
            </span>
          </h1>

          <div className={styles.row}>
            <GradientPill className={styles.workspace}>{workspace}</GradientPill>
            <TryButton
              href={openUrl}
              label="OPEN WORKSPACE"
              target="_blank"
              rel="noopener noreferrer"
            />
          </div>
        </div>
      </section>

      <Section id="next-steps" title="What's next?">
        <ol className={styles.steps}>
          {nextSteps.map((step, i) => (
            <li key={step.number} className={`${styles.item} ${i % 2 ? styles.offset : ''}`}>
              <StepCard {...step} />
            </li>
          ))}
        </ol>
      </Section>
    </>
  )
}

function Failed({ reason }) {
  return (
    <section className={styles.hero} data-section="auth-error">
      <div className={styles.inner}>
        <h1 className={styles.heading}>
          <span className={styles.lineOne}>We couldn&apos;t connect</span>{' '}
          <span className={styles.lineTwo}>to Notion.</span>
        </h1>

        <div className={styles.row}>
          <p className={styles.message}>{ERROR_MESSAGES[reason] ?? GENERIC_ERROR}</p>
          <TryButton href={notionAuthUrl()} label="TRY AGAIN" />
        </div>

        <a href="/" className={styles.home}>
          ← Back to home
        </a>
      </div>
    </section>
  )
}
