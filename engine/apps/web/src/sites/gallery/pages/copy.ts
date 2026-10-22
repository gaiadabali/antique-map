/**
 * The editorial and information pages' words (5.4.b): the keys and neutral defaults here, the
 * values in the gallery's lexicon files (`../lexicon/{en,id}.json`, CONVENTIONS.md §6) — mirrors
 * `../browse/copy.ts`'s own split. Most of a page's own words are the CMS record's (title, intro,
 * body); this module is only the chrome around it.
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

export const CMS_PAGE_KEYS = defineMessages({
  'cmsPage.worksHeading': 'Works in this story',
  'notFound.title': 'Page not found',
  'notFound.body':
    'There is nothing at this address. The piece may have moved or sold on; search the collection, or browse it from the start.',
  'notFound.browse': 'Browse the collection',
  'notFound.home': 'Go to the home page',
})

export type CmsPageMessageKey = keyof typeof CMS_PAGE_KEYS
export type CmsPageKey = CmsPageMessageKey | LexiconMessageKey
export type CmsPageText = {
  (key: CmsPageKey | PluralBase<CmsPageKey>, params?: MessageParams): string
}

/** The gallery's CMS-page words for one locale: this module's keys plus the shared lexicon's. */
export function cmsPageText(locale: SiteLocale): CmsPageText {
  const mine: Messages<CmsPageMessageKey> = createMessages({
    defaults: CMS_PAGE_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.gallery,
  })
  const shared = lexiconMessages('gallery', locale)
  const mineT = mine.t.bind(mine)
  const sharedT = shared.t.bind(shared)
  const defaults = CMS_PAGE_KEYS as Record<string, unknown>
  const t = (key: CmsPageKey, params?: MessageParams) =>
    defaults[key] !== undefined || defaults[`${key}.other`] !== undefined
      ? mineT(key as CmsPageMessageKey, params)
      : sharedT(key as LexiconMessageKey, params)
  return t as CmsPageText
}
