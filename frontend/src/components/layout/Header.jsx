import Logo from '../ui/Logo.jsx'
import { navLinks } from '../../content/landing.js'
import styles from './Header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      <Logo />
      <nav className={styles.nav} aria-label="Main">
        {navLinks.map((link) => (
          <a key={link.label} href={link.href} className={styles.link}>
            {link.label}
          </a>
        ))}
      </nav>
      <a href="#account" className={`${styles.link} ${styles.account}`}>
        Account
      </a>
    </header>
  )
}
