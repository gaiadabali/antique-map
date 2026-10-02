import type { InputHTMLAttributes, ReactNode } from 'react'

import styles from './Checkbox.module.css'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode
  id: string
  hint?: ReactNode
  error?: ReactNode
}

export function Checkbox({ label, id, hint, error, className, ...rest }: Props) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <input
          {...rest}
          id={id}
          type="checkbox"
          className={[styles.input, className ?? ''].filter(Boolean).join(' ')}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          aria-invalid={error ? 'true' : undefined}
        />
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      </div>
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
