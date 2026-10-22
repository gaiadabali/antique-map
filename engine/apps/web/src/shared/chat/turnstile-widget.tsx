'use client'

/**
 * Cloudflare Turnstile for the chat panel (AI.md §3.2; copied from
 * `sites/gallery/contact/turnstile-widget.tsx`, which copied it from the shop's, each project
 * folder its own so no site imports across sites — this one lives beside the panel instead,
 * since the chat is shared). Unlike the lead form, the chat needs the token the moment it is
 * minted, not at a later submit: this copy renders `size: 'invisible'` and takes a `callback`.
 */
import { useEffect, useRef } from 'react'

type TurnstileApi = {
  render(
    container: HTMLElement,
    options: { sitekey: string; size?: string; callback?: (token: string) => void },
  ): string
  reset(widgetId: string): void
  remove(widgetId: string): void
}

// Read through a local view of `window`, not a global declaration: the contact and partnership
// widgets each declare `Window.turnstile` with their own option type, and a third would conflict.
function turnstileApi(): TurnstileApi | undefined {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<void> | null = null

function loadTurnstile(): Promise<void> {
  if (turnstileApi()) return Promise.resolve()
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('turnstile did not load'))
    }
    document.head.append(script)
  })
  return loading
}

export function ChatTurnstile({
  siteKey,
  onToken,
}: {
  readonly siteKey: string
  readonly onToken: (token: string) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadTurnstile()
      .then(() => {
        const api = turnstileApi()
        if (cancelled || box.current === null || api === undefined) return
        widget.current = api.render(box.current, {
          sitekey: siteKey,
          size: 'invisible',
          callback: onToken,
        })
      })
      // A blocked script leaves no token: the panel's session start then fails closed.
      .catch(() => undefined)
    return () => {
      cancelled = true
      if (widget.current !== null) turnstileApi()?.remove(widget.current)
      widget.current = null
    }
    // `onToken` is a stable callback from the caller; only `siteKey` should re-run this effect.
  }, [siteKey])

  return <div ref={box} />
}
