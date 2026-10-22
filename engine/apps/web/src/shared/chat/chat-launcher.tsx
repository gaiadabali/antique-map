'use client'

/**
 * The floating chat entry point (8.2.a): a button at the bottom right of every page until the
 * visitor opens it (a 48 px icon square on a phone, its words kept as the accessible name; the labelled
 * button from 48rem) — the panel's JavaScript, Turnstile's script and every chat-only string load
 * only then (`next/dynamic`, `ssr: false`), the same lazy-door pattern as
 * `sites/gallery/item/zoom-lazy.tsx`. Open, the panel is fixed to the viewport: a full-height sheet
 * on a phone, a side panel from tablet up (DESIGN-SYSTEM.md §5). Every word arrives as a prop,
 * resolved server-side (`lexicon.chatPanelText`), so no lexicon ships before the visitor asks.
 */
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

import { ChatIcon } from './chat-icons'
import type { ChatPanelProps } from './chat-panel'
import styles from './chat-launcher.module.css'

const ChatPanel = dynamic<ChatPanelProps>(() => import('./chat-panel').then((m) => m.ChatPanel), {
  ssr: false,
})

export type ChatLauncherProps = Omit<ChatPanelProps, 'onClose'> & {
  readonly label: string
  /** Stop above the site footer once it scrolls into view, keeping the usual gap (the shop). */
  readonly dock?: boolean
}

export function ChatLauncher({
  label,
  dock = false,
  ...panelProps
}: ChatLauncherProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const launcherRef = useRef<HTMLButtonElement>(null)
  useDock(launcherRef, dock && !open)

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
        data-dock={dock || undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className={styles.icon} aria-hidden="true">
          <ChatIcon />
        </span>
        <span className={styles.text}>{label}</span>
      </button>
    )
  }

  return (
    <div className={styles.panel} role="dialog" aria-label={label}>
      <ChatPanel {...panelProps} onClose={closePanel} />
    </div>
  )
}

/**
 * The launcher rides up with the page once the site footer reaches it (the handoff's `dock()`),
 * so it stops above the footer's edge with its usual bottom gap and never covers the footer. The
 * footer is the launcher's own preceding sibling, never a card's or a quote's.
 */
function useDock(ref: React.RefObject<HTMLButtonElement | null>, on: boolean): void {
  useEffect(() => {
    const launcher = ref.current
    if (!on || !launcher) return
    let footer = launcher.previousElementSibling
    while (footer && footer.tagName !== 'FOOTER') footer = footer.previousElementSibling
    if (!footer) return
    const edge = footer
    let frame = 0
    const set = () => {
      frame = 0
      const lift = Math.max(0, window.innerHeight - edge.getBoundingClientRect().top)
      launcher.style.translate = lift > 0 ? `0 ${-Math.round(lift)}px` : ''
    }
    const request = () => {
      if (!frame) frame = requestAnimationFrame(set)
    }
    window.addEventListener('scroll', request, { passive: true, capture: true })
    window.addEventListener('resize', request)
    const observer = new ResizeObserver(request)
    observer.observe(document.body)
    set()
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', request, { capture: true })
      window.removeEventListener('resize', request)
      observer.disconnect()
      launcher.style.translate = ''
    }
  }, [ref, on])
}
