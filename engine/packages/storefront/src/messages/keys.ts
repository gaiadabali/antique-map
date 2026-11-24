/**
 * The lexicon's shared keys (`@engine/i18n/lexicon`) joined with the shop's copy for a locale
 * (CONVENTIONS.md §6): keys in code, values in the shop's lexicon files.
 */
import { SITES, type SiteLocale } from '@engine/config/sites'
import { createMessages, type Messages } from '@engine/i18n'
import { LEXICON_MESSAGES, type LexiconMessageKey } from '@engine/i18n/lexicon'

import { SITE_COPY } from '../shell/copy'

export { LEXICON_MESSAGES, type LexiconMessageKey }

export function lexiconMessages(site: 'shop', locale: SiteLocale): Messages<LexiconMessageKey> {
  return createMessages({
    defaults: LEXICON_MESSAGES,
    locale,
    defaultLocale: SITES[site].locales.default,
    copy: SITE_COPY[site],
  })
}
