import type { ReactNode, Ref } from 'react'

import styles from './chat-shell.module.css'

export type ChatShellProps = {
  /** The designed header (identity, actions). Without it, a plain titled header with a close button. */
  readonly header?: ReactNode
  readonly title?: string
  readonly children?: ReactNode
  readonly composer?: ReactNode
  readonly disclosure?: ReactNode
  readonly onClose?: () => void
  readonly closeLabel?: string
  /** The accessible name of the conversation log. */
  readonly logLabel?: string
  /** The scrolling log, for a caller that keeps it scrolled to the newest message. */
  readonly logRef?: Ref<HTMLDivElement>
}

/**
 * Panel frame for the chat: header, scrollable log, composer slot and disclosure slot. The frame is
 * layout and surfaces only; the messenger's own parts (header, bubbles, composer) are the caller's.
 */
export function ChatShell({
  header,
  title = 'Chat',
  children,
  composer,
  disclosure,
  onClose,
  closeLabel = 'Close chat',
  logLabel,
  logRef,
}: ChatShellProps): React.ReactElement {
  return (
    <div className={styles.shell}>
      {header ?? (
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.close}
            aria-label={closeLabel}
            title={closeLabel}
            onClick={onClose}
          >
            ×
          </button>
        </div>
      )}

      <div ref={logRef} role="log" aria-live="polite" aria-label={logLabel} className={styles.log}>
        {children}
      </div>

      {composer && <div className={styles.composer}>{composer}</div>}
      {disclosure && <div className={styles.disclosure}>{disclosure}</div>}
    </div>
  )
}
