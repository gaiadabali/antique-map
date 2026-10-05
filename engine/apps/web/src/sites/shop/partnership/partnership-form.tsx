'use client'

/**
 * The partnership page's enquiry form island (TASKS.md 9.1.c): `useActionState` over the Server
 * Action, so a refused post comes back with per-field errors and the typed values, a good one with
 * a success state, and the button is disabled while the post is in flight. The words arrive as
 * plain strings from the server page (`./form-text`).
 */
import { useActionState } from 'react'

import { submitPartnership } from './action'
import type { FormText } from './form-text'
import { PartnershipFormView } from './form-view'
import { INITIAL_PARTNERSHIP_STATE } from './state'

export function PartnershipForm({
  text,
  locale,
  siteKey,
}: {
  readonly text: FormText
  readonly locale: 'en' | 'id'
  readonly siteKey: string | null
}) {
  const [state, action, pending] = useActionState(submitPartnership, INITIAL_PARTNERSHIP_STATE)
  return (
    <PartnershipFormView
      text={text}
      state={state}
      pending={pending}
      action={action}
      locale={locale}
      siteKey={siteKey}
      resetToken={state}
    />
  )
}
