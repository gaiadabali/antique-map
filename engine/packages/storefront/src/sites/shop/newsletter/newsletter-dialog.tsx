'use client'

/**
 * The newsletter pop-up (TASKS.md 28.2; the owner's feedback of 2026-11-19): on the landing page,
 * once per visitor. A real modal dialog (the shared `Dialog`: the page behind is inert, focus stays
 * inside, Esc closes, the title labels it), opened a few seconds after the page has loaded — never
 * over another open dialog — and remembered in this browser the moment it shows, so it never asks
 * twice. Storage may be blocked (a private window): then it stays closed rather than ask on every
 * visit. The form posts an email and the consent to the lead service (`./action`), Turnstile as
 * every lead form. Every word arrives as a prop.
 */
import { useActionState, useEffect, useState } from 'react'

import { Button } from '@engine/ui/button'
import { Checkbox } from '@engine/ui/checkbox'
import { Dialog } from '@engine/ui/dialog'
import { FormMessage } from '@engine/ui/form-message'
import { Input } from '@engine/ui/input'

import { TurnstileWidget } from '../partnership/turnstile-widget'
import { submitNewsletter } from './action'
import styles from './newsletter.module.css'
import {
  INITIAL_NEWSLETTER_STATE,
  NEWSLETTER_DELAY_MS,
  NEWSLETTER_SEEN_KEY,
  type NewsletterText,
} from './state'

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

export function NewsletterDialog({
  text,
  locale,
  siteKey,
  privacyHref,
}: {
  readonly text: NewsletterText
  readonly locale: 'en' | 'id'
  readonly siteKey: string | null
  readonly privacyHref: string
}) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(submitNewsletter, INITIAL_NEWSLETTER_STATE)

  useEffect(() => {
    if (seen()) return
    const timer = window.setTimeout(() => {
      // Never over the menu, the enlarged print or the chat: the next visit asks instead.
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return
      remember()
      setOpen(true)
    }, NEWSLETTER_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const say = (key: string | undefined) =>
    key === undefined ? undefined : (text.errors[key] ?? text.errors['lead.error.invalid'])

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title={text.title} closeLabel={text.close}>
      {state.status === 'success' ? (
        <FormMessage tone="success">{text.success}</FormMessage>
      ) : (
        <form className={styles.form} action={action} noValidate>
          <p className={styles.text}>{text.text}</p>
          <input type="hidden" name="locale" value={locale} />
          <Input
            label={text.email}
            id="newsletter-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={state.email}
            error={say(state.errors.email ?? state.errors.contact)}
            required
          />
          <Checkbox
            label={text.consent}
            id="newsletter-consent"
            name="consent"
            error={say(state.errors.consent)}
            required
          />
          {siteKey !== null && <TurnstileWidget siteKey={siteKey} resetToken={state} />}
          {state.errors.form !== undefined && (
            <FormMessage tone="error">{say(state.errors.form)}</FormMessage>
          )}
          <div className={styles.actions}>
            <Button variant="primary" size="small" type="submit" disabled={pending}>
              {pending ? text.sending : text.submit}
            </Button>
            <a href={privacyHref} className={styles.privacy}>
              {text.privacy}
            </a>
          </div>
        </form>
      )}
    </Dialog>
  )
}
