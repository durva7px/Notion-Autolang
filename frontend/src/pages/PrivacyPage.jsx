import { useEffect } from 'react'
import Header from '../components/layout/Header.jsx'
import Footer from '../components/layout/Footer.jsx'
import Section from '../components/ui/Section.jsx'
import { EFFECTIVE_DATE, privacySections } from '../content/privacy.js'
import faqStyles from './FaqPage.module.css'
import styles from './PrivacyPage.module.css'

/** /privacy: the privacy policy the Chrome Web Store listing links to. */
export default function PrivacyPage() {
  useEffect(() => {
    const previous = document.title
    document.title = 'Privacy policy · Notion AutoLang'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <>
      <Header />
      <main>
        <section className={faqStyles.hero} data-section="privacy">
          <div className={faqStyles.inner}>
            <p className={faqStyles.eyebrow}>Privacy</p>
            <h1 className={faqStyles.heading}>
              <span className={faqStyles.lineOne}>Privacy</span>{' '}
              <span className={faqStyles.lineTwo}>
                policy<span className={faqStyles.dot}>.</span>
              </span>
            </h1>
            <p className={faqStyles.intro}>
              Effective <time dateTime="2026-11-24">{EFFECTIVE_DATE}</time>. What the Notion AutoLang extension,
              backend and website do with your data.
            </p>
          </div>
        </section>

        {privacySections.map(({ id, title, paragraphs, link }) => (
          <Section key={id} id={id} title={title}>
            <div className={styles.body}>
              {paragraphs.map(text => (
                <p key={text}>{text}</p>
              ))}
              {link && (
                <a className={faqStyles.link} href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              )}
            </div>
          </Section>
        ))}
      </main>
      <Footer />
    </>
  )
}
