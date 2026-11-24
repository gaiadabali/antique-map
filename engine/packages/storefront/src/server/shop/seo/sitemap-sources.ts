/**
 * The shop's sitemap sources (9.3fix; moved from today's app with the shop's pages, TASKS.md 23.5):
 * every published product and its category, read as the visitor (`@engine/site/seo/published`),
 * the shop's own records found with `shopOnly` — `site: shop` in today's one CMS, every record in
 * the shop's own — so both apps' sitemaps list the same paths. Cached under `catalogue:shop`
 * (`cacheLife('hours')`): a publish already expires that tag.
 */
import { cacheLife } from 'next/cache'
import type { Payload } from 'payload'

import { cacheTags, catalogueTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import { shopOnly } from '@engine/cms-shop/site'
import { createHref, SITES } from '@engine/config/sites'
import type { SitemapEntry } from '@engine/site/seo'
import { entryOf, findPublished } from '@engine/site/seo/published'

const shopHref = createHref(SITES.shop)
const str = (value: unknown): string => (typeof value === 'string' ? value : '')

/** The shop's sitemap entries: static surfaces plus every published product and category —
 * `/contact` is not among them, the shop has no such route (the crawl's 404). Published CMS pages
 * are not listed either: the shop has no generic page route yet to carry one (never list a path
 * that does not route). */
export async function queryShopSitemap(payload: Payload): Promise<readonly SitemapEntry[]> {
  const [products, categoryDocs] = await Promise.all([
    findPublished(payload, 'products', shopOnly(payload, 'products'), {
      slug: true,
      updatedAt: true,
    }),
    findPublished(payload, 'products', shopOnly(payload, 'products'), { category: true }, 1),
  ])

  const staticEntries: SitemapEntry[] = (['home', 'browse', 'partnership'] as const).map(
    (surface) => entryOf({ en: shopHref(surface, {}, 'en'), id: shopHref(surface, {}, 'id') }),
  )

  const productEntries = products.map((doc) =>
    entryOf(
      {
        en: shopHref('product', { slug: str(doc.slug) }, 'en'),
        id: shopHref('product', { slug: str(doc.slug) }, 'id'),
      },
      doc.updatedAt,
    ),
  )

  const categories = new Map<string, unknown>()
  for (const doc of categoryDocs) {
    const category = doc.category
    if (typeof category !== 'object' || category === null) continue
    const term = category as { slug?: unknown; updatedAt?: unknown }
    if (typeof term.slug === 'string' && !categories.has(term.slug)) {
      categories.set(term.slug, term.updatedAt)
    }
  }
  const categoryEntries = [...categories.entries()].map(([slug, updatedAt]) =>
    entryOf(
      { en: shopHref('collection', { slug }, 'en'), id: shopHref('collection', { slug }, 'id') },
      updatedAt,
    ),
  )

  return [...staticEntries, ...productEntries, ...categoryEntries]
}

export async function shopSitemapEntries(): Promise<readonly SitemapEntry[]> {
  'use cache'
  cacheLife('hours')
  cacheTags([catalogueTag('shop')])
  return queryShopSitemap(await cms())
}
