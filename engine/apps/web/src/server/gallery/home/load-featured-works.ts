/**
 * The gallery home's featured works (ticket 4.3.b).
 *
 * Public read: `overrideAccess: false` so the read runs as the anonymous visitor, drafts and
 * held-and-hidden works never leaking; the query filters `_status: 'published'` and selects only
 * the fields the home's cards show. **No price field exists on `works` and none is selected** —
 * the gallery never quotes a price on its pages (the gallery sells by enquiry).
 *
 * Cached: `'use cache'` with each record's own tag from `@engine/cache`'s builder (`workTag`),
 * so one editorial invalidation of a work re-renders any home that shows it, and the gallery's
 * catalogue tag (`catalogueTag('gallery')`): the rail is a listing — the newest three — and a work
 * published a moment ago carries no tag this entry knows, so only the listing tag brings it in
 * (5.1 stale browse). `cacheLife('hours')` is the backstop the catalogue's loaders declare
 * (`../catalogue/catalogue`). A tag is never written by hand. The cache key carries the locale argument (ARCHITECTURE.md §6) even though
 * the works themselves are not localised, so each locale's entry is its own.
 *
 * Build safety: only called inside the home page's render, under a root layout that awaits
 * `connection()` first, so `cms()` never runs at `next build` and the build succeeds with no
 * `DATABASE_URL`.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import { cacheTags, catalogueTag, workTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import type { SiteLocale } from '@engine/config/sites'

export type FeaturedWork = {
  readonly title: string
  readonly publicId: number
  readonly workUid: string | null
  readonly objectType: string | null
  readonly publishedAt: string | null
  readonly imageUrl: string | null
  readonly imageAlt: string
}

const LIMIT = 3

export async function loadFeaturedWorks(_locale: SiteLocale): Promise<readonly FeaturedWork[]> {
  'use cache'
  cacheLife('hours')
  const payload = await cms()
  const found = await payload.find({
    collection: 'works',
    overrideAccess: false,
    limit: LIMIT,
    sort: '-updatedAt',
    where: { _status: { equals: 'published' } },
    select: {
      title: true,
      publicId: true,
      workUid: true,
      objectType: true,
      updatedAt: true,
      images: { media: { url: true, alt: true } },
    },
  })
  cacheTags([
    catalogueTag('gallery'),
    ...found.docs
      .map((work) =>
        typeof work.workUid === 'string' && work.workUid ? workTag(work.workUid) : null,
      )
      .filter((tag): tag is NonNullable<typeof tag> => tag !== null),
  ])
  return found.docs.map((work) => {
    // The `select` projection types `images` as `{}`; shape it here once, defensively.
    const images = work.images as
      readonly { media?: { url?: unknown; alt?: unknown } }[] | undefined
    const media = images?.[0]?.media
    return {
      title: typeof work.title === 'string' ? work.title : '',
      publicId: typeof work.publicId === 'number' ? work.publicId : 0,
      workUid: typeof work.workUid === 'string' && work.workUid ? work.workUid : null,
      objectType: typeof work.objectType === 'string' ? work.objectType : null,
      publishedAt: work.updatedAt instanceof Date ? work.updatedAt.toISOString() : null,
      imageUrl: typeof media?.url === 'string' ? media.url : null,
      imageAlt: typeof media?.alt === 'string' && media.alt ? media.alt : '',
    }
  })
}
