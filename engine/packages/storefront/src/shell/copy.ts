/**
 * The shop's copy: its lexicon's values per locale (`../sites/shop/lexicon/<locale>.json`,
 * CONVENTIONS.md §6), keyed as today's app keys every site's (`SITE_COPY.shop`), so the shop's
 * code reads its words the same way in either app. Imported, so they are bundled into the server
 * build and never read from disk at request time.
 */
import type { SiteLocale } from '@engine/config/sites'
import type { CopyValues } from '@engine/i18n'

import shopEn from '../sites/shop/lexicon/en.json'
import shopId from '../sites/shop/lexicon/id.json'

export const SITE_COPY = {
  shop: { en: shopEn, id: shopId },
} as const satisfies { shop: Record<SiteLocale, CopyValues> }
