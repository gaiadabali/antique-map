/**
 * What the gallery's lead form posts and what the `/api/x/leads` route answers (5.3.b/c). Plain
 * data only: it crosses from the server to the browser, so errors are lexicon keys the island
 * turns into words, and the typed values come back so a refused post does not empty the form.
 * The route's own module (`app/api/x/leads/handler`) re-exports the consent version from here, so
 * the form's line and the stored lead always name the same one.
 */

export const LEAD_FIELDS = ['name', 'whatsapp', 'email', 'message'] as const
export type LeadField = (typeof LEAD_FIELDS)[number]
export type LeadValues = Record<LeadField, string>

export type LeadFormState = {
  readonly status: 'idle' | 'error' | 'success'
  /** Field name (or `form`) → lexicon key. Empty unless `status` is `error`. */
  readonly errors: Readonly<Record<string, string>>
  /** What the visitor typed, so a refused post does not empty the form. Empty after success. */
  readonly values: LeadValues
}

export const EMPTY_VALUES: LeadValues = { name: '', whatsapp: '', email: '', message: '' }

export const INITIAL_LEAD_STATE: LeadFormState = {
  status: 'idle',
  errors: {},
  values: EMPTY_VALUES,
}

/** The form-level answers that are not one field's own. */
export const FORM_ERROR_KEYS = {
  challenge: 'lead.error.challenge',
  rate: 'lead.error.rate',
  unavailable: 'lead.error.unavailable',
} as const

/** The version of the consent line on the form; stored on the lead with the time it was given. */
export const LEAD_CONSENT_VERSION = 'gallery-contact-2026-10'

/** Turnstile's hidden field, inserted into the form by the widget. */
export const TURNSTILE_FIELD = 'cf-turnstile-response'
