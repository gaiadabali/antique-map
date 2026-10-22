import type { InputHTMLAttributes, ReactNode } from 'react'

import styles from './input.module.css'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode
  id: string
  hint?: ReactNode
  error?: ReactNode
}

export function Input({ label, id, hint, error, className, ...rest }: Props) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className={styles.root}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        {...rest}
        id={id}
        className={[styles.input, className ?? ''].filter(Boolean).join(' ')}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? 'true' : undefined}
      />
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
