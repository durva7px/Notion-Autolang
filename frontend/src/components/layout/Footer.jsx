import GradientPill from '../ui/GradientPill.jsx'
import Divider from '../ui/Divider.jsx'
import alien from '../../assets/icons/alien.png'
import technologist from '../../assets/icons/technologist.png'
import { footerLinks } from '../../content/landing.js'
import styles from './Footer.module.css'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <Divider />
      <div className={styles.inner}>
        <div className={styles.links}>
          {footerLinks.map((column, i) => (
            <ul key={i} className={styles.column}>
              {column.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          ))}
        </div>
        <p className={styles.copyright}>All rights reserved © {YEAR}</p>
        <div className={styles.ctas}>
          <GradientPill href="#github" icon={alien} variant="slate" trailingArrow>
            GitHub Repository
          </GradientPill>
          <GradientPill href="#connect" icon={technologist} trailingArrow>
            Developer Connect
          </GradientPill>
        </div>
      </div>
    </footer>
  )
}
