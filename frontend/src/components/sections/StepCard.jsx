import Emoji from '../ui/Emoji.jsx'
import styles from './StepCard.module.css'

/** A numbered step. With `href` the whole card is a link; links to other sites open in a new tab. */
export default function StepCard({ number, title, icon, description, href, className = '', ...props }) {
  const Tag = href ? 'a' : 'article'
  const external = /^https?:\/\//.test(href ?? '') ? { target: '_blank', rel: 'noopener noreferrer' } : {}
  return (
    <Tag
      href={href}
      className={`${styles.card} ${href ? styles.link : ''} ${className}`}
      data-animate="step"
      {...external}
      {...props}
    >
      <span className={styles.number}>{number}</span>
      <div>
        <h3 className={styles.title}>
          {title} {icon && <Emoji src={icon} />}
        </h3>
        <p className={styles.description}>{description}</p>
      </div>
    </Tag>
  )
}
