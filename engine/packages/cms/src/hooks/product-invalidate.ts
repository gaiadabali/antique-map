/**
 * A product's change expires what the public was shown of it (6-followup-2 B, mirroring
 * `./work-invalidate`) — through `@engine/cache`'s `invalidate(tags)`, the one way a write
 * expires a cached read, which runs **after the commit**: Payload runs `afterChange` and
 * `afterDelete` before it commits, so the hook never revalidates on the spot. Inside a Next request
 * `invalidate()` schedules the revalidation with `after()`, once the response has gone; outside one
 * (a seed, the importer, a job) the caller's collector on `req.context` keeps the tags, and the
 * caller flushes them once its operation has returned.
 *
 * **Which tags.** `product:<id>` — the product's own record and whatever renders it: its page, its
 * card — and `catalogue:shop`, the shop's listings: categories, browse, search and the new-products
 * rail, which show products no record tag can name (a product published a moment ago is on no
 * cached listing yet). Every save that touches published state expires both: a publish, an edit of
 * a published product, an unpublish, a delete. A draft saved over a published product cannot be
 * told from an unpublish here, so it expires them too (`./published-state`'s draft → draft trap).
 */
import { catalogueTag, invalidate, productTag, type CacheTag } from '@engine/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { changedPublishedState } from './published-state'

type ProductDoc = { id?: unknown; _status?: unknown } | null | undefined

/** The shop's listings: every published product's change can add to, drop from or reorder one. */
const SHOP_CATALOGUE = catalogueTag('shop')

const idOf = (doc: ProductDoc) => (typeof doc?.id === 'number' ? doc.id : null)

/** The tags a change to `doc` expires: its own product tag and the shop's listings. */
export function productListingTags(doc: ProductDoc): CacheTag[] {
  const id = idOf(doc)
  return [...(id === null ? [] : [productTag(id)]), SHOP_CATALOGUE]
}

export const invalidateProductOnChange: CollectionAfterChangeHook = async (args) => {
  const { doc, context } = args
  if (!(await changedPublishedState(args))) return doc
  invalidate(productListingTags(doc as ProductDoc), context)
  return doc
}

export const invalidateProductOnDelete: CollectionAfterDeleteHook = ({ doc, context }) => {
  // A product never published leaves nothing cached behind; unpublishing it expired its tags then.
  if ((doc as ProductDoc)?._status === 'draft') return doc
  invalidate(productListingTags(doc as ProductDoc), context)
  return doc
}
