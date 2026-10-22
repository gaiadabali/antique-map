/**
 * Each site's copy: the values for the app's message keys, per locale, from the site's lexicon
 * files (`src/sites/<site>/lexicon/<locale>.json`, CONVENTIONS.md §6). Imported, so they are
 * bundled into the server build and never read from disk at request time; a page joins them with
 * its keys through `createMessages()` (`./messages`).
 */
import type { SiteKey, SiteLocale } from '@engine/config/sites'
import type { CopyValues } from '@engine/i18n'

import galleryEn from '../sites/gallery/lexicon/en.json'
import galleryId from '../sites/gallery/lexicon/id.json'
import shopEn from '../sites/shop/lexicon/en.json'
import shopId from '../sites/shop/lexicon/id.json'

export const SITE_COPY = {
  gallery: { en: galleryEn, id: galleryId },
  shop: { en: shopEn, id: shopId },
} as const satisfies Record<SiteKey, Record<SiteLocale, CopyValues>>
