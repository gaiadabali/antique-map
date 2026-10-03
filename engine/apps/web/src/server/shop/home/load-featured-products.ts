/**
 * The shop home's featured products (ticket 4.3.b).
 *
 * Public read: `overrideAccess: false`, drafts filtered by `_status: 'published'`, and only the
 * fields a home card shows selected — name, slug, list price, category and the images. The price
 * is integer rupiah priced on the server; the page renders it through `formatRupiah` and never
 * trusts any price from a request.
 *
 * Cached: `'use cache'`, each record tagged by `@engine/cache`'s builders (`productTag` and
 * `productPriceTag`, editorial and price respectively) so an invalidation of either reaches the
 * home that shows it. A tag is never written by hand. The cache key carries the locale argument
 * (ARCHITECTURE.md §6): names and captions are localised.
 *
 * Build safety: only called inside the home page's render, under a root layout that awaits
 * `connection()` first, so `cms()` never runs at `next build` and the build succeeds with no
 * `DATABASE_URL`.
 */
import 'server-only'

import { cacheTags, productPriceTag, productTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'

export type FeaturedProduct = {
  readonly name: string
  readonly slug: string
  readonly price: number
  readonly imageUrl: string | null
  readonly imageAlt: string
}

const LIMIT = 4

export async function loadFeaturedProducts(
  _locale: SiteLocale,
): Promise<readonly FeaturedProduct[]> {
  'use cache'
  const payload = await cms()
  const found = await payload.find({
    collection: 'products',
    overrideAccess: false,
    limit: LIMIT,
    sort: '-updatedAt',
    where: { and: [{ _status: { equals: 'published' } }, { site: { equals: 'shop' } }] },
    select: {
      name: true,
      slug: true,
      price: true,
      images: { image: { url: true, alt: true } },
    },
  })
  cacheTags(
    found.docs.flatMap((product) => {
      const tags: ReturnType<typeof productTag>[] = []
      if (typeof product.id === 'number')
        tags.push(productTag(product.id), productPriceTag(product.id))
      return tags
    }),
  )
  return found.docs.map((product) => {
    // The `select` projection types `images` as `{}`; shape it here once, defensively.
    const images = product.images as
      readonly { image?: { url?: unknown; alt?: unknown } }[] | undefined
    const media = images?.[0]?.image
    return {
      name: typeof product.name === 'string' ? product.name : '',
      slug: typeof product.slug === 'string' ? product.slug : '',
      price: typeof product.price === 'number' ? product.price : 0,
      imageUrl: typeof media?.url === 'string' ? media.url : null,
      imageAlt:
        typeof media?.alt === 'string' && media.alt
          ? media.alt
          : typeof product.name === 'string'
            ? product.name
            : '',
    }
  })
}
