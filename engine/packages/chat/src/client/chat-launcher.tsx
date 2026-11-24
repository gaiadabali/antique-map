'use client'

/**
 * The floating chat entry point (8.2.a): a button at the bottom right of every page until the
 * visitor opens it (a 48 px icon square on a phone, its words kept as the accessible name; the labelled
 * button from 48rem) — the panel's JavaScript, Turnstile's script and every chat-only string load
 * only then (React's `lazy`: the panel is never server-rendered, it draws only after a click, so it
 * needs none of `next/dynamic`'s server half — and the launcher, on every page, none of its code),
 * the same lazy-door pattern as `sites/gallery/item/zoom-lazy.tsx`. Open, the panel is fixed to the viewport: a full-height sheet
 * on a phone, a side panel from tablet up (DESIGN-SYSTEM.md §5). Every word arrives as a prop,
 * resolved server-side (`lexicon.chatPanelText`), so no lexicon ships before the visitor asks.
 * A site may keep the icon square at every width (`iconOnly`, the shop); its words stay the name.
 * It may also draw the round bubble (`icon="round"`) and set the button's radius (a token knob).
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react'

import { ChatIcon, RoundChatIcon } from './launcher-icons'
import type { ChatPanelProps } from './chat-panel'
import styles from './chat-launcher.module.css'

const ChatPanel = lazy(() => import('./chat-panel').then((m) => ({ default: m.ChatPanel })))

export type ChatLauncherProps = Omit<ChatPanelProps, 'onClose'> & {
  readonly label: string
  /** Stop above the site footer once it scrolls into view, keeping the usual gap (the shop). */
  readonly dock?: boolean
  /** The icon square at every width, its words only the accessible name (the shop). */
  readonly iconOnly?: boolean
  /** The launcher's glyph: the square-cornered bubble, or the round one (the shop). */
  readonly icon?: 'bubble' | 'round'
}

export function ChatLauncher({
  label,
  dock = false,
  iconOnly = false,
  icon = 'bubble',
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
        data-icon-only={iconOnly || undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className={styles.icon} aria-hidden="true">
          {icon === 'round' ? <RoundChatIcon /> : <ChatIcon />}
        </span>
        <span className={styles.text}>{label}</span>
      </button>
    )
  }

  return (
    <div className={styles.panel} role="dialog" aria-label={label}>
      <Suspense fallback={null}>
        <ChatPanel {...panelProps} onClose={closePanel} />
      </Suspense>
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
