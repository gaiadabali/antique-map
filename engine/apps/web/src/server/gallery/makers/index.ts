/**
 * The maker page's loaders (5.4.a): the process's Payload, handed to `./queries`'s real query
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

import { loadMakerIndexWith, loadMakerWith } from './queries'

export type { MakerIndexItemVM, MakerVM } from './view-models'

/** One maker page's data, or `null` — no published maker has this slug. */
export const loadMaker = cache(async (slug: string, locale: SiteLocale) =>
  loadMakerWith(await cms(), slug, locale),
)

/** The makers index: every published maker, A–Z by sort name, with a count of its published
 * works. */
export async function loadMakerIndex(locale: SiteLocale) {
  return loadMakerIndexWith(await cms(), locale)
}
