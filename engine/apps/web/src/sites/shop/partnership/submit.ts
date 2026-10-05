/**
 * The partnership form's submit, away from Next so a test can run it on doubles or a real
 * database: the form's values become a `partnership` lead through the lead service (TASKS.md
 * 9.1.c). `site`, `kind` and `source` are this module's constants — nothing in the request picks
 * them — and every field goes through the service's one validator, which drops what it does not
 * know.
 *
 * The consent box and the field checks run before Turnstile is asked, so a form with a mistake
 * does not spend the visitor's one-time token; the service still validates again as the authority.
 */
import { createLead, LEAD_ERROR_KEYS, parseLeadInput, type LeadDeps } from '../../../server/leads'

import {
  CONSENT_VERSION,
  EMPTY_VALUES,
  FORM_ERROR_KEYS,
  PARTNERSHIP_FIELDS,
  TURNSTILE_FIELD,
  type PartnershipState,
  type PartnershipValues,
} from './state'

const text = (value: FormDataEntryValue | null): string => (typeof value === 'string' ? value : '')

export function formValues(form: FormData): PartnershipValues {
  return Object.fromEntries(
    PARTNERSHIP_FIELDS.map((field) => [field, text(form.get(field)).slice(0, 2100)]),
  ) as PartnershipValues
}

export async function handlePartnershipForm(
  deps: LeadDeps,
  form: FormData,
  ip: string | null,
): Promise<PartnershipState> {
  const values = formValues(form)
  const locale = text(form.get('locale')) === 'id' ? 'id' : 'en'
  const input = {
    kind: 'partnership',
    site: 'shop',
    source: 'form',
    ...values,
    locale,
    consentVersion: CONSENT_VERSION,
  }

  const early = parseLeadInput(input)
  const consented = form.get('consent') === 'on'
  if (!early.ok || !consented) {
    return {
      status: 'error',
      values,
      errors: {
        ...(early.ok ? {} : early.errors),
        ...(consented ? {} : { consent: LEAD_ERROR_KEYS.consent }),
      },
    }
  }

  const result = await createLead(deps, {
    input,
    turnstileToken: text(form.get(TURNSTILE_FIELD)) || null,
    ip,
  })
  if (result.ok) return { status: 'success', errors: {}, values: EMPTY_VALUES }
  return {
    status: 'error',
    values,
    errors: result.reason === 'invalid' ? result.errors : { form: FORM_ERROR_KEYS[result.reason] },
  }
}
