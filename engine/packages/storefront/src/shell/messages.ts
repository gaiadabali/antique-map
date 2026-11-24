/**
 * The shop's shell words: the shared shell keys (`@engine/i18n/shell`) joined with the shop's copy
 * for a locale. A key the copy lacks shows its English value or its default and is listed as
 * missing, so a gap is visible. `siteLocale` is the `[locale]` param's check before anything renders.
 */
import type { LocaleCode } from '@engine/config/constants'
import { SITES, type SiteLocale } from '@engine/config/sites'
import { createMessages, type Messages } from '@engine/i18n'
import { SHELL_MESSAGES, type ShellMessageKey } from '@engine/i18n/shell'

import { SITE_COPY } from './copy'

export { SHELL_MESSAGES, type ShellMessageKey }

export function siteMessages(site: 'shop', locale: SiteLocale): Messages<ShellMessageKey> {
  return createMessages({
    defaults: SHELL_MESSAGES,
    locale,
    defaultLocale: SITES[site].locales.default,
    copy: SITE_COPY[site],
  })
}

/** A locale the shop serves, or `null`: what a `[locale]` param must be before anything renders. */
export function siteLocale(site: 'shop', value: unknown): SiteLocale | null {
  const supported: readonly LocaleCode[] = SITES[site].locales.supported
  return supported.find((locale) => locale === value) === undefined ? null : (value as SiteLocale)
}
