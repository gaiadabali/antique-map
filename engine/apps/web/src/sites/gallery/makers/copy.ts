/**
 * The maker pages' words (5.4.a): the keys and neutral defaults here, the values in the gallery's
 * lexicon files (`../lexicon/{en,id}.json`, CONVENTIONS.md §6) — mirrors `../browse/copy.ts`'s own
 * split. `maker.role.*` and `maker.certainty.*` are the app's shared lexicon (`@/messages/keys`),
 * reused for a maker's credited roles — never redefined here.
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

export const MAKER_KEYS = defineMessages({
  'makerPage.indexTitle': 'Makers',
  'makerPage.indexDescription':
    'Every cartographer, engraver, publisher and photographer behind the collection.',
  'makerPage.description':
    'Antique maps, prints and photographs by {name}, catalogued at Indies Gallery.',
  'makerPage.workCount.one': '{count} work',
  'makerPage.workCount.other': '{count} works',
  'makerPage.availableHeading': 'Available',
  'makerPage.soldHeading': 'Previously sold',
  'makerPage.lettersLabel': 'Makers, A to Z',
  'empty.makerAvailable': 'No works by {maker} are available right now.',
})

export type MakerMessageKey = keyof typeof MAKER_KEYS
export type MakerKey = MakerMessageKey | LexiconMessageKey
export type MakerText = {
  (key: MakerKey | PluralBase<MakerKey>, params?: MessageParams): string
}

/** The gallery's maker-page words for one locale: this module's keys plus the shared lexicon's. */
export function makerText(locale: SiteLocale): MakerText {
  const mine: Messages<MakerMessageKey> = createMessages({
    defaults: MAKER_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.gallery,
  })
  const shared = lexiconMessages('gallery', locale)
  const mineT = mine.t.bind(mine)
  const sharedT = shared.t.bind(shared)
  const defaults = MAKER_KEYS as Record<string, unknown>
  // `key` may be a plural base (`makerPage.workCount`), which MAKER_KEYS holds only as its
  // `.one`/`.other` siblings — so a plain key lookup alone would miss it (mirrors `pluralFormOf`'s
  // own `.other` check, `@engine/i18n`'s `messages.ts`).
  const t = (key: MakerKey, params?: MessageParams) =>
    defaults[key] !== undefined || defaults[`${key}.other`] !== undefined
      ? mineT(key as MakerMessageKey, params)
      : sharedT(key as LexiconMessageKey, params)
  return t as MakerText
}
