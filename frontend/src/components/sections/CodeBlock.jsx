import { useState } from 'react'
import CodeToolbar from './CodeToolbar.jsx'
import styles from './CodeBlock.module.css'

/**
 * A Notion-style code block. Editable; `language` (Notion's name) is shown in the toolbar.
 * `onCodeChange` gets the new code on every edit. `onLanguageChange`, `popup` and
 * `placeholder` pass through to the toolbar and editor.
 */
export default function CodeBlock({
  initialCode = '',
  language,
  onLanguageChange,
  popup,
  placeholder,
  onCodeChange,
  className = '',
  ...props
}) {
  const [code, setCode] = useState(initialCode)

  function handleChange(event) {
    setCode(event.target.value)
    onCodeChange?.(event.target.value)
  }

  const shown = code || placeholder || ''

  return (
    <div className={`${styles.block} ${className}`} data-animate="code-block" {...props}>
      <CodeToolbar
        language={language}
        onLanguageChange={onLanguageChange}
        popup={popup}
        code={code}
        className={styles.toolbar}
      />
      <textarea
        className={styles.editor}
        value={code}
        placeholder={placeholder}
        onChange={handleChange}
        spellCheck={false}
        aria-label="Code snippet"
        rows={shown.split('\n').length}
      />
    </div>
  )
}
