/**
 * Fields and validators the four vocabulary collections share (TASKS.md 8.1; CONTENT-MODEL.md
 * intro, §9). Kept beside 8.1's collections until SCH promotes them (8.1's report).
 */
import type { PayloadRequest, SelectField, Validate } from 'payload'

/** CONTENT-MODEL.md: machine translation is allowed, and shown to editors as such until reviewed. */
export const TRANSLATION_STATUSES = ['entered', 'machine', 'reviewed'] as const
export type TranslationStatus = (typeof TRANSLATION_STATUSES)[number]

const TRANSLATION_LABELS: Record<TranslationStatus, string> = {
  entered: 'Entered by hand',
  machine: 'Machine translation — not yet reviewed',
  reviewed: 'Reviewed',
}

/** Per locale: how this locale's text came to be. Only on collections with localised text. */
export const translationStatusField: SelectField = {
  name: 'translationStatus',
  type: 'select',
  localized: true,
  required: true,
  defaultValue: 'entered',
  options: TRANSLATION_STATUSES.map((value) => ({ value, label: TRANSLATION_LABELS[value] })),
  admin: { position: 'sidebar' },
}

export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
}

function defaultLocaleOf(req: PayloadRequest): string | undefined {
  const { localization } = req.payload.config
  return localization ? localization.defaultLocale : undefined
}

/**
 * Required when the record is created, and on every save in the default locale — the locale the
 * address is made from. A save in another locale may leave the text blank: the page then falls
 * back to the default locale's (the config's `fallback: true`).
 */
export function requiredInDefaultLocale(message: string): Validate {
  return (value, { operation, req }) => {
    if (!isBlank(value)) return true
    const defaultLocale = defaultLocaleOf(req)
    const savingDefault = defaultLocale === undefined || req.locale === defaultLocale
    return operation === 'create' || savingDefault ? message : true
  }
}

/** Whether this save publishes the record (`_status: 'published'`), as opposed to a draft. */
export function isPublishing(data: unknown): boolean {
  return (data as { _status?: unknown } | null | undefined)?._status === 'published'
}

/**
 * What only publishing demands (CONTENT-MODEL.md §9: saving stays cheap; publishing is when a
 * claim becomes public). A draft may leave it blank; a publish lists it with every other
 * missing requirement at once, because Payload gathers every field's error into one refusal.
 */
export function requiredToPublish(message: string): Validate {
  return (value, { data }) => (isPublishing(data) && isBlank(value) ? message : true)
}

/** An absolute `http:` or `https:` URL with a host — never `javascript:`, a path or a bare word. */
export function isWebUrl(value: string, options: { httpsOnly?: boolean } = {}): boolean {
  if (value.length > 2048 || /\s/.test(value)) return false
  try {
    const url = new URL(value)
    const schemes = options.httpsOnly ? ['https:'] : ['http:', 'https:']
    return schemes.includes(url.protocol) && url.hostname.length > 0
  } catch {
    return false
  }
}

export function webUrl(options: { httpsOnly?: boolean } = {}): Validate {
  const example = options.httpsOnly ? 'https://www.wikidata.org/wiki/Q…' : 'https://… or http://…'
  return (value) =>
    isBlank(value) || isWebUrl(String(value), options)
      ? true
      : `Give a full web address: ${example}`
}
