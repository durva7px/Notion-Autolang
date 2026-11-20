import GradientPill from '../ui/GradientPill.jsx'
import TryButton from '../ui/TryButton.jsx'
import TypedWord from './TypedWord.jsx'
import technologist from '../../assets/icons/technologist.png'
import { hero } from '../../content/landing.js'
import styles from './Hero.module.css'

export default function Hero() {
  const [firstLine, secondLine] = hero.headingLines
  return (
    <section className={styles.hero} data-section="hero">
      <div className={styles.inner}>
        <h1 className={styles.heading}>
          <span className={styles.lineOne} data-animate="hero-line">
            {firstLine}
          </span>
          <span className={styles.lineTwo} data-animate="hero-line">
            {secondLine} <TypedWord base={hero.typedWord.base} extensions={hero.typedWord.extensions} />
          </span>
        </h1>

        <div className={styles.row}>
          <p className={styles.subtitle} data-animate="hero-subtitle">
            Automatic <span className={styles.round}>language detection</span> for a more{' '}
            <br className={styles.desktopBreak} />
            <span className={styles.amber}>intuitive</span> and <span className={styles.magenta}>seamless</span> Notion
            coding experience.
          </p>
          <TryButton className={styles.try} />
        </div>

        <GradientPill icon={technologist} className={styles.badge} data-animate="hero-badge">
          {hero.badge}
        </GradientPill>
      </div>
    </section>
  )
}
