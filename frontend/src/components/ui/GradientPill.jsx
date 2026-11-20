import styles from './GradientPill.module.css'

/**
 * Dark pill with a peach-to-magenta gradient border and gradient text.
 * Renders an <a> when given href, otherwise a <span>.
 * variant: "dark" (default) | "slate"
 */
export default function GradientPill({ href, icon, children, trailingArrow = false, variant = 'dark', className = '', ...props }) {
  const Tag = href ? 'a' : 'span'
  return (
    <Tag href={href} className={`${styles.pill} ${styles[variant]} ${className}`} {...props}>
      {icon && <img src={icon} alt="" aria-hidden="true" className={styles.icon} />}
      <span className={styles.label}>{children}</span>
      {trailingArrow && (
        <svg className={styles.arrow} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 8h11M9 3.5 13.5 8 9 12.5" fill="none" stroke="#fcd2a8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </Tag>
  )
}
