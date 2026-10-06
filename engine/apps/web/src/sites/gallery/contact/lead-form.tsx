'use client'

/**
 * The gallery's lead form island (5.3.b): it posts the visitor's fields as JSON to the gallery's
 * own route (`/api/x/leads`, 5.3.c) with a client-generated idempotency key, so a double tap makes
 * one lead. A refused post comes back with per-field lexicon keys and the typed values; a good one
 * becomes the thank-you state. The Turnstile answer travels in the top-level `turnstileToken`, the
 * consent tick in `input.consent` — the route and the lead service, not this island, are the
 * authority on what is acceptable.
 */
import { useState } from 'react'

import type { LeadFormKind } from './lead-form-view'
import { LeadFormView } from './lead-form-view'
import {
  EMPTY_VALUES,
  FORM_ERROR_KEYS,
  INITIAL_LEAD_STATE,
  LEAD_FIELDS,
  TURNSTILE_FIELD,
  type LeadFormState,
} from './state'
import type { FormText } from './form-text'

const REFUSALS: Readonly<Record<number, string>> = {
  403: FORM_ERROR_KEYS.challenge,
  429: FORM_ERROR_KEYS.rate,
}

export function LeadForm({
  kind,
  text,
  locale,
  siteKey,
}: {
  readonly kind: LeadFormKind
  readonly text: FormText
  readonly locale: 'en' | 'id'
  readonly siteKey: string | null
}) {
  const [state, setState] = useState<LeadFormState>(INITIAL_LEAD_STATE)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const values = { ...EMPTY_VALUES }
    for (const field of LEAD_FIELDS) {
      const given = data.get(field)
      if (typeof given === 'string') values[field] = given
    }
    setPending(true)
    try {
      const response = await fetch('/api/x/leads', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key':
            typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `lead-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        },
        body: JSON.stringify({
          kind,
          input: {
            name: values.name,
            whatsapp: values.whatsapp,
            email: values.email,
            message: values.message,
            locale,
            consent: data.get('consent') === 'on' ? 'on' : false,
          },
          turnstileToken: data.get(TURNSTILE_FIELD),
        }),
      })
      if (response.status === 201) {
        setState({ status: 'success', errors: {}, values: EMPTY_VALUES })
        form.reset()
        return
      }
      const body = (await response.json().catch(() => null)) as {
        errors?: Record<string, string>
      } | null
      const formKey = REFUSALS[response.status] ?? FORM_ERROR_KEYS.unavailable
      setState({
        status: 'error',
        errors: { ...(body?.errors ?? {}), ...(body?.errors?.form ? {} : { form: formKey }) },
        values,
      })
    } catch {
      setState({ status: 'error', errors: { form: FORM_ERROR_KEYS.unavailable }, values })
    } finally {
      setPending(false)
    }
  }

  return (
    <LeadFormView
      kind={kind}
      text={text}
      state={state}
      pending={pending}
      submit={(event) => void submit(event)}
      locale={locale}
      siteKey={siteKey}
      resetToken={state}
    />
  )
}
