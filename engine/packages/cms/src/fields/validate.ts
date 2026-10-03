/**
 * Shared field validators (TASKS.md 8.1; CONTENT-MODEL.md §9): what is required where — in the
 * default locale, or only to publish — and the shape of a web address. Pure but for the request
 * they read the default locale from.
 */
import type { PayloadRequest, Validate } from 'payload'

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
  // No `required: true`: Payload would demand the text in every locale saved. The field's admin
  // description says it is required in the default locale (`IN_DEFAULT_LOCALE_NOTE`).
  return (value, { operation, req }) => {
    if (!isBlank(value)) return true
    const defaultLocale = defaultLocaleOf(req)
    const savingDefault = defaultLocale === undefined || req.locale === defaultLocale
    return operation === 'create' || savingDefault ? message : true
  }
}

/** Appended to the admin description of a field `requiredInDefaultLocale` guards. */
export const IN_DEFAULT_LOCALE_NOTE = {
  en: 'Required in English, the default language; another language left blank shows the English.',
  id: 'Wajib dalam bahasa Inggris, bahasa default; bahasa lain yang kosong akan menunjukkan bahasa Inggris.',
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
