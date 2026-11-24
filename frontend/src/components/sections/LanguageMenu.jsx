import { useEffect, useMemo, useRef, useState } from 'react'
import { NOTION_LANGUAGES } from '../../lib/placeholder.js'
import { languageLabel } from '../../lib/detect.js'
import styles from './LanguageMenu.module.css'

// Alphabetical by the name Notion shows, as in Notion's own menu.
const OPTIONS = NOTION_LANGUAGES.map(value => ({ value, label: languageLabel(value) })).sort((a, b) =>
  a.label.localeCompare(b.label),
)

/**
 * Notion's code block language menu: a search box over every language.
 * Enter picks the highlighted match, arrows move, Escape closes.
 */
export default function LanguageMenu({ value, onSelect, onClose, className = '' }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const list = useRef()

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? OPTIONS.filter(o => o.label.toLowerCase().includes(q) || o.value.includes(q)) : OPTIONS
  }, [query])

  // Open on the current language; keep the highlighted one in view.
  useEffect(() => {
    const index = options.findIndex(o => o.value === value)
    if (!query && index >= 0) setActive(index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    list.current?.children[active]?.scrollIntoView?.({ block: 'nearest' })
  }, [active])

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = options[active] ?? options[0]
      if (option) onSelect(option.value)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive(i => Math.min(Math.max(i + step, 0), options.length - 1))
    }
  }

  return (
    <div className={`${styles.menu} ${className}`}>
      <input
        type="search"
        className={styles.search}
        placeholder="Search for a language…"
        aria-label="Search languages"
        aria-controls="playground-languages"
        aria-activedescendant={options[active] ? `language-${options[active].value}` : undefined}
        value={query}
        onChange={event => {
          setQuery(event.target.value)
          setActive(0)
        }}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <ul ref={list} id="playground-languages" role="listbox" aria-label="Languages" className={styles.list}>
        {options.map((option, index) => (
          <li
            key={option.value}
            id={`language-${option.value}`}
            role="option"
            aria-selected={option.value === value}
            data-active={index === active || undefined}
            className={styles.option}
            onMouseEnter={() => setActive(index)}
            onMouseDown={event => event.preventDefault()}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </li>
        ))}
        {options.length === 0 && <li className={styles.empty}>No results</li>}
      </ul>
    </div>
  )
}
