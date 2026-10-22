'use client'

/**
 * The lead form (AI.md §4): shown only once the visitor taps "Leave my details" on the prompt the
 * `lead_form` event carried — never automatically. The consent line itself (`consentText`) is the
 * server's own copy, already in the visitor's locale; ticking it and submitting posts straight to
 * `/api/x/chat/consent`. The model never sees any of these fields — only the reference, next turn.
 */
import { useEffect, useState } from 'react'

import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { postConsent, newIdempotencyKey } from './chat-client'
import type { LeadFormData } from './chat-reducer'
import type { ChatPanelText } from './lexicon/types'
import type { HandoffChannel, SiteLocale } from './types'
import styles from './consent-form.module.css'

export function ConsentForm({
  form,
  text,
  locale,
  onSubmitted,
  onCancel,
}: {
  readonly form: LeadFormData
  readonly text: ChatPanelText
  readonly locale: SiteLocale
  readonly onSubmitted: (reference: string) => void
  readonly onCancel: () => void
}): React.ReactElement {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [preferred, setPreferred] = useState<HandoffChannel>('whatsapp')
  const [message, setMessage] = useState('')
  const [consented, setConsented] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The prompt that opened this form is gone; keep the visitor's place by landing on its first field.
  useEffect(() => {
    document.getElementById('chat-lead-name')?.focus()
  }, [])

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (pending || !consented) return
    setPending(true)
    setError(null)
    const result = await postConsent({
      consentToken: form.consentToken,
      name,
      whatsapp: whatsapp.trim() === '' ? null : whatsapp.trim(),
      email: email.trim() === '' ? null : email.trim(),
      preferredChannel: preferred,
      message,
      idempotencyKey: newIdempotencyKey(),
      locale,
    })
    setPending(false)
    if (result.ok) onSubmitted(result.reference)
    else setError(text.leadError)
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void submit(event)}
      aria-label={text.leadTitle}
    >
      <p className={styles.title} aria-hidden="true">
        {text.leadTitle}
      </p>
      <Input
        id="chat-lead-name"
        label={text.leadName}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        id="chat-lead-whatsapp"
        label={text.leadWhatsapp}
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
      />
      <Input
        id="chat-lead-email"
        label={text.leadEmail}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <fieldset className={styles.preferred}>
        <legend className={styles.legend}>{text.leadPreferred}</legend>
        <label className={styles.choice}>
          <input
            type="radio"
            name="chat-lead-preferred"
            checked={preferred === 'whatsapp'}
            onChange={() => setPreferred('whatsapp')}
          />
          {text.leadPreferredWhatsapp}
        </label>
        <label className={styles.choice}>
          <input
            type="radio"
            name="chat-lead-preferred"
            checked={preferred === 'email'}
            onChange={() => setPreferred('email')}
          />
          {text.leadPreferredEmail}
        </label>
      </fieldset>
      <Input
        id="chat-lead-message"
        label={text.leadMessage}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Checkbox
        id="chat-lead-consent"
        label={form.consentText}
        checked={consented}
        onChange={(e) => setConsented(e.target.checked)}
        required
      />
      {error !== null && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="button" variant="quiet" onClick={onCancel}>
          {text.leadCancel}
        </Button>
        <Button type="submit" variant="primary" disabled={pending || !consented}>
          {text.leadSubmit}
        </Button>
      </div>
    </form>
  )
}
