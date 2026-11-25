'use client'

/**
 * The newsletter pop-up's door (TASKS.md 28.2; the owner's feedback of 2026-11-19): on the landing
 * page, a beat after the page has loaded — never over another open dialog — on every visit and
 * every reload (the UI/UX revision of 2026-11-25), until this browser has signed up
 * (`NEWSLETTER_JOINED_KEY`, set by the dialog on success). Storage may be blocked (a private
 * window): then nothing is remembered and it keeps asking. Only then does the dialog's code load
 * (`next/dynamic`, `ssr: false`: the shared `Dialog`, the form, Turnstile), so it stays out of the
 * home's first scripts and a visitor who has signed up never fetches it at all — the same
 * lazy-door pattern as the chat launcher. Renders nothing until it opens.
 */
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

import type { NewsletterDialogProps } from './newsletter-dialog'
import { NEWSLETTER_DELAY_MS, NEWSLETTER_JOINED_KEY } from './state'

const NewsletterDialog = dynamic<NewsletterDialogProps>(
  () => import('./newsletter-dialog').then((module) => module.NewsletterDialog),
  { ssr: false },
)

/** Whether this browser has signed up; `false` when storage cannot be read. */
function joined(): boolean {
  try {
    return window.localStorage.getItem(NEWSLETTER_JOINED_KEY) !== null
  } catch {
    return false
  }
}

export function NewsletterDoor(props: NewsletterDialogProps) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (joined()) return
    const timer = window.setTimeout(() => {
      // Never over the menu, the enlarged print or the chat: the next load asks instead.
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return
      setShown(true)
    }, NEWSLETTER_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return shown ? <NewsletterDialog {...props} /> : null
}
