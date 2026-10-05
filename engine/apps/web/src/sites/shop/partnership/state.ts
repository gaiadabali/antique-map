/**
 * What the partnership form's server action answers and the client island renders (TASKS.md
 * 9.1.c). Plain data only: it crosses from the server to the browser, so it holds lexicon keys for
 * the errors (the island turns them into words) and the values to put back in the fields.
 */

export const PARTNERSHIP_FIELDS = ['name', 'email', 'whatsapp', 'message'] as const
export type PartnershipField = (typeof PARTNERSHIP_FIELDS)[number]
export type PartnershipValues = Record<PartnershipField, string>

export type PartnershipState = {
  readonly status: 'idle' | 'error' | 'success'
  /** Field name (or `form`) → lexicon key. Empty unless `status` is `error`. */
  readonly errors: Readonly<Record<string, string>>
  /** What the visitor typed, so a refused post does not empty the form. Empty after success. */
  readonly values: PartnershipValues
}

export const EMPTY_VALUES: PartnershipValues = { name: '', email: '', whatsapp: '', message: '' }

export const INITIAL_PARTNERSHIP_STATE: PartnershipState = {
  status: 'idle',
  errors: {},
  values: EMPTY_VALUES,
}

/** The form-level errors the service answers with besides a field's own. */
export const FORM_ERROR_KEYS = {
  challenge: 'lead.error.challenge',
  rate: 'lead.error.rate',
  unavailable: 'lead.error.unavailable',
} as const

/** The version of the consent line on the form; stored on the lead with the time it was given. */
export const CONSENT_VERSION = 'partnership-2026-10'

/** Turnstile's hidden field, inserted into the form by the widget. */
export const TURNSTILE_FIELD = 'cf-turnstile-response'
