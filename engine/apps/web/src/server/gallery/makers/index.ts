/**
 * The maker page's loaders (5.4.a): the process's Payload, handed to `./queries`'s real query
 * logic — kept free of `'server-only'` so a database test can call it with a pushed test stack's
 * own instance (the tracking page's own split, `server/shop/tracking`).
 *
 * Cached under `'use cache'` with the gallery catalogue's tag (`catalogueTag('gallery')`) and its
 * backstop `cacheLife('hours')` (`../catalogue/catalogue` says why): a maker page reads a maker and
 * its published works' cards — makers, works, places and terms, every one of whose published
 * changes expires that tag (`@engine/cms` `work-invalidate`, `vocabulary-invalidate`). The cache
 * key is the slug and the locale; nothing here reads a request.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import { cacheTags, catalogueTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'

import { loadMakerIndexWith, loadMakerWith } from './queries'

export type { MakerIndexItemVM, MakerVM } from './view-models'

/** One maker page's data, or `null` — no published maker has this slug. */
export async function loadMaker(slug: string, locale: SiteLocale) {
  'use cache'
  cacheLife('hours')
  cacheTags([catalogueTag('gallery')])
  return loadMakerWith(await cms(), slug, locale)
}

/** The makers index: every published maker, A–Z by sort name, with a count of its published
 * works. */
export async function loadMakerIndex(locale: SiteLocale) {
  'use cache'
  cacheLife('hours')
  cacheTags([catalogueTag('gallery')])
  return loadMakerIndexWith(await cms(), locale)
}
