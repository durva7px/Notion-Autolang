import { useEffect, useState } from 'react'
import Logo from '../ui/Logo.jsx'
import { navLinks, faqLink } from '../../content/landing.js'
import styles from './Header.module.css'

const isScrolled = () => window.scrollY > 8

/** Sticky site header. `data-scrolled` adds a shadow once content slides under it. */
export default function Header() {
  const [scrolled, setScrolled] = useState(isScrolled)

  useEffect(() => {
    const onScroll = () => setScrolled(isScrolled())
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={styles.bar} data-scrolled={scrolled}>
      <div className={styles.header}>
        <Logo />
        <nav className={styles.nav} aria-label="Main">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className={styles.link}>
              {link.label}
            </a>
          ))}
        </nav>
        <a href={faqLink.href} className={`${styles.link} ${styles.end}`}>
          {faqLink.label}
        </a>
      </div>
    </header>
  )
}
