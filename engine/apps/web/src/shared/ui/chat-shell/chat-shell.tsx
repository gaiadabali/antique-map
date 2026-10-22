import type { ReactNode, Ref } from 'react'

import styles from './chat-shell.module.css'

export type ChatShellProps = {
  /** The designed header (identity, actions). Without it, a plain titled header with a close button. */
  readonly header?: ReactNode
  readonly title?: string
  readonly children?: ReactNode
  readonly composer?: ReactNode
  readonly disclosure?: ReactNode
  /** Where the disclosure sits: under the composer (default) or as a band under the header. */
  readonly disclosureAt?: 'top' | 'bottom'
  /** Fixed content between the log and the composer, such as suggested questions. */
  readonly tray?: ReactNode
  readonly onClose?: () => void
  readonly closeLabel?: string
  /** The accessible name of the conversation log. */
  readonly logLabel?: string
  /** The scrolling log, for a caller that keeps it scrolled to the newest message. */
  readonly logRef?: Ref<HTMLDivElement>
}

/**
 * Panel frame for the chat: header, scrollable log, an optional tray, composer slot and disclosure
 * slot (under the composer, or as a band under the header). The frame is
 * layout and surfaces only; the messenger's own parts (header, bubbles, composer) are the caller's.
 */
export function ChatShell({
  header,
  title = 'Chat',
  children,
  composer,
  disclosure,
  disclosureAt = 'bottom',
  tray,
  onClose,
  closeLabel = 'Close chat',
  logLabel,
  logRef,
}: ChatShellProps): React.ReactElement {
  return (
    // data-chat: the hook a site's tokens use to tune shared parts inside the panel (its buttons)
    <div className={styles.shell} data-chat="">
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
      {disclosure && disclosureAt === 'top' && (
        <div className={styles.disclosure} data-at="top">
          {disclosure}
        </div>
      )}

      {/* Focusable, so a keyboard can scroll the conversation once it outgrows the panel
          (axe scrollable-region-focusable). */}
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label={logLabel}
        tabIndex={0}
        className={styles.log}
      >
        {children}
      </div>

      {tray && <div className={styles.tray}>{tray}</div>}
      {composer && <div className={styles.composer}>{composer}</div>}
      {disclosure && disclosureAt === 'bottom' && (
        <div className={styles.disclosure}>{disclosure}</div>
      )}
    </div>
  )
}
