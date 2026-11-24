/**
 * The browse listing's words (6.1.b): the keys and neutral defaults here, the values in the
 * shop's lexicon files (`../lexicon/{en,id}.json`, CONVENTIONS.md §6) — a component never holds
 * a word. The shared keys the listing borrows (`price.from`, `label.reproduction`) come from the
 * app's lexicon (`@/messages/keys`), which the same files supply.
 */
import { createMessages, defineMessages, type Messages, type PluralBase } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { lexiconMessages, type LexiconMessageKey } from '../../../messages/keys'
import { SITE_COPY } from '../../../shell/copy'

export const BROWSE_KEYS = defineMessages({
  'browse.title': 'Shop all',
  'browse.description':
    'Reproductions of the archive’s maps, prints and photographs, sent from Bali.',
  'browse.results.other': 'Show {count} products',
  'browse.results.one': 'Show {count} product',
  'browse.empty': 'Nothing here yet — try another category, or search.',
  'sort.featured': 'Featured',
  'sort.newest': 'Newest',
  'sort.priceAsc': 'Price: low to high',
  'sort.priceDesc': 'Price: high to low',
  'listing.category': 'Category',
  'listing.sortBy': 'Sort by',
  'listing.pagination': 'Pages',
  'listing.previous': 'Previous',
  'listing.next': 'Next',
  'listing.soldOut': 'Sold out',
  'search.title': 'Search',
  'search.empty': 'Nothing matched “{query}” — try another word.',
})

export type BrowseMessageKey = keyof typeof BROWSE_KEYS

export type BrowseText = {
  (
    key: BrowseMessageKey | PluralBase<BrowseMessageKey>,
    params?: Record<string, string | number>,
  ): string
  shared(key: LexiconMessageKey, params?: Record<string, string | number>): string
}

/** The shop's browse words for one locale: this module's keys plus the shared lexicon's. */
export function browseText(locale: SiteLocale): BrowseText {
  const mine: Messages<BrowseMessageKey> = createMessages({
    defaults: BROWSE_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  const shared = lexiconMessages('shop', locale)
  const t = mine.t.bind(mine)
  return Object.assign(t, { shared: shared.t.bind(shared) }) as BrowseText
}
