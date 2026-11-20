import chevron from '../../assets/icons/chevron-down.png'
import copyIcon from '../../assets/icons/copy.png'
import enter from '../../assets/icons/enter.png'
import styles from './CodeToolbar.module.css'

export default function CodeToolbar({ language, code, className = '', ...props }) {
  return (
    <div className={`${styles.toolbar} ${className}`} {...props}>
      <button type="button" className={styles.language} data-animate="language-label">
        {language}
        <img src={chevron} alt="" className={styles.chevron} />
      </button>
      <span className={styles.separator} aria-hidden="true" />
      <button
        type="button"
        className={styles.iconButton}
        aria-label="Copy code"
        onClick={() => navigator.clipboard?.writeText(code)}
      >
        <img src={copyIcon} alt="" className={styles.copy} />
      </button>
      <button type="button" className={styles.iconButton} aria-label="Wrap lines">
        <img src={enter} alt="" />
      </button>
      <button type="button" className={`${styles.iconButton} ${styles.more}`} aria-label="More options">
        <span />
        <span />
        <span />
      </button>
    </div>
  )
}
