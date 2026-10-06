/**
 * The gallery's lead form as a pure view of its state (5.3.b; the shop's partnership form's
 * pattern): the island (`./lead-form`) feeds it the post's state and `pending`; a test renders it
 * directly. Per-field errors are lexicon keys the server chose, shown under their fields; a
 * refusal that is not a field's (the security check, the rate limit) shows above the button.
 * Tokens and shared components only. The form posts no photos — the page says where photos go.
 */
import { Button, Checkbox, Eyebrow, FormMessage, Input, Textarea } from '../../../shared/ui'

import type { FormText } from './form-text'
import styles from './contact-form.module.css'
import type { LeadFormState } from './state'
import { TurnstileWidget } from './turnstile-widget'

export type LeadFormKind = 'sell' | 'contact'

type Props = {
  readonly kind: LeadFormKind
  readonly text: FormText
  readonly state: LeadFormState
  readonly pending: boolean
  readonly submit: (event: React.FormEvent<HTMLFormElement>) => void
  readonly locale: 'en' | 'id'
  /** Turnstile's public site key, or `null` while the host has none — the form is then off. */
  readonly siteKey: string | null
  /** Changes after each submit so the widget fetches a fresh token. */
  readonly resetToken?: unknown
}

export function LeadFormView({ kind, text, state, pending, submit, locale, siteKey, resetToken }: Props) {
  if (state.status === 'success') {
    return (
      <div className={styles.form}>
        <FormMessage tone="success">
          <strong>{text['contactForm.successTitle']}</strong>
          <p className={styles.messageBody}>{text['contactForm.successBody']}</p>
        </FormMessage>
      </div>
    )
  }

  const words: Readonly<Record<string, string>> = text
  const say = (key: string | undefined): string | undefined =>
    key === undefined ? undefined : (words[key] ?? text['lead.error.invalid'])
  const { errors, values } = state

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Eyebrow>{text['contactForm.eyebrow']}</Eyebrow>
      <Input
        label={text['contactForm.name']}
        id="lead-name"
        name="name"
        autoComplete="name"
        defaultValue={values.name}
        error={say(errors.name)}
        required
      />
      {errors.contact !== undefined && <FormMessage tone="error">{say(errors.contact)}</FormMessage>}
      <Input
        label={text['contactForm.whatsapp']}
        id="lead-whatsapp"
        name="whatsapp"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        defaultValue={values.whatsapp}
        hint={text['contactForm.whatsappHint']}
        error={say(errors.whatsapp)}
      />
      <Input
        label={text['contactForm.email']}
        id="lead-email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={values.email}
        hint={text['contactForm.contactNote']}
        error={say(errors.email)}
      />
      <Textarea
        label={kind === 'sell' ? text['contactForm.messageSell'] : text['contactForm.message']}
        id="lead-message"
        name="message"
        defaultValue={values.message}
        error={say(errors.message)}
        required
      />
      <Checkbox
        id="lead-consent"
        name="consent"
        label={text['contactForm.consent']}
        hint={text['contactForm.consentVersion']}
        error={say(errors.consent)}
      />
      {siteKey !== null ? (
        <TurnstileWidget siteKey={siteKey} resetToken={resetToken} />
      ) : (
        <FormMessage tone="info">{text['contactForm.unavailable']}</FormMessage>
      )}
      {errors.form !== undefined && <FormMessage tone="error">{say(errors.form)}</FormMessage>}
      <div className={styles.actions}>
        <Button variant="primary" type="submit" disabled={pending || siteKey === null}>
          {pending ? text['contactForm.sending'] : text['contactForm.submit']}
        </Button>
        <p className={styles.formNote}>{text['contactForm.securityCheck']}</p>
      </div>
      <input type="hidden" name="locale" value={locale} />
    </form>
  )
}
