/**
 * What a URL on the old site is, and whether the reader fetches it. Every
 * same-origin URL the pages link to is inventoried — the redirect gate
 * (TASKS.md 37.1.b) requests them all against the new site — but only the
 * ones that carry catalogue content are fetched: product pages, listing pages
 * (with an allowed query only), plain pages, and the original of each product
 * image. Sort orders, sized image variants, assets and never-paths are
 * recorded and left alone.
 */
import type { ReaderConfig } from './config.ts'

export type UrlClass =
  | { kind: 'product'; id: number; slug: string }
  | { kind: 'listing'; listing: string; id: number; slug: string }
  | { kind: 'image'; productId: number; imageId: number; size: string }
  | { kind: 'page' }
  | { kind: 'asset' }

export type Classifier = {
  classify(url: URL): UrlClass
  /** The canonical absolute URL for `href` found on `base`, or null (off-site, not http, a fragment only). */
  normalise(href: string, base: string): URL | null
  /** Whether the reader fetches this URL (the never-list and robots are the fetcher's to apply). */
  isFetched(url: URL, klass: UrlClass): boolean
}

const ASSET_EXTENSION = /\.[a-z0-9]{2,5}$/i

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#0*38;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
}

export function createClassifier(config: ReaderConfig): Classifier {
  const product = new RegExp(config.routes.product)
  const image = new RegExp(config.routes.image)
  const listings = Object.entries(config.routes.listings).map(
    ([name, pattern]) => [name, new RegExp(pattern)] as const,
  )
  const origin = config.baseUrl

  function classify(url: URL): UrlClass {
    const path = url.pathname
    const productMatch = product.exec(path)
    if (productMatch?.groups) {
      return {
        kind: 'product',
        id: Number(productMatch.groups.id),
        slug: productMatch.groups.slug ?? '',
      }
    }
    const imageMatch = image.exec(path)
    if (imageMatch?.groups) {
      return {
        kind: 'image',
        productId: Number(imageMatch.groups.productId),
        imageId: Number(imageMatch.groups.imageId),
        size: imageMatch.groups.size ?? '',
      }
    }
    for (const [name, pattern] of listings) {
      const match = pattern.exec(path)
      if (match?.groups) {
        return {
          kind: 'listing',
          listing: name,
          id: Number(match.groups.id),
          slug: match.groups.slug ?? '',
        }
      }
    }
    return ASSET_EXTENSION.test(path) ? { kind: 'asset' } : { kind: 'page' }
  }

  function queryAllowed(url: URL): boolean {
    for (const [param, value] of url.searchParams) {
      const allowed = config.fetchQuery[param]
      if (allowed === undefined) return false
      if (allowed !== '*' && !allowed.includes(value)) return false
    }
    return true
  }

  function normalise(href: string, base: string): URL | null {
    const trimmed = decodeEntities(href.trim())
    if (trimmed === '' || trimmed.startsWith('#')) return null
    let url: URL
    try {
      url = new URL(trimmed, base)
    } catch {
      return null
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    // The origin is compared on host alone: an http:// link to the same host is the same page.
    if (url.host !== new URL(origin).host) return null
    const canonical = new URL(`${url.pathname}${url.search}`, origin)
    canonical.hash = ''
    return canonical
  }

  function isFetched(url: URL, klass: UrlClass): boolean {
    switch (klass.kind) {
      case 'product':
        return url.search === ''
      case 'listing':
        return queryAllowed(url)
      case 'image':
        return config.fetchImages && klass.size === '' && url.search === ''
      case 'page':
        return url.search === ''
      case 'asset':
        return false
    }
  }

  return { classify, normalise, isFetched }
}

/** `/path?query` of a URL, as the inventory records it. */
export function pathAndQuery(url: URL): string {
  return `${url.pathname}${url.search}`
}
