/**
 * The shop home's featured products (ticket 4.3.b).
 *
 * Public read: `overrideAccess: false`, drafts filtered by `_status: 'published'`, and only the
 * fields a home card shows selected — name, slug, list price, category and the images. The price
 * is integer rupiah priced on the server; the page renders it through `formatRupiah` and never
 * trusts any price from a request. The image is the public derivative, once the media pipeline
 * has published it (`../media/public-image`); a not-yet-ready record shows no image, never the
 * staff-only file route that `publicImageUrl`'s own fallback would otherwise answer with a 403.
 *
 * Cached: `'use cache'`, each record tagged by `@engine/cache`'s builders (`productTag` and
 * `productPriceTag`, editorial and price respectively) so an invalidation of either reaches the
 * home that shows it, and the shop's catalogue tag (`catalogueTag('shop')`): the rail is a
 * listing — the newest four — and a product published a moment ago carries no tag this entry
 * knows, so only the listing tag brings it in (the gallery's home rail had the same bug).
 * `cacheLife('hours')` is the backstop the catalogue's loaders declare (`../catalogue/catalogue`).
 * A tag is never written by hand. The cache key carries the locale argument (ARCHITECTURE.md §6):
 * names and captions are localised.
 *
 * Build safety: only called inside the home page's render, under a root layout that awaits
 * `connection()` first, so `cms()` never runs at `next build` and the build succeeds with no
 * `DATABASE_URL`.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import { cacheTags, catalogueTag, productPriceTag, productTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'

import { shopOnly } from '@engine/cms-shop/site'
import { PUBLIC_IMAGE_SELECT } from '@engine/site/media/public-image'
import { firstImageOf } from '../catalogue/images'
import type { CatalogueImage } from '../catalogue/view-models'
import { inPickedOrder, railQuery, type RailSelection } from '../pages/rail'

export type FeaturedProduct = {
  readonly name: string
  readonly slug: string
  readonly price: number
  /** The lead image as the catalogue shows it (derivative, srcSet, synthetic label), or null. */
  readonly image: CatalogueImage | null
}

/**
 * A rail's products (TASKS.md 27.5.d): the newest of the shop (the home hero's lead print too),
 * the newest of one category, or the editor's picks in the order dragged — published ones only.
 */
export async function loadFeaturedProducts(
  _locale: SiteLocale,
  selection: RailSelection = { source: 'newest' },
): Promise<readonly FeaturedProduct[]> {
  'use cache'
  cacheLife('hours')
  const payload = await cms()
  const query = railQuery(selection)
  const found = await payload.find({
    collection: 'products',
    overrideAccess: false,
    limit: query.limit,
    sort: query.sort,
    where: {
      and: [
        { _status: { equals: 'published' } },
        ...[shopOnly(payload, 'products') ?? []].flat(),
        ...query.where,
      ],
    },
    select: {
      name: true,
      slug: true,
      price: true,
      images: { image: { ...PUBLIC_IMAGE_SELECT, provenance: true } },
    },
  })
  cacheTags([
    catalogueTag('shop'),
    ...found.docs.flatMap((product) => {
      const tags: ReturnType<typeof productTag>[] = []
      if (typeof product.id === 'number')
        tags.push(productTag(product.id), productPriceTag(product.id))
      return tags
    }),
  ])
  const docs =
    selection.source === 'picked' ? inPickedOrder(found.docs, selection.productIds) : found.docs
  return docs.map((product) => {
    // The `select` projection types `images` as `{}`; shape it here once, defensively.
    const images = product.images as readonly { image?: unknown }[] | undefined
    return {
      name: typeof product.name === 'string' ? product.name : '',
      slug: typeof product.slug === 'string' ? product.slug : '',
      price: typeof product.price === 'number' ? product.price : 0,
      // The catalogue's own image reading (`../catalogue/images`): the public derivative once the
      // media pipeline has made it, its srcSet ladder and its synthetic label (10.6) — never
      // Payload's staff-only file route, which a not-ready record shows no image instead of.
      image: firstImageOf(images),
    }
  })
}
