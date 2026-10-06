/**
 * The place pages' words (5.4.a): the keys and neutral defaults here, the values in the gallery's
 * lexicon files (`../lexicon/{en,id}.json`, CONVENTIONS.md §6) — mirrors `../browse/copy.ts`'s own
 * split. `place.role.*` and `empty.placeAvailable` are the app's shared lexicon
 * (`@/messages/keys`), reused — never redefined here.
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

export const PLACE_KEYS = defineMessages({
  'placePage.indexTitle': 'Places',
  'placePage.indexDescription':
    'The ports, islands and cities the collection depicts — modern names first, historical names beneath.',
  'placePage.availableHeading': 'Available',
  'placePage.soldHeading': 'Previously sold',
  'placePage.childrenHeading': 'Places within {name}',
  'placePage.placeCount.one': '{count} place within',
  'placePage.placeCount.other': '{count} places within',
})

export type PlaceMessageKey = keyof typeof PLACE_KEYS
export type PlaceKey = PlaceMessageKey | LexiconMessageKey
export type PlaceText = {
  (key: PlaceKey | PluralBase<PlaceKey>, params?: MessageParams): string
}

/** The gallery's place-page words for one locale: this module's keys plus the shared lexicon's. */
export function placeText(locale: SiteLocale): PlaceText {
  const mine: Messages<PlaceMessageKey> = createMessages({
    defaults: PLACE_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.gallery,
  })
  const shared = lexiconMessages('gallery', locale)
  const mineT = mine.t.bind(mine)
  const sharedT = shared.t.bind(shared)
  const defaults = PLACE_KEYS as Record<string, unknown>
  const t = (key: PlaceKey, params?: MessageParams) =>
    defaults[key] !== undefined || defaults[`${key}.other`] !== undefined
      ? mineT(key as PlaceMessageKey, params)
      : sharedT(key as LexiconMessageKey, params)
  return t as PlaceText
}
