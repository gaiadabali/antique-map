'use client'

/**
 * The newsletter pop-up's dialog (TASKS.md 28.2), loaded by its door (`./newsletter-door`) only
 * when the pop-up opens, and open from the moment it mounts. A real modal dialog (the shared
 * `Dialog`: the page behind is inert, focus stays inside, Esc closes, the title labels it). The
 * form posts an email and the consent to the lead service (`./action`), Turnstile as every lead
 * form. Every word arrives as a prop.
 */
import { useActionState, useState } from 'react'

import { Button } from '@engine/ui/button'
import { Checkbox } from '@engine/ui/checkbox'
import { Dialog } from '@engine/ui/dialog'
import { FormMessage } from '@engine/ui/form-message'
import { Input } from '@engine/ui/input'

import { TurnstileWidget } from '../partnership/turnstile-widget'
import { submitNewsletter } from './action'
import styles from './newsletter.module.css'
import { INITIAL_NEWSLETTER_STATE, type NewsletterText } from './state'

export type NewsletterDialogProps = {
  readonly text: NewsletterText
  readonly locale: 'en' | 'id'
  readonly siteKey: string | null
  readonly privacyHref: string
}

export function NewsletterDialog({ text, locale, siteKey, privacyHref }: NewsletterDialogProps) {
  const [open, setOpen] = useState(true)
  const [state, action, pending] = useActionState(submitNewsletter, INITIAL_NEWSLETTER_STATE)

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
