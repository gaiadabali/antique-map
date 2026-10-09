/**
 * The collections index's read (13.1): every category that holds a published product, with its
 * product count and its lead picture. Built from the catalogue's own query helpers, so it stays
 * published-only and projected (`overrideAccess: false`); a price is read by the card query but
 * dropped here — the index never shows one. Cached and tagged like `categories()`.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import { cacheTags, catalogueTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'

import { collectionsOf, type CollectionVM } from './collections-of'
import { getCategories, getCategoryId, listProducts } from './queries'

export type { CollectionVM } from './collections-of'

const CATALOGUE = catalogueTag('shop')

/** The shop's collections, in label order; a category without a published product is left out. */
export async function collections(): Promise<readonly CollectionVM[]> {
  'use cache'
  cacheLife('hours')
  cacheTags([CATALOGUE])
  const payload = await cms()
  return collectionsOf(await getCategories(payload), async (category) => {
    const categoryId = await getCategoryId(payload, category.slug)
    if (categoryId === null) return { count: 0, image: null }
    // One card is enough: the lead picture is the newest product's, the total is the count.
    const { items, total } = await listProducts(payload, { categoryId, pageSize: 1 })
    return { count: total, image: items[0]?.image ?? null }
  })
}
