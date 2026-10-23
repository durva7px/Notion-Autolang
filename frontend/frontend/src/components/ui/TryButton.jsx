import styles from './TryButton.module.css'

export default function TryButton({ href = '#how-to-use', className = '', ...props }) {
  return (
    <a href={href} className={`${styles.button} ${className}`} {...props}>
      <span className={styles.label}>TRY</span>
      <span className={styles.circle} aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d="M4 12 12 4M5.5 4H12v6.5" fill="none" stroke="#bf22c7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </a>
  )
}
