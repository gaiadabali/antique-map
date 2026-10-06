/**
 * The place page's loaders (5.4.a): the process's Payload, handed to `./queries`'s real query
 * logic — kept free of `'server-only'` so a database test can call it with a pushed test stack's
 * own instance (the tracking page's own split, `server/shop/tracking`).
 *
 * Each loader is React's `cache()`: a page's `generateMetadata` and its body read the same record
 * once per request, not twice (the reads are live — `./queries.ts` says why they carry no tag).
 */
import 'server-only'

import { cache } from 'react'

import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'

import { loadPlaceIndexWith, loadPlaceWith } from './queries'

export type { HistoricalNameVM, PlaceChildVM, PlaceIndexNodeVM, PlaceVM } from './view-models'

const loadPlaceByPath = cache(async (joined: string, locale: SiteLocale) =>
  loadPlaceWith(await cms(), joined.split('/'), locale),
)

/** One place page's data, or `null` — the path names no published place. */
export function loadPlace(path: readonly string[], locale: SiteLocale) {
  // Keyed by the joined path, not the array: `cache()` compares arguments by identity. A segment
  // never holds a `/` (`@engine/config/sites` `readSegments()` refuses one), so the join is exact.
  return loadPlaceByPath(path.join('/'), locale)
}

/** The places index: the gazetteer's top-level branches. */
export async function loadPlaceIndex(locale: SiteLocale) {
  return loadPlaceIndexWith(await cms(), locale)
}
