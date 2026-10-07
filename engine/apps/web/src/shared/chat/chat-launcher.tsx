'use client'

/**
 * The header's chat entry point (8.2.a): a plain button until the visitor opens it — the panel's
 * JavaScript, Turnstile's script and every chat-only string load only then (`next/dynamic`,
 * `ssr: false`), the same lazy-door pattern as `sites/gallery/item/zoom-lazy.tsx`. Every word
 * arrives as a prop, resolved server-side (`lexicon.chatPanelText`), so no lexicon ships before
 * the visitor asks for it.
 */
import dynamic from 'next/dynamic'
import { useRef, useState } from 'react'

// From its own folder, never the `shared/ui` barrel — a Client Component importing the barrel
// ships every shared component to the browser (5.5 Lighthouse follow-up).
import { Button } from '../ui/button'
import type { ChatPanelProps } from './chat-panel'

const ChatPanel = dynamic<ChatPanelProps>(() => import('./chat-panel').then((m) => m.ChatPanel), {
  ssr: false,
})

export type ChatLauncherProps = Omit<ChatPanelProps, 'onClose'> & { readonly label: string }

export function ChatLauncher({ label, ...panelProps }: ChatLauncherProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const restoreFocus = useRef<HTMLElement | null>(null)

  function openPanel(): void {
    restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setOpen(true)
  }

  function closePanel(): void {
    setOpen(false)
    restoreFocus.current?.focus()
  }

  if (!open) {
    return (
      <Button variant="quiet" size="small" type="button" onClick={openPanel}>
        {label}
      </Button>
    )
  }

  return <ChatPanel {...panelProps} onClose={closePanel} />
}
