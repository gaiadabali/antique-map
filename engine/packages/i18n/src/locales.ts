/**
 * The engine's locales (ARCHITECTURE.md §11). Every database holds `en`, `id` and `nl`; a
 * brand serves the subset its config names, its default at the root and every other under
 * its prefix (`/id/…`). The root is never negotiated from `Accept-Language` — crawlers must
 * see one answer — so `suggestLocale()` only feeds the dismissible banner that offers the
 * visitor's language; nothing here redirects.
 */
import { LOCALE_CODES, type LocaleCode } from '@engine/config/constants'

export { LOCALE_CODES, type LocaleCode }

/**
 * Per locale: the BCP-47 tag the formatters use (British English, to match the copy's
 * spelling; Indonesian and Dutch number and date conventions), the `<html lang>`, and the
 * language's own name for a language switcher.
 */
export const LOCALES = {
  en: { tag: 'en-GB', htmlLang: 'en', endonym: 'English' },
  id: { tag: 'id-ID', htmlLang: 'id', endonym: 'Bahasa Indonesia' },
  nl: { tag: 'nl-NL', htmlLang: 'nl', endonym: 'Nederlands' },
} as const satisfies Record<LocaleCode, { tag: string; htmlLang: string; endonym: string }>

/** What the locale helpers read from a brand config. */
export type LocaleConfig = {
  readonly locales: { readonly default: LocaleCode; readonly supported: readonly LocaleCode[] }
}

export function isLocaleCode(value: unknown): value is LocaleCode {
  return (LOCALE_CODES as readonly unknown[]).includes(value)
}

export function isSupportedLocale(config: LocaleConfig, value: unknown): value is LocaleCode {
  return isLocaleCode(value) && config.locales.supported.includes(value)
}

/** A supported locale as given, or the brand's default. */
export function resolveLocale(config: LocaleConfig, candidate: unknown): LocaleCode {
  return isSupportedLocale(config, candidate) ? candidate : config.locales.default
}

/** `''` for the default locale, served unprefixed; `/id` for another. */
export function localePrefix(config: LocaleConfig, locale: LocaleCode): string {
  return locale === config.locales.default ? '' : `/${locale}`
}

/** The locale a public path is in: its prefix when that is a supported non-default locale. */
export function localeOfPath(config: LocaleConfig, pathname: string): LocaleCode {
  const first = pathname.split('/')[1]
  return first !== config.locales.default && isSupportedLocale(config, first)
    ? first
    : config.locales.default
}

/** The formatting tag for a locale (`id` → `id-ID`). */
export function formattingTag(locale: LocaleCode): string {
  return LOCALES[locale].tag
}

/**
 * The supported locale an `Accept-Language` header prefers most, or `null` when it names none
 * the brand serves. For the language banner only — the root is always the default locale.
 */
export function suggestLocale(
  config: LocaleConfig,
  acceptLanguage: string | null | undefined,
): LocaleCode | null {
  if (!acceptLanguage) return null
  const ranked = acceptLanguage
    .split(',')
    .map((part, index) => {
      const [range = '', ...params] = part.trim().split(';')
      const q = params
        .map((param) => /^\s*q=([\d.]+)\s*$/.exec(param)?.[1])
        .find((each) => each !== undefined)
      return {
        language: modernCode(range.trim().toLowerCase().split('-')[0] ?? ''),
        q: q === undefined ? 1 : Number(q),
        index,
      }
    })
    .filter((each) => each.q > 0 && Number.isFinite(each.q))
    .sort((a, b) => b.q - a.q || a.index - b.index)
  const match = ranked.find((each) => isSupportedLocale(config, each.language))
  return match ? (match.language as LocaleCode) : null
}

/** ISO 639's withdrawn code for Indonesian, which older Android and Java browsers still send. */
const WITHDRAWN = { in: 'id' } as const satisfies Record<string, LocaleCode>

function modernCode(language: string): string {
  return Object.hasOwn(WITHDRAWN, language)
    ? WITHDRAWN[language as keyof typeof WITHDRAWN]
    : language
}
