/**
 * The `pages` collection's loaders for the gallery (5.4.b): the process's Payload, handed to
 * `./queries`'s real query logic — kept free of `'server-only'` so a database test can call it
 * with a pushed test stack's own instance (the tracking page's own split, `server/shop/tracking`).
 */
import 'server-only'

import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'

import { loadPageWith } from './queries'

export type { PageVM } from './view-models'

/** One page's data by its slug and kind, or `null` — no published gallery page matches. */
export async function loadPage(slug: string, locale: SiteLocale, kind: 'page' | 'story' = 'page') {
  return loadPageWith(await cms(), slug, locale, kind)
}
