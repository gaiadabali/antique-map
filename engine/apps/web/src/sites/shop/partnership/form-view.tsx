/**
 * The partnership form as a pure view of its state (TASKS.md 9.1.c): the island
 * (`./partnership-form`) feeds it the action's state and `pending`; a test renders it directly.
 * Per-field errors are lexicon keys the server chose, shown under their fields; a refusal that is
 * not a field's (the security check, the rate limit) shows above the button. Tokens and shared
 * components only.
 */
import { Button, Checkbox, Eyebrow, FormMessage, Input, Textarea } from '../../../shared/ui'

import type { FormText } from './form-text'
import styles from './partnership-form.module.css'
import type { PartnershipState } from './state'
import { TurnstileWidget } from './turnstile-widget'

type Props = {
  readonly text: FormText
  readonly state: PartnershipState
  readonly pending: boolean
  readonly action: (form: FormData) => void
  readonly locale: 'en' | 'id'
  /** Turnstile's public site key, or `null` while the host has none — the form is then off. */
  readonly siteKey: string | null
  /** Changes after each submit so the widget fetches a fresh token. */
  readonly resetToken?: unknown
}

export function PartnershipFormView({
  text,
  state,
  pending,
  action,
  locale,
  siteKey,
  resetToken,
}: Props) {
  if (state.status === 'success') {
    return (
      <div className={styles.form}>
        <FormMessage tone="success">
          <strong>{text['partnership.formSuccessTitle']}</strong>
          <p className={styles.messageBody}>{text['partnership.formSuccessBody']}</p>
        </FormMessage>
      </div>
    )
  }

  const words: Readonly<Record<string, string>> = text
  const say = (key: string | undefined): string | undefined =>
    key === undefined ? undefined : (words[key] ?? text['lead.error.invalid'])
  const { errors, values } = state

  return (
    <form className={styles.form} action={action} noValidate>
      <Eyebrow>{text['partnership.formEyebrow']}</Eyebrow>
      <input type="hidden" name="locale" value={locale} />
      <Input
        label={text['partnership.formName']}
        id="p-name"
        name="name"
        autoComplete="name"
        defaultValue={values.name}
        error={say(errors.name)}
        required
      />
      {errors.contact !== undefined && (
        <FormMessage tone="error">{say(errors.contact)}</FormMessage>
      )}
      <Input
        label={text['partnership.formWhatsapp']}
        id="p-whatsapp"
        name="whatsapp"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        defaultValue={values.whatsapp}
        hint={text['partnership.formWhatsappHint']}
        error={say(errors.whatsapp)}
      />
      <Input
        label={text['partnership.formEmail']}
        id="p-email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={values.email}
        hint={text['partnership.formContactNote']}
        error={say(errors.email)}
      />
      <Textarea
        label={text['partnership.formMessage']}
        id="p-message"
        name="message"
        defaultValue={values.message}
        error={say(errors.message)}
        required
      />
      <Checkbox
        id="p-consent"
        name="consent"
        label={text['partnership.formConsent']}
        hint={text['partnership.formConsentVersion']}
        error={say(errors.consent)}
      />
      {siteKey !== null ? (
        <TurnstileWidget siteKey={siteKey} resetToken={resetToken} />
      ) : (
        <FormMessage tone="info">{text['partnership.formUnavailable']}</FormMessage>
      )}
      {errors.form !== undefined && <FormMessage tone="error">{say(errors.form)}</FormMessage>}
      <div className={styles.actions}>
        <Button variant="primary" type="submit" disabled={pending || siteKey === null}>
          {pending ? text['partnership.formSending'] : text['partnership.formSubmit']}
        </Button>
        <p className={styles.formNote}>{text['partnership.formReplyNote']}</p>
      </div>
    </form>
  )
}
