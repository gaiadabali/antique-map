/**
 * The `pages` collection's loaders for the gallery (5.4.b): the process's Payload, handed to
 * `./queries`'s real query logic — kept free of `'server-only'` so a database test can call it
 * with a pushed test stack's own instance (the tracking page's own split, `server/shop/tracking`).
 *
 * Each loader is React's `cache()`: a page's `generateMetadata` and its body read the same record
 * once per request, not twice (the reads are live — `./queries.ts` says why they carry no tag).
 */
import 'server-only'

import { cache } from 'react'

import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'

import { loadPageWith } from './queries'

export type { PageVM } from './view-models'

/** One page's data by its slug and kind, or `null` — no published gallery page matches. */
export const loadPage = cache(
  async (slug: string, locale: SiteLocale, kind: 'page' | 'story' = 'page') =>
    loadPageWith(await cms(), slug, locale, kind),
)
