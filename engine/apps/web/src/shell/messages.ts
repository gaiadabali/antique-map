/**
 * The shell's message keys and their neutral defaults (CONVENTIONS.md §6: keys in code, values in
 * each site's lexicon files). `siteMessages()` joins them with the site's copy for a locale; a key
 * the copy lacks shows its English value or its default and is listed as missing, so a gap is
 * visible, never silently the other site's voice.
 *
 * The copy still names its placeholder `{brand}`, as the brand folders wrote it; the value is the
 * site's name.
 */
import type { LocaleCode } from '@engine/config/constants'
import { SITES, type SiteKey, type SiteLocale } from '@engine/config/sites'
import { createMessages, defineMessages, type Messages } from '@engine/i18n'

import { SITE_COPY } from './copy'

export const SHELL_MESSAGES = defineMessages({
  'shell.skipToContent': 'Skip to content',
  'shell.homeLink': '{brand}, home',
  'shell.languages': 'Language',
  'shell.locale.en': 'English',
  'shell.locale.id': 'Bahasa Indonesia',
  'home.title': '{brand}',
  'home.lede': 'This site is being built. What you see is its frame.',
  'notFound.title': 'Page not found',
  'notFound.body': 'There is nothing at this address.',
  'notFound.home': 'Go to the home page',
})

export type ShellMessageKey = keyof typeof SHELL_MESSAGES

export function siteMessages(site: SiteKey, locale: SiteLocale): Messages<ShellMessageKey> {
  return createMessages({
    defaults: SHELL_MESSAGES,
    locale,
    defaultLocale: SITES[site].locales.default,
    copy: SITE_COPY[site],
  })
}

/** A locale the site serves, or `null`: what a `[locale]` param must be before anything renders. */
export function siteLocale(site: SiteKey, value: unknown): SiteLocale | null {
  const supported: readonly LocaleCode[] = SITES[site].locales.supported
  return supported.find((locale) => locale === value) === undefined ? null : (value as SiteLocale)
}
