/**
 * The place page's loaders (5.4.a): the process's Payload, handed to `./queries`'s real query
 * logic — kept free of `'server-only'` so a database test can call it with a pushed test stack's
 * own instance (the tracking page's own split, `server/shop/tracking`).
 */
import 'server-only'

import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'

import { loadPlaceIndexWith, loadPlaceWith } from './queries'

export type { HistoricalNameVM, PlaceChildVM, PlaceIndexNodeVM, PlaceVM } from './view-models'

/** One place page's data, or `null` — the path names no published place. */
export async function loadPlace(path: readonly string[], locale: SiteLocale) {
  return loadPlaceWith(await cms(), path, locale)
}

/** The places index: the gazetteer's top-level branches. */
export async function loadPlaceIndex(locale: SiteLocale) {
  return loadPlaceIndexWith(await cms(), locale)
}
