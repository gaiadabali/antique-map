'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'

import styles from './dialog.module.css'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** The close button's accessible name. Defaults to English; a caller in a lexicon locale
   * passes its own word (qa 4.qa, finding F3 — no component may hold its own English copy). */
  closeLabel?: string
}

export function Dialog({ open, onClose, title, children, closeLabel = 'Close' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open) {
      opener.current = document.activeElement as HTMLElement | null
      if (!dialog.open) {
        dialog.showModal()
      }
    } else if (dialog.open) {
      dialog.close()
    }
  }, [open])

  const onCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault()
      onClose()
    },
    [onClose],
  )

  const onAnimationEnd = useCallback(() => {
    if (!open) {
      opener.current?.focus?.()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onCancel={onCancel}
      onClose={onClose}
      onAnimationEnd={onAnimationEnd}
      aria-labelledby="dialog-title"
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id="dialog-title" className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} aria-label={closeLabel} onClick={onClose}>
            ×
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  )
}
