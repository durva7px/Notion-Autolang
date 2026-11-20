import { useState } from 'react'
import CodeToolbar from './CodeToolbar.jsx'
import styles from './CodeBlock.module.css'

/**
 * A Notion-style code block. Editable; `language` is shown in the toolbar.
 * Detection is not wired up yet: `onCodeChange` is the hook for it.
 */
export default function CodeBlock({ initialCode = '', language, onCodeChange, className = '', ...props }) {
  const [code, setCode] = useState(initialCode)

  function handleChange(event) {
    setCode(event.target.value)
    onCodeChange?.(event.target.value)
  }

  return (
    <div className={`${styles.block} ${className}`} data-animate="code-block" {...props}>
      <CodeToolbar language={language} code={code} className={styles.toolbar} />
      <textarea
        className={styles.editor}
        value={code}
        onChange={handleChange}
        spellCheck={false}
        aria-label="Code snippet"
        rows={code.split('\n').length}
      />
    </div>
  )
}
