/**
 * The partnership form's submit, away from Next so a test can run it on doubles or a real
 * database: the form's values become a `partnership` lead through the lead service (TASKS.md
 * 9.1.c). `site`, `kind` and `source` are this module's constants — nothing in the request picks
 * them — and every field goes through the service's one validator, which drops what it does not
 * know.
 *
 * The field checks run before Turnstile is asked, so a form with a mistake does not spend the
 * visitor's one-time token; the service still validates again as the authority.
 */
import { createLead, parseLeadInput, type LeadContext, type LeadDeps } from '../../../server/leads'

import { composeMessage } from './segments'

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

/** Each field's longest kept value: the folded message stays inside the service's 2,000. */
const FIELD_LIMIT: Record<(typeof PARTNERSHIP_FIELDS)[number], number> = {
  segment: 16,
  name: 200,
  email: 254,
  whatsapp: 32,
  org: 160,
  scale: 160,
  context: 400,
  message: 1000,
}

export function formValues(form: FormData): PartnershipValues {
  return Object.fromEntries(
    PARTNERSHIP_FIELDS.map((field) => [field, text(form.get(field)).slice(0, FIELD_LIMIT[field])]),
  ) as PartnershipValues
}

export async function handlePartnershipForm(
  deps: LeadDeps,
  form: FormData,
  ip: string | null,
): Promise<PartnershipState> {
  const values = formValues(form)
  const locale = text(form.get('locale')) === 'id' ? 'id' : 'en'
  const context: LeadContext = {
    kind: 'partnership',
    site: 'shop',
    source: 'form',
    consentVersion: CONSENT_VERSION,
  }
  // The apply form's choice and fields become one message for the lead (`./segments`).
  const input = {
    name: values.name,
    email: values.email,
    whatsapp: values.whatsapp,
    message: composeMessage(locale, {
      segment: values.segment,
      org: values.org,
      scale: values.scale,
      context: values.context,
      more: values.message,
    }),
    locale,
    consent: form.get('consent'),
  }

  const early = parseLeadInput(input, context)
  if (!early.ok) {
    return {
      status: 'error',
      values,
      errors: early.errors,
    }
  }

  const result = await createLead(deps, {
    input,
    context,
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
