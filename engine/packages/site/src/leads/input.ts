/**
 * The one validator for a lead's fields (SECURITY.md V1: one shared schema, the server the
 * authority). It takes `unknown` — a form's values, a JSON body — and context from the caller
 * (site, kind, source, consent version), and answers either the typed, trimmed `LeadInput` or one
 * lexicon key per field that failed. A key outside the visitor's fields (kind, site, source and
 * consent version included) refuses the whole input. WhatsApp and email are normalised by checkout's
 * own rules (`@engine/cms/shop/orders`), so a number is stored the same way wherever it was typed.
 *
 * Lengths and the WhatsApp format are the `leads` collection's own (`payload.*` fields), so the
 * Local API never has to refuse what this accepted.
 *
 * A `newsletter` lead (TASKS.md 28.2) is an email address and the consent alone — no name, no
 * message, no WhatsApp; a `partnership` lead may name which of the two enquiries it is
 * (`partnershipType`, the `leads` collection's own choices).
 */
import { normaliseWhatsApp } from '@engine/cms-shop/orders'

/** The collection's own select values (`collections/leads/kinds.ts`). */
export type LeadKind = 'ask' | 'sell' | 'partnership' | 'contact' | 'chat' | 'newsletter'
export type PartnershipType = 'retailer' | 'wholesale'
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
  /** A partnership lead's enquiry: become a retailer, or customised wholesale products. */
  readonly partnershipType?: PartnershipType
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

const KINDS: readonly LeadKind[] = ['ask', 'sell', 'partnership', 'contact', 'chat', 'newsletter']
const PARTNERSHIP_TYPES: readonly PartnershipType[] = ['retailer', 'wholesale']
const SOURCES: readonly LeadSource[] = ['chat', 'form', 'page']
const SITES: readonly LeadSite[] = ['gallery', 'shop']
const LOCALES: readonly LeadLocale[] = ['en', 'id']
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
  'partnershipType',
])
/** A newsletter sign-up's whole input: the address, the language and the consent. */
const NEWSLETTER_KEYS = new Set(['email', 'locale', 'consent'])

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const oneOf = <T extends string>(options: readonly T[], value: unknown): T | null =>
  options.find((option) => option === value) ?? null

export function parseLeadInput(raw: unknown, context: LeadContext): LeadParse {
  // Refuse unknown input shape and reserved keys.
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, errors: { form: LEAD_ERROR_KEYS.invalid } }
  }
  const input = raw as Record<string, unknown>
  const allowed = context.kind === 'newsletter' ? NEWSLETTER_KEYS : VISITOR_KEYS
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      return { ok: false, errors: { form: LEAD_ERROR_KEYS.invalid } }
    }
  }
  const newsletter = context.kind === 'newsletter'

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
  if (!newsletter && (name.length === 0 || name.length > LEAD_LIMITS.name)) {
    errors.name = LEAD_ERROR_KEYS.name
  }

  const message = text(input.message)
  if (!newsletter && (message.length === 0 || message.length > LEAD_LIMITS.message)) {
    errors.message = LEAD_ERROR_KEYS.message
  }

  const rawWhatsapp = text(input.whatsapp)
  const normalisedWhatsapp = rawWhatsapp ? normaliseWhatsApp(rawWhatsapp) : null
  const whatsapp = normalisedWhatsapp ?? ''
  const rawEmail = text(input.email)
  const email = rawEmail ? rawEmail.toLowerCase() : ''

  if (rawWhatsapp !== '' && normalisedWhatsapp === null) errors.whatsapp = LEAD_ERROR_KEYS.whatsapp
  if (email !== '' && (email.length > LEAD_LIMITS.email || !EMAIL.test(email))) {
    errors.email = LEAD_ERROR_KEYS.email
  }
  if (newsletter && email === '') errors.email = LEAD_ERROR_KEYS.email
  else if (whatsapp === '' && email === '') errors.contact = LEAD_ERROR_KEYS.contact

  // Only a partnership lead names its enquiry, and only as one of the two.
  let partnershipType: PartnershipType | undefined
  if (input.partnershipType !== undefined && input.partnershipType !== '') {
    const type = oneOf(PARTNERSHIP_TYPES, input.partnershipType)
    if (type === null || context.kind !== 'partnership') errors.form = LEAD_ERROR_KEYS.invalid
    else partnershipType = type
  }

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
      ...(partnershipType !== undefined ? { partnershipType } : {}),
    },
  }
}
