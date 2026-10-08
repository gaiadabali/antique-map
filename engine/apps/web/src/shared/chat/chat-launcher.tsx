'use client'

/**
 * The floating chat entry point (8.2.a): a button at the bottom right of every page until the
 * visitor opens it — the panel's JavaScript, Turnstile's script and every chat-only string load
 * only then (`next/dynamic`, `ssr: false`), the same lazy-door pattern as
 * `sites/gallery/item/zoom-lazy.tsx`. Open, the panel is fixed to the viewport: a full-height sheet
 * on a phone, a side panel from tablet up (DESIGN-SYSTEM.md §5). Every word arrives as a prop,
 * resolved server-side (`lexicon.chatPanelText`), so no lexicon ships before the visitor asks.
 */
import dynamic from 'next/dynamic'
import { useRef, useState } from 'react'

import type { ChatPanelProps } from './chat-panel'
import styles from './chat-launcher.module.css'

const ChatPanel = dynamic<ChatPanelProps>(() => import('./chat-panel').then((m) => m.ChatPanel), {
  ssr: false,
})

export type ChatLauncherProps = Omit<ChatPanelProps, 'onClose'> & { readonly label: string }

export function ChatLauncher({ label, ...panelProps }: ChatLauncherProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const launcherRef = useRef<HTMLButtonElement>(null)

  function closePanel(): void {
    setOpen(false)
    // The launcher is back in the page once the panel closes; focus returns to it.
    requestAnimationFrame(() => launcherRef.current?.focus())
  }

  if (!open) {
    return (
      <button
        ref={launcherRef}
        type="button"
        className={styles.launcher}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className={styles.dot} aria-hidden="true" />
        {label}
      </button>
    )
  }

  return (
    <div className={styles.panel} role="dialog" aria-label={label}>
      <ChatPanel {...panelProps} onClose={closePanel} />
    </div>
  )
}
