'use client'

/**
 * The newsletter pop-up's door (TASKS.md 28.2; the owner's feedback of 2026-11-19): on the landing
 * page, once per visitor, a few seconds after the page has loaded — never over another open dialog —
 * and remembered in this browser the moment it shows, so it never asks twice. Storage may be blocked
 * (a private window): then it stays closed rather than ask on every visit. Only then does the
 * dialog's code load (`next/dynamic`, `ssr: false`: the shared `Dialog`, the form, Turnstile), so it
 * stays out of the home's first scripts and a visitor who has seen it never fetches it at all — the
 * same lazy-door pattern as the chat launcher. Renders nothing until it opens.
 */
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

import type { NewsletterDialogProps } from './newsletter-dialog'
import { NEWSLETTER_DELAY_MS, NEWSLETTER_SEEN_KEY } from './state'

const NewsletterDialog = dynamic<NewsletterDialogProps>(
  () => import('./newsletter-dialog').then((module) => module.NewsletterDialog),
  { ssr: false },
)

/** Whether this browser has seen the pop-up; `true` too when storage cannot be read. */
function seen(): boolean {
  try {
    return window.localStorage.getItem(NEWSLETTER_SEEN_KEY) !== null
  } catch {
    return true
  }
}

function remember(): void {
  try {
    window.localStorage.setItem(NEWSLETTER_SEEN_KEY, new Date().toISOString())
  } catch {
    // Storage blocked: nothing to remember with, and `seen()` already answered yes.
  }
}

export function NewsletterDoor(props: NewsletterDialogProps) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (seen()) return
    const timer = window.setTimeout(() => {
      // Never over the menu, the enlarged print or the chat: the next visit asks instead.
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return
      remember()
      setShown(true)
    }, NEWSLETTER_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return shown ? <NewsletterDialog {...props} /> : null
}
