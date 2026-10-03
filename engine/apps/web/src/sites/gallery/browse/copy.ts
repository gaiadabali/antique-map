/**
 * The gallery browse and search's words (5.1.b): the keys and neutral defaults here, the values
 * in the gallery's lexicon files (`../lexicon/{en,id}.json`, CONVENTIONS.md §6) — a component
 * never holds a word. The shared keys the listing borrows (`facet.*`, `sort.*`, `objectType.*`,
 * `status.*`, `price.onRequest`, `empty.*`, `listing.*`) come from the app's lexicon
 * (`@/messages/keys`).
 */
import {
  createMessages,
  defineMessages,
  type MessageParams,
  type Messages,
  type PluralBase,
} from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { lexiconMessages, type LexiconMessageKey } from '../../../messages/keys'
import { SITE_COPY } from '../../../shell/copy'

export const BROWSE_KEYS = defineMessages({
  'browse.title': 'Browse the collection',
  'browse.description':
    'Every antique map, print, book and photograph the gallery holds, by type, maker, place, period and subject.',
  'browse.includeSold': 'Include sold',
  'listing.century': '{century} century',
  'listing.next': 'Next',
  'listing.pagination': 'Page {page} of {pages}',
  'listing.periodFrom': 'From year',
  'listing.periodTo': 'To year',
  'listing.previous': 'Previous',
  'listing.removeFilter': 'Remove {label}',
  'search.label': 'Search for',
  'search.placeholder': 'Title, maker, place or stock no.',
  'search.prompt': 'Search by title, maker, place — old names too — subject or stock number.',
  'search.resultsFor': 'Results for “{query}”',
  'search.submit': 'Search',
  'search.title': 'Search the collection',
  'search.withoutSold': 'Hide sold works',
  'empty.askByEmail': 'Ask by email',
})

export type BrowseMessageKey = keyof typeof BROWSE_KEYS

/** Every word the browse and search pages can say: this module's keys, the app lexicon's, and
 * the plural bases either plural set offers (`message.works`, `listing.showResults`). */
export type BrowseKey = BrowseMessageKey | LexiconMessageKey

export type BrowseText = {
  (key: BrowseKey | PluralBase<BrowseKey>, params?: MessageParams): string
}

/** The gallery's browse words for one locale: this module's keys plus the shared lexicon's. */
export function browseText(locale: SiteLocale): BrowseText {
  const mine: Messages<BrowseMessageKey> = createMessages({
    defaults: BROWSE_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.gallery,
  })
  const shared = lexiconMessages('gallery', locale)
  const mineT = mine.t.bind(mine)
  const sharedT = shared.t.bind(shared)
  const t = (key: BrowseKey, params?: MessageParams) =>
    (BROWSE_KEYS as Record<string, unknown>)[key] !== undefined
      ? mineT(key as BrowseMessageKey, params)
      : sharedT(key as LexiconMessageKey, params)
  return t as BrowseText
}
