/**
 * Pure JSON-LD builders. No money fields reach a gallery object; product prices are integer rupiah.
 *
 * `workJsonLd` guards against accidental price leakage: it throws if `offers`, `price`,
 * `priceCurrency` or a `Product` type appear anywhere in the returned object.
 */
import type { SiteKey } from '@engine/config/sites'

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
type JsonObject = { [key: string]: JsonValue }

type Work = {
  readonly title: string
  readonly maker?: string
  readonly year?: string | number | null
  readonly widthCm?: number | null
  readonly heightCm?: number | null
  readonly medium?: string | null
  readonly places?: readonly string[]
  readonly stockNumber?: string | null
  readonly image?: string | null
  readonly url: string
}

type Product = {
  readonly sku: string
  readonly name: string
  readonly image?: string | null
  readonly priceRupiah: number
  readonly inStock: boolean
  readonly url: string
}

const GALLERY_FORBIDDEN_KEYS = new Set<string>(['offers', 'price', 'priceCurrency'])
const GALLERY_FORBIDDEN_TYPE = 'Product'

function containsForbidden(value: JsonValue, seen = new Set<JsonValue>()): boolean {
  if (seen.has(value)) return false
  if (typeof value === 'object' && value !== null) seen.add(value)

  if (typeof value === 'string') {
    return value === GALLERY_FORBIDDEN_TYPE
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsForbidden(item, seen))
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (GALLERY_FORBIDDEN_KEYS.has(key)) return true
      if (containsForbidden(nested, seen)) return true
    }
  }
  return false
}

function quantitative(name: string, value: number | null | undefined): JsonObject | undefined {
  if (value === null || value === undefined) return undefined
  return {
    '@type': 'QuantitativeValue',
    name,
    value,
    unitCode: 'CMT',
    unitText: 'cm',
  }
}

export function workJsonLd(work: Work): JsonObject {
  const creator: JsonObject | undefined = work.maker
    ? { '@type': 'Person', name: work.maker }
    : undefined

  const width = quantitative('width', work.widthCm)
  const height = quantitative('height', work.heightCm)
  const dimensions: JsonObject[] = [width, height].filter((d): d is JsonObject => d !== undefined)

  const spatial: JsonObject[] | undefined =
    work.places && work.places.length > 0
      ? work.places.map((name) => ({ '@type': 'Place', name }))
      : undefined

  const result: JsonObject = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: work.title,
    url: work.url,
    ...(creator ? { creator } : {}),
    ...(work.year !== null && work.year !== undefined ? { dateCreated: String(work.year) } : {}),
    ...(dimensions.length > 0 ? { width: dimensions[0], height: dimensions[1] } : {}),
    ...(work.medium ? { artMedium: work.medium } : {}),
    ...(spatial && spatial.length > 0 ? { spatialCoverage: spatial } : {}),
    ...(work.stockNumber ? { identifier: work.stockNumber } : {}),
    ...(work.image ? { image: work.image } : {}),
  }

  if (containsForbidden(result)) {
    throw new Error(
      'Gallery JSON-LD must not contain offers, price, priceCurrency or a Product type',
    )
  }
  return result
}

export function productJsonLd(product: Product): JsonObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    sku: product.sku,
    name: product.name,
    url: product.url,
    brand: { '@type': 'Brand', name: 'Old East Indies' },
    ...(product.image ? { image: product.image } : {}),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'IDR',
      price: String(Math.round(product.priceRupiah)),
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: product.url,
    },
  }
}

export function breadcrumbJsonLd(
  items: readonly { readonly name: string; readonly url: string }[],
): JsonObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function organizationJsonLd(site: SiteKey, origin: string): JsonObject {
  const names: Record<SiteKey, string> = {
    gallery: 'Indies Gallery',
    shop: 'Old East Indies',
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: names[site],
    url: origin,
  }
}

export function jsonLdScript(obj: JsonObject): string {
  const serialized = JSON.stringify(obj, null, 2)
  const escaped = serialized.replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
  return `<script type="application/ld+json">${escaped}</script >`
}
