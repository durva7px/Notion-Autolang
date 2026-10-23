import Emoji from '../ui/Emoji.jsx'
import styles from './StepCard.module.css'

export default function StepCard({ number, title, icon, description, className = '', ...props }) {
  return (
    <article className={`${styles.card} ${className}`} data-animate="step" {...props}>
      <span className={styles.number}>{number}</span>
      <div>
        <h3 className={styles.title}>
          {title} {icon && <Emoji src={icon} />}
        </h3>
        <p className={styles.description}>{description}</p>
      </div>
    </article>
  )
}
