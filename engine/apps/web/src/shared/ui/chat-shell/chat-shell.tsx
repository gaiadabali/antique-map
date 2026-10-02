import type { ReactNode } from 'react'

import styles from './chat-shell.module.css'

export type ChatShellProps = {
  readonly title?: string
  readonly children?: ReactNode
  readonly composer?: ReactNode
  readonly disclosure?: ReactNode
  readonly onClose?: () => void
  readonly closeLabel?: string
}

/** Panel frame for the chat: header, scrollable log, composer slot and disclosure slot. */
export function ChatShell({
  title = 'Chat',
  children,
  composer,
  disclosure,
  onClose,
  closeLabel = 'Close chat',
}: ChatShellProps): React.ReactElement {
  return (
    <div className={styles.shell}>
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

      <div role="log" aria-live="polite" className={styles.log}>
        {children}
      </div>

      {composer && <div className={styles.composer}>{composer}</div>}
      {disclosure && <div className={styles.disclosure}>{disclosure}</div>}
    </div>
  )
}
