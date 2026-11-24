import { useEffect } from 'react'
import Header from '../components/layout/Header.jsx'
import Footer from '../components/layout/Footer.jsx'
import Section from '../components/ui/Section.jsx'
import { faqGroups, faqs } from '../content/faq.js'
import styles from './FaqPage.module.css'

/** /faq: questions grouped by topic; each one opens in place and has its own #anchor. */
export default function FaqPage() {
  useEffect(() => {
    const previous = document.title
    document.title = 'FAQ · Notion AutoLang'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <>
      <Header />
      <main>
        <section className={styles.hero} data-section="faq">
          <div className={styles.inner}>
            <p className={styles.eyebrow}>FAQ</p>
            <h1 className={styles.heading}>
              <span className={styles.lineOne}>Frequently asked</span>{' '}
              <span className={styles.lineTwo}>
                questions<span className={styles.dot}>.</span>
              </span>
            </h1>
            <p className={styles.intro}>
              What AutoLang can see in Notion, what it keeps, and how it decides a code block&apos;s language.
            </p>
          </div>
        </section>

        {faqGroups.map(group => (
          <Section key={group.id} id={group.id} title={group.title}>
            <div className={styles.list}>
              {faqs
                .filter(faq => faq.group === group.id)
                .map(faq => (
                  <Question key={faq.id} {...faq} />
                ))}
            </div>
          </Section>
        ))}
      </main>
      <Footer />
    </>
  )
}

function Question({ id, question, answer, link }) {
  return (
    <details id={id} className={styles.item}>
      <summary className={styles.question}>
        <span>{question}</span>
        <span className={styles.marker} aria-hidden="true" />
      </summary>
      <div className={styles.answer}>
        {answer.map(paragraph => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {link && (
          <a
            href={link.href}
            className={styles.link}
            {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {link.label} →
          </a>
        )}
      </div>
    </details>
  )
}
