/**
 * Sitemap sources (9.3fix): every published record each site's sitemap must list, each read
 * `overrideAccess: false`, `_status: 'published'`, an explicit `select` of only the fields a URL
 * and its `<lastmod>` need — never a price, a note or a staff field.
 *
 * Each site has an uncached `query…` (on the caller's Payload — the db test's door) and a cached
 * `…SitemapEntries()` that wraps it. Cached under the site's own `catalogue:<site>` tag (`@engine/cache`), the catalogue's own
 * profile (`cacheLife('hours')`): a publish or unpublish already expires that tag, so the sitemap
 * picks it up with no cache of its own to invalidate.
 */
import { cacheLife } from 'next/cache'
import type { Payload, SelectType, Where } from 'payload'

import { cacheTags, catalogueTag } from '@engine/cache'
import { cms } from '@engine/cms/instance'
import { createHref, SITES } from '@engine/config/sites'

import { slugOf } from '../gallery/item/view-model'
import type { SitemapEntry } from './sitemap'

const galleryHref = createHref(SITES.gallery)
const shopHref = createHref(SITES.shop)

function entryOf(paths: SitemapEntry['paths'], updatedAt?: unknown): SitemapEntry {
  return typeof updatedAt === 'string' ? { paths, lastModified: new Date(updatedAt) } : { paths }
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '')

async function findPublished(
  payload: Payload,
  collection: 'works' | 'makers' | 'places' | 'pages' | 'products',
  where: Where,
  select: SelectType,
  depth = 0,
): Promise<readonly Record<string, unknown>[]> {
  const found = await payload.find({
    collection,
    overrideAccess: false,
    where: { and: [{ _status: { equals: 'published' } }, where] },
    select,
    depth,
    limit: 0,
    pagination: false,
  })
  return found.docs as readonly Record<string, unknown>[]
}

/** The gazetteer's published places, each as its full ancestor-first path (`java/batavia`) — the
 * same tree `server/gallery/catalogue/places` builds, re-read here so the sitemap also gets each
 * place's own `updatedAt` (the catalogue's facet tree has no reason to carry it). */
async function galleryPlaceEntries(payload: Payload): Promise<readonly SitemapEntry[]> {
  const docs = await findPublished(payload, 'places', {}, { slug: true, parent: true, updatedAt: true })
  type Node = { id: number; slug: string; parentId: number | null; updatedAt: unknown }
  const nodes: Node[] = docs.map((doc) => {
    const parent = doc.parent
    const parentId =
      typeof parent === 'number'
        ? parent
        : typeof parent === 'object' && parent !== null && 'id' in parent
          ? Number((parent as { id: unknown }).id)
          : null
    return { id: Number(doc.id), slug: str(doc.slug), parentId, updatedAt: doc.updatedAt }
  })
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const pathOf = (node: Node): readonly string[] => {
    const chain: string[] = []
    let current: Node | undefined = node
    while (current !== undefined) {
      chain.unshift(current.slug)
      current = current.parentId === null ? undefined : byId.get(current.parentId)
    }
    return chain
  }
  return nodes
    .filter((node) => node.slug !== '')
    .map((node) => {
      const path = pathOf(node)
      return entryOf(
        {
          en: galleryHref('place', { path: [...path] }, 'en'),
          id: galleryHref('place', { path: [...path] }, 'id'),
        },
        node.updatedAt,
      )
    })
}

/** The gallery's sitemap entries: static surfaces plus every published work (sold too), maker,
 * place, page and story. */
export async function queryGallerySitemap(payload: Payload): Promise<readonly SitemapEntry[]> {
  const [works, makers, pages, places] = await Promise.all([
    findPublished(payload, 'works', {}, { title: true, publicId: true, updatedAt: true }),
    findPublished(payload, 'makers', {}, { slug: true, updatedAt: true }),
    findPublished(payload, 'pages', { site: { equals: 'gallery' } }, { slug: true, kind: true, updatedAt: true }),
    galleryPlaceEntries(payload),
  ])

  const staticEntries: SitemapEntry[] = (
    ['home', 'browse', 'maker', 'place', 'contact', 'sellToUs'] as const
  ).map((surface) =>
    entryOf({ en: galleryHref(surface, {}, 'en'), id: galleryHref(surface, {}, 'id') }),
  )

  const workEntries = works.map((doc) => {
    const slug = slugOf(str(doc.title))
    const publicId = Number(doc.publicId)
    return entryOf(
      {
        en: galleryHref('item', { publicId, slug }, 'en'),
        id: galleryHref('item', { publicId, slug }, 'id'),
      },
      doc.updatedAt,
    )
  })

  const makerEntries = makers.map((doc) => {
    const slug = str(doc.slug)
    return entryOf(
      { en: galleryHref('maker', { slug }, 'en'), id: galleryHref('maker', { slug }, 'id') },
      doc.updatedAt,
    )
  })

  const pageEntries = pages.map((doc) => {
    const slug = str(doc.slug)
    const surface = doc.kind === 'story' ? ('story' as const) : ('page' as const)
    return entryOf(
      { en: galleryHref(surface, { slug }, 'en'), id: galleryHref(surface, { slug }, 'id') },
      doc.updatedAt,
    )
  })

  return [...staticEntries, ...workEntries, ...makerEntries, ...pageEntries, ...places]
}

export async function gallerySitemapEntries(): Promise<readonly SitemapEntry[]> {
  'use cache'
  cacheLife('hours')
  cacheTags([catalogueTag('gallery')])
  return queryGallerySitemap(await cms())
}

/** The shop's sitemap entries: static surfaces plus every published product and category —
 * `/contact` is not among them, the shop has no such route (the crawl's 404). Published CMS pages
 * are not listed either: the shop has no generic page route yet to carry one (never list a path
 * that does not route). */
export async function queryShopSitemap(payload: Payload): Promise<readonly SitemapEntry[]> {
  const [products, categoryDocs] = await Promise.all([
    findPublished(
      payload,
      'products',
      { site: { equals: 'shop' } },
      { slug: true, updatedAt: true },
    ),
    findPublished(payload, 'products', { site: { equals: 'shop' } }, { category: true }, 1),
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
