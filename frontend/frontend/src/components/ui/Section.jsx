import Divider from './Divider.jsx'
import styles from './Section.module.css'

/**
 * A page section: optional top divider, centered mono heading, then children.
 * `id` doubles as the anchor and a stable hook for scroll-triggered animations.
 */
export default function Section({ id, title, titleAccessory, divider = true, className = '', children, ...props }) {
  return (
    <section id={id} className={`${styles.section} ${className}`} data-section={id} {...props}>
      {divider && <Divider />}
      <div className={styles.inner}>
        {title && (
          <h2 className={styles.title} data-animate="heading">
            {title}
            {titleAccessory}
          </h2>
        )}
        {children}
      </div>
    </section>
  )
}
