'use client'

import { useCallback, useEffect, useRef, type MouseEvent, type ReactNode } from 'react'

import styles from './dialog.module.css'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** The close button's accessible name. Defaults to English; a caller in a lexicon locale
   * passes its own word (qa 4.qa, finding F3 — no component may hold its own English copy). */
  closeLabel?: string
  /** `panel` (the default): a card with a title bar. `lightbox`: a picture on a deep scrim, the
   * title read by assistive technology only, the close button in the window's corner, and a
   * click on the scrim closes it. */
  variant?: 'panel' | 'lightbox'
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  closeLabel = 'Close',
  variant = 'panel',
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const lightbox = variant === 'lightbox'

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

  // A lightbox fills the window, so a click that lands on the dialog itself is on the scrim.
  const onClick = useCallback(
    (e: MouseEvent<HTMLDialogElement>) => {
      if (lightbox && e.target === e.currentTarget) onClose()
    },
    [lightbox, onClose],
  )

  return (
    <dialog
      ref={ref}
      className={lightbox ? `${styles.dialog} ${styles.lightbox}` : styles.dialog}
      onCancel={onCancel}
      onClose={onClose}
      onClick={onClick}
      onAnimationEnd={onAnimationEnd}
      aria-labelledby="dialog-title"
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id="dialog-title" className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} aria-label={closeLabel} onClick={onClose}>
            {lightbox ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              '×'
            )}
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  )
}
