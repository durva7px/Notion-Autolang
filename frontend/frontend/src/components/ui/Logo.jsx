import styles from './Logo.module.css'

export default function Logo({ className = '', ...props }) {
  return (
    <a href="/" className={`${styles.logo} ${className}`} aria-label="Notion AutoLang home" {...props}>
      <svg className={styles.mark} viewBox="36 45 57 57" aria-hidden="true">
        <rect x="36" y="45" width="57" height="57" rx="8" fill="var(--color-logo-bg)" />
        <path
          d="M47.693 74.556L51.719 66.537H57.461L53.567 74.556L57.461 82.575H51.719L47.693 74.556ZM70.3942 59.112L64.3222 90H58.7782L64.8502 59.112H70.3942ZM81.502 74.556L77.476 82.608H71.734L75.628 74.556L71.734 66.537H77.476L81.502 74.556Z"
          fill="var(--color-accent-pink)"
        />
      </svg>
      <span className={styles.wordmark}>
        Notion
        <br />
        AutoLang
      </span>
    </a>
  )
}
