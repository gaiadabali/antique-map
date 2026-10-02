import type { ReactNode, SelectHTMLAttributes } from 'react'

import styles from './Select.module.css'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: ReactNode
  id: string
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
}

export function Select({ label, id, hint, error, className, children, ...rest }: Props) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className={styles.root}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select
        {...rest}
        id={id}
        className={[styles.select, className ?? ''].filter(Boolean).join(' ')}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? 'true' : undefined}
      >
        {children}
      </select>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
