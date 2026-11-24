/**
 * The newsletter pop-up's submit (TASKS.md 28.2; the owner's F8: sign-ups are leads of kind
 * `newsletter`, no mailing service connected), away from Next so a test runs it on doubles. The
 * site, kind and source are this module's constants; the address and the consent go through the
 * lead service's one validator, after the token shape, the per-address limit and Turnstile — the
 * same door as every public lead form.
 */
import { createLead, parseLeadInput, type LeadContext, type LeadDeps } from '@engine/site/leads'

import { TURNSTILE_FIELD } from '../partnership/state'
import { NEWSLETTER_CONSENT_VERSION, type NewsletterState } from './state'

const text = (value: FormDataEntryValue | null): string => (typeof value === 'string' ? value : '')

const CONTEXT: LeadContext = {
  kind: 'newsletter',
  site: 'shop',
  source: 'form',
  consentVersion: NEWSLETTER_CONSENT_VERSION,
}

const FORM_ERRORS = {
  challenge: 'lead.error.challenge',
  rate: 'lead.error.rate',
  unavailable: 'lead.error.unavailable',
} as const

export async function handleNewsletterForm(
  deps: LeadDeps,
  form: FormData,
  ip: string | null,
): Promise<NewsletterState> {
  const email = text(form.get('email')).slice(0, 254)
  const input = {
    email,
    locale: text(form.get('locale')) === 'id' ? 'id' : 'en',
    consent: text(form.get('consent')),
  }
  // The fields first, so a mistake does not spend the visitor's one-time token.
  const early = parseLeadInput(input, CONTEXT)
  if (!early.ok) return { status: 'error', errors: early.errors, email }
  const result = await createLead(deps, {
    input,
    context: CONTEXT,
    turnstileToken: text(form.get(TURNSTILE_FIELD)) || null,
    ip,
  })
  if (result.ok) return { status: 'success', errors: {}, email: '' }
  return {
    status: 'error',
    errors: result.reason === 'invalid' ? result.errors : { form: FORM_ERRORS[result.reason] },
    email,
  }
}
