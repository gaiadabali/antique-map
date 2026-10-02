import type { ReactNode, TextareaHTMLAttributes } from 'react'

import styles from './Textarea.module.css'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: ReactNode
  id: string
  hint?: ReactNode
  error?: ReactNode
}

export function Textarea({ label, id, hint, error, className, ...rest }: Props) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className={styles.root}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <textarea
        {...rest}
        id={id}
        className={[styles.textarea, className ?? ''].filter(Boolean).join(' ')}
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
