import { useEffect, useRef, useState } from 'react'
import chevron from '../../assets/icons/chevron-down.png'
import copyIcon from '../../assets/icons/copy.png'
import enter from '../../assets/icons/enter.png'
import LanguageMenu from './LanguageMenu.jsx'
import { languageLabel } from '../../lib/detect.js'
import styles from './CodeToolbar.module.css'

/**
 * Notion's code block toolbar. `language` is Notion's language name.
 * With `onLanguageChange`, the label opens a language menu.
 * `popup` ({ kind: 'detected' | 'error', text }) shows the demo-style chip beside the label.
 */
export default function CodeToolbar({ language, onLanguageChange, popup, code, className = '', ...props }) {
  const [open, setOpen] = useState(false)
  const picker = useRef()
  const button = useRef()
  const label = languageLabel(language)

  // Close the menu when clicking anywhere else.
  useEffect(() => {
    if (!open) return
    const closeOutside = event => {
      if (!picker.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [open])

  function close() {
    setOpen(false)
    button.current?.focus()
  }

  return (
    <div className={`${styles.toolbar} ${className}`} {...props}>
      {popup && (
        <div className={styles.popup} data-popup={popup.kind} aria-hidden="true">
          <span className={styles.mark}>&lt;/&gt;</span>
          {popup.text}
        </div>
      )}
      <div className={styles.picker} ref={picker}>
        <button
          ref={button}
          type="button"
          className={styles.language}
          data-animate="language-label"
          data-glow={popup?.kind === 'detected' || undefined}
          aria-label={`Language: ${label}`}
          aria-haspopup={onLanguageChange ? 'listbox' : undefined}
          aria-expanded={onLanguageChange ? open : undefined}
          onClick={() => onLanguageChange && setOpen(o => !o)}
        >
          {label}
          <img src={chevron} alt="" className={styles.chevron} />
        </button>
        {open && (
          <LanguageMenu
            value={language}
            onSelect={value => {
              onLanguageChange(value)
              close()
            }}
            onClose={close}
          />
        )}
      </div>
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
