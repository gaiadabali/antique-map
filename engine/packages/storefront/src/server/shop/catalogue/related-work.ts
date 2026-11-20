/**
 * The antique a product is made from, in today's one database: `products.relatedWork`, a
 * relationship into `works`, read published-only and projected (its public id, title and slug). The
 * shop's own database holds a stock number instead (`originalStockNumber`), which the gallery's
 * public read API resolves (TASKS.md 23.5); this read never runs there.
 */
import type { Payload } from 'payload'

import { createHref, SITES } from '@engine/config/sites'

import type { RelatedWorkVM } from './view-models'

/** The antique a product is made from: its public id and title only, linked on the gallery's host. */
export async function getRelatedWork(
  payload: Payload,
  workId: number,
): Promise<RelatedWorkVM | null> {
  const { docs } = await payload.find({
    collection: 'works',
    overrideAccess: false,
    where: { and: [{ _status: { equals: 'published' } }, { id: { equals: workId } }] },
    select: { publicId: true, title: true, slug: true },
    limit: 1,
    depth: 0,
  })
  const work = docs[0]
  if (!work || typeof work.publicId !== 'number' || typeof work.title !== 'string') return null
  const slug = typeof work.slug === 'string' ? work.slug : ''
  return {
    publicId: work.publicId,
    title: work.title,
    slug,
    href: relatedWorkHref(work.publicId, slug),
  }
}

/**
 * The gallery item's absolute URL, built from `SITES`' gallery route map — never from a request.
 * English path: the gallery serves both locales and the product page links in the visitor's
 * language only in its words; TODO(9.3) locale-aware cross-site hrefs arrive with the SEO wave.
 */
function relatedWorkHref(publicId: number, slug: string): string {
  const href = createHref(SITES.gallery)
  const path =
    slug === ''
      ? href('item', { publicId, slug: '' }, 'en')
      : href('item', { publicId, slug }, 'en')
  return `https://${SITES.gallery.hostnames.production[0]}${path}`
}
