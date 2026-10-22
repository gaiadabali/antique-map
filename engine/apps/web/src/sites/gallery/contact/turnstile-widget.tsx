'use client'

/**
 * Cloudflare Turnstile on the gallery's lead form (SECURITY.md §2.10; the shop's partnership
 * form's widget, copied into the gallery's folder so no site imports across sites). The script
 * loads once, on the visitor's device, only where a form needs it; the widget is rendered
 * explicitly into this box and inserts its answer as the hidden field `cf-turnstile-response`
 * inside the surrounding `<form>`, which the island reads before it posts.
 *
 * A token works once, so the island passes a new `resetToken` after every submit and the widget
 * asks for a fresh one. The site key is public config and arrives in server-rendered props
 * (SECURITY.md K2: no `NEXT_PUBLIC_*`).
 */
import { useEffect, useRef } from 'react'

import styles from './contact-form.module.css'

type TurnstileApi = {
  render(container: HTMLElement, options: { sitekey: string; theme?: string }): string
  reset(widgetId: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loading: Promise<void> | null = null

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
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

export function TurnstileWidget({
  siteKey,
  resetToken,
}: {
  readonly siteKey: string
  /** Any value that changes whenever the form was submitted: the widget then gets a new token. */
  readonly resetToken: unknown
}) {
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const firstToken = useRef(resetToken)

  useEffect(() => {
    let cancelled = false
    loadTurnstile()
      .then(() => {
        if (cancelled || box.current === null || window.turnstile === undefined) return
        widget.current = window.turnstile.render(box.current, { sitekey: siteKey, theme: 'auto' })
      })
      // A blocked script leaves no token: the server then refuses the post (it fails closed).
      .catch(() => undefined)
    return () => {
      cancelled = true
      if (widget.current !== null) window.turnstile?.remove(widget.current)
      widget.current = null
    }
  }, [siteKey])

  useEffect(() => {
    if (resetToken === firstToken.current) return
    if (widget.current !== null) window.turnstile?.reset(widget.current)
  }, [resetToken])

  return <div ref={box} className={styles.widget} />
}
