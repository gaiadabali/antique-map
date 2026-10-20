'use client'

/**
 * The header's search: a magnifier that opens a bar under the header with one field, which sends a
 * plain GET to the search page (`?q=`), so it works the same without JavaScript once open. Escape
 * or the close button folds it away and hands focus back to the magnifier. Every word is a prop.
 */
import { useEffect, useId, useRef, useState } from 'react'

import styles from './search-bar.module.css'

type Props = {
  /** The search page's address (no query). */
  readonly action: string
  readonly openLabel: string
  readonly fieldLabel: string
  readonly submitLabel: string
  readonly closeLabel: string
}

export function SearchBar({ action, openLabel, fieldLabel, submitLabel, closeLabel }: Props) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const field = useRef<HTMLInputElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    field.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      toggle.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        ref={toggle}
        type="button"
        className={styles.icon}
        aria-label={openLabel}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((was) => !was)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <form id={id} className={styles.bar} action={action} method="get" role="search">
          <label htmlFor={`${id}-q`} className={styles.label}>
            {fieldLabel}
          </label>
          <input
            ref={field}
            id={`${id}-q`}
            className={styles.field}
            type="search"
            name="q"
            required
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="submit" className={styles.submit}>
            {submitLabel}
          </button>
          <button
            type="button"
            className={styles.close}
            aria-label={closeLabel}
            onClick={() => {
              setOpen(false)
              toggle.current?.focus()
            }}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </form>
      )}
    </>
  )
}
