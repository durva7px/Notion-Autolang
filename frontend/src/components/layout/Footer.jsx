import GradientPill from '../ui/GradientPill.jsx'
import Divider from '../ui/Divider.jsx'
import alien from '../../assets/icons/alien.png'
import technologist from '../../assets/icons/technologist.png'
import { githubLinks } from '../../content/landing.js'
import styles from './Footer.module.css'

const YEAR = new Date().getFullYear()
const external = { target: '_blank', rel: 'noopener noreferrer' }

/** GitHub repository · copyright · the developer's GitHub profile. */
export default function Footer() {
  return (
    <footer className={styles.footer}>
      <Divider />
      <div className={styles.inner}>
        <GradientPill
          href={githubLinks.repo}
          icon={alien}
          variant="slate"
          trailingArrow
          className={styles.start}
          {...external}
        >
          GitHub Repository
        </GradientPill>
        <p className={styles.copyright}>All rights reserved © {YEAR}</p>
        <GradientPill href={githubLinks.profile} icon={technologist} trailingArrow className={styles.end} {...external}>
          Developer Connect
        </GradientPill>
      </div>
    </footer>
  )
}
