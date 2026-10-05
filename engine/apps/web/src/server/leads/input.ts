/**
 * The one validator for a lead's fields (SECURITY.md V1: one shared schema, the server the
 * authority). It takes `unknown` — a form's values, a JSON body — and context from the caller
 * (site, kind, source, consent version), and answers either the typed, trimmed `LeadInput` or one
 * lexicon key per field that failed. Nothing outside the visitor's fields survives: a stray key in
 * the request is dropped here, never passed on to the database.
 *
 * Lengths and the WhatsApp format are the `leads` collection's own (`payload.*` fields), so the
 * Local API never has to refuse what this accepted.
 */
/** The collection's own select values (`collections/leads/kinds.ts`). */
export type LeadKind = 'ask' | 'sell' | 'partnership' | 'contact' | 'chat'
export type LeadSource = 'chat' | 'form' | 'page'
export type LeadSite = 'gallery' | 'shop'
export type LeadLocale = 'en' | 'id'
export type LeadChannel = 'whatsapp' | 'email'

/** The caller's context: the site, kind, source and consent version. A bad value is a programming error. */
export type LeadContext = {
  readonly kind: LeadKind
  readonly site: LeadSite
  readonly source: LeadSource
  readonly consentVersion: string
}

/** What the lead service stores, before the server adds the consent time. */
export type LeadInput = {
  readonly kind: LeadKind
  readonly site: LeadSite
  readonly source: LeadSource
  readonly name: string
  readonly whatsapp?: string
  readonly email?: string
  readonly preferredChannel?: LeadChannel
  readonly message: string
  readonly locale: LeadLocale
  readonly consentVersion: string
  /** Work ids the person asked about. */
  readonly items?: readonly number[]
}

/** The lexicon keys a failed field answers with (`en` and `id` in each site's lexicon). */
export const LEAD_ERROR_KEYS = {
  name: 'lead.error.name',
  message: 'lead.error.message',
  contact: 'lead.error.contact',
  whatsapp: 'lead.error.whatsapp',
  email: 'lead.error.email',
  consent: 'lead.error.consent',
  invalid: 'lead.error.invalid',
} as const

export type LeadParse =
  | { readonly ok: true; readonly value: LeadInput }
  | { readonly ok: false; readonly errors: Record<string, string> }

export const LEAD_LIMITS = {
  name: 160,
  whatsapp: 16,
  email: 254,
  message: 2000,
  consentVersion: 40,
  items: 20,
} as const

const KINDS: readonly LeadKind[] = ['ask', 'sell', 'partnership', 'contact', 'chat']
const SOURCES: readonly LeadSource[] = ['chat', 'form', 'page']
const SITES: readonly LeadSite[] = ['gallery', 'shop']
const LOCALES: readonly LeadLocale[] = ['en', 'id']
const WHATSAPP = /^\+[1-9]\d{7,14}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VISITOR_KEYS = new Set([
  'name',
  'whatsapp',
  'email',
  'preferredChannel',
  'message',
  'locale',
  'items',
  'consent',
])

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const oneOf = <T extends string>(options: readonly T[], value: unknown): T | null =>
  options.find((option) => option === value) ?? null

/** A WhatsApp number as typed → E.164, or `null` if it cannot be one. */
function normaliseWhatsappE164(input: string): string | null {
  if (input.length > 40) return null
  let digits = input.trim().replace(/[\s\-().]/g, '')
  if (digits.startsWith('00')) digits = `+${digits.slice(2)}`
  else if (digits.startsWith('0')) digits = `+62${digits.slice(1)}`
  else if (digits.startsWith('62')) digits = `+${digits}`
  else if (digits.startsWith('8')) digits = `+62${digits}`
  return WHATSAPP.test(digits) ? digits : null
}

export function parseLeadInput(raw: unknown, context: LeadContext): LeadParse {
  // Refuse unknown input shape and reserved keys.
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, errors: { form: LEAD_ERROR_KEYS.invalid } }
  }
  const input = raw as Record<string, unknown>
  for (const key of Object.keys(input)) {
    if (!VISITOR_KEYS.has(key)) {
      return { ok: false, errors: { form: LEAD_ERROR_KEYS.invalid } }
    }
  }

  // Validate context values.
  const errors: Record<string, string> = {}
  if (
    !KINDS.includes(context.kind) ||
    !SITES.includes(context.site) ||
    !SOURCES.includes(context.source)
  ) {
    throw new Error('Invalid context: kind, site, or source is not in the lists')
  }
  if (
    typeof context.consentVersion !== 'string' ||
    context.consentVersion.length === 0 ||
    context.consentVersion.length > LEAD_LIMITS.consentVersion
  ) {
    throw new Error('Invalid context: consentVersion is missing or too long')
  }

  const locale = oneOf(LOCALES, input.locale)
  if (locale === null) {
    errors.form = LEAD_ERROR_KEYS.invalid
  }

  const name = text(input.name)
  if (name.length === 0 || name.length > LEAD_LIMITS.name) errors.name = LEAD_ERROR_KEYS.name

  const message = text(input.message)
  if (message.length === 0 || message.length > LEAD_LIMITS.message) {
    errors.message = LEAD_ERROR_KEYS.message
  }

  const rawWhatsapp = text(input.whatsapp)
  const normalisedWhatsapp = rawWhatsapp ? normaliseWhatsappE164(rawWhatsapp) : null
  const whatsapp = normalisedWhatsapp ?? ''
  const rawEmail = text(input.email)
  const email = rawEmail ? rawEmail.toLowerCase() : ''

  if (rawWhatsapp !== '' && normalisedWhatsapp === null) errors.whatsapp = LEAD_ERROR_KEYS.whatsapp
  if (email !== '' && (email.length > LEAD_LIMITS.email || !EMAIL.test(email))) {
    errors.email = LEAD_ERROR_KEYS.email
  }
  if (whatsapp === '' && email === '') errors.contact = LEAD_ERROR_KEYS.contact

  // Consent must be exactly true or 'on' or 'true' from a form.
  const consent = input.consent
  const hasConsent = consent === true || consent === 'on' || consent === 'true'
  if (!hasConsent) {
    errors.consent = LEAD_ERROR_KEYS.consent
  }

  let items: number[] | undefined
  if (Array.isArray(input.items) && input.items.length > 0) {
    const ids = input.items.filter((id): id is number => Number.isSafeInteger(id) && id > 0)
    if (ids.length !== input.items.length || ids.length > LEAD_LIMITS.items) {
      errors.items = LEAD_ERROR_KEYS.invalid
    } else items = [...new Set(ids)]
  }

  const channel = oneOf(['whatsapp', 'email'] as const, input.preferredChannel)
  // A preferred channel with no such contact would send the owner to nowhere: drop it.
  const preferredChannel =
    (channel === 'whatsapp' && whatsapp !== '') || (channel === 'email' && email !== '')
      ? channel
      : null

  if (Object.keys(errors).length > 0 || !locale) {
    return { ok: false, errors }
  }
  return {
    ok: true,
    value: {
      kind: context.kind,
      site: context.site,
      source: context.source,
      name,
      ...(whatsapp !== '' ? { whatsapp } : {}),
      ...(email !== '' ? { email } : {}),
      ...(preferredChannel !== null ? { preferredChannel } : {}),
      message,
      locale,
      consentVersion: context.consentVersion,
      ...(items !== undefined ? { items } : {}),
    },
  }
}
