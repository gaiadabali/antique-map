/**
 * The place page's loaders (5.4.a): the process's Payload, handed to `./queries`'s real query
 * logic — kept free of `'server-only'` so a database test can call it with a pushed test stack's
 * own instance (the tracking page's own split, `server/shop/tracking`).
 *
 * Cached under `'use cache'` with the gallery catalogue's tag (`catalogueTag('gallery')`) and its
 * backstop `cacheLife('hours')` (`../catalogue/catalogue` says why): a place page reads the
 * gazetteer and its published works' cards — places, works, makers and terms, every one of whose
 * published changes expires that tag (`@engine/cms` `work-invalidate`, `vocabulary-invalidate`).
 * The cache key is the joined path and the locale; nothing here reads a request.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import { cacheTags, catalogueTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'

import { loadPlaceIndexWith, loadPlaceWith } from './queries'

export type { HistoricalNameVM, PlaceChildVM, PlaceIndexNodeVM, PlaceVM } from './view-models'

async function loadPlaceByPath(joined: string, locale: SiteLocale) {
  'use cache'
  cacheLife('hours')
  cacheTags([catalogueTag('gallery')])
  return loadPlaceWith(await cms(), joined.split('/'), locale)
}

/** One place page's data, or `null` — the path names no published place. */
export function loadPlace(path: readonly string[], locale: SiteLocale) {
  // Keyed by the joined path: a segment never holds a `/` (`@engine/config/sites`
  // `readSegments()` refuses one), so the join is exact.
  return loadPlaceByPath(path.join('/'), locale)
}

/** The places index: the gazetteer's top-level branches. */
export async function loadPlaceIndex(locale: SiteLocale) {
  'use cache'
  cacheLife('hours')
  cacheTags([catalogueTag('gallery')])
  return loadPlaceIndexWith(await cms(), locale)
}
