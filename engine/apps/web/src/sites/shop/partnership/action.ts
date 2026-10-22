'use server'

/**
 * The partnership form's Server Action (TASKS.md 9.1.c): reached by anyone who can POST, so it
 * trusts nothing but what `handlePartnershipForm` validates — Turnstile, the per-address limit and
 * the lead service's validator all run server-side. The client address is the one nginx appended
 * to `X-Forwarded-For` (`server/chat/identity`).
 */
import { headers } from 'next/headers'

import { clientAddress } from '../../../server/chat/identity'
import { leadDeps } from '../../../server/leads/deps'

import { FORM_ERROR_KEYS, type PartnershipState } from './state'
import { formValues, handlePartnershipForm } from './submit'

export async function submitPartnership(
  _previous: PartnershipState,
  form: FormData,
): Promise<PartnershipState> {
  try {
    const [deps, requestHeaders] = await Promise.all([leadDeps(), headers()])
    return await handlePartnershipForm(deps, form, clientAddress(requestHeaders))
  } catch {
    // No database yet, or Payload would not start: the visitor's words are not kept anywhere.
    return {
      status: 'error',
      values: formValues(form),
      errors: { form: FORM_ERROR_KEYS.unavailable },
    }
  }
}
