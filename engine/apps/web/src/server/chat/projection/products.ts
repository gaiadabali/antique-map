/**
 * The shop's products as the chat's tools return them (AI.md §2.4). Same three layers as
 * `./works`: a published, projected read; a field-by-field mapper; the forbidden-key guard. A
 * price leaves only as `priceLabel`, formatted on the server by `formatMoney` — the one place a
 * Money becomes text — so the model can copy it verbatim and never re-total a number. "In stock"
 * is a yes or no computed on the server; no per-store quantity is ever returned.
 */
import 'server-only'

import { createHref, siteOrigin, SITES } from '@engine/config/sites'
import { formatMoney } from '@engine/i18n'

import type { ChatCopy } from '../lexicon'
import type { CatalogueFind, CatalogueReader } from '../ports'
import type { SiteLocale } from '../types'
import { assertPublicProjection } from './forbidden'
import { asDoc, list, mediaUrl, num, plainText, relField, str } from './read'
import { literal, PUBLISHED } from './works'

const SHOP_ONLY = { site: { equals: 'shop' } } as const

export const PRODUCT_SUMMARY_SELECT = {
  name: true,
  slug: true,
  price: true,
  category: true,
  images: { image: true },
} as const

export const PRODUCT_DETAIL_SELECT = {
  ...PRODUCT_SUMMARY_SELECT,
  sku: true,
  description: true,
  variants: { sku: true, label: true, price: true, active: true },
} as const

export const PRODUCT_POPULATE = {
  terms: { label: true },
  media: { url: true, alt: true },
} as const

export type ProductSummary = {
  readonly id: string
  readonly title: string
  readonly summary: string | null
  readonly url: string
  readonly image: string | null
  readonly priceLabel: string | null
  readonly inStock: boolean
  readonly statusLabel: string
}

export type ProductDetail = ProductSummary & {
  readonly sku: string | null
  readonly category: string | null
  readonly description: string | null
  readonly variants: readonly {
    readonly sku: string
    readonly label: string | null
    readonly priceLabel: string | null
  }[]
}

const href = createHref(SITES.shop)

function priceLabel(rupiah: number | null, locale: SiteLocale): string | null {
  return rupiah !== null && Number.isSafeInteger(rupiah) && rupiah > 0
    ? formatMoney({ amount: rupiah, currency: 'IDR' }, locale)
    : null
}

function summaryOf(
  raw: unknown,
  inStock: ReadonlySet<string>,
  locale: SiteLocale,
  t: ChatCopy,
): (ProductSummary & { readonly internalId: string }) | null {
  const doc = asDoc(raw)
  const slug = str(doc?.slug, 200)
  const title = str(doc?.name, 240)
  const internalId = doc?.id
  if (doc === null || slug === null || title === null) return null
  if (typeof internalId !== 'string' && typeof internalId !== 'number') return null
  const stocked = inStock.has(String(internalId))
  return {
    internalId: String(internalId),
    id: slug,
    title,
    summary: relField(doc.category, 'label'),
    url: `${siteOrigin('shop') ?? ''}${href('product', { slug }, locale)}`,
    image: mediaUrl(asDoc(list(doc.images)[0])?.image),
    priceLabel: priceLabel(num(doc.price), locale),
    inStock: stocked,
    statusLabel: t(stocked ? 'product.inStock' : 'product.outOfStock'),
  }
}

function withoutInternalId<T extends { internalId: string }>({ internalId: _, ...rest }: T) {
  return rest
}

export function productSearchQuery(
  query: string,
  category: string | undefined,
  limit: number,
  locale: SiteLocale,
): CatalogueFind {
  const and: Record<string, unknown>[] = [PUBLISHED, SHOP_ONLY]
  const words = literal(query)
  if (words !== '') and.push({ or: [{ name: { like: words } }, { sku: { like: words } }] })
  if (category) and.push({ 'category.label': { like: literal(category) } })
  return {
    collection: 'products',
    where: { and },
    select: PRODUCT_SUMMARY_SELECT,
    populate: PRODUCT_POPULATE,
    limit,
    locale,
    depth: 1,
  }
}

export async function searchProducts(
  reader: CatalogueReader,
  args: { query: string; category?: string | undefined; limit: number },
  locale: SiteLocale,
  t: ChatCopy,
): Promise<readonly ProductSummary[]> {
  const docs = await reader.find(productSearchQuery(args.query, args.category, args.limit, locale))
  const ids = docs.flatMap((doc) => {
    const id = asDoc(doc)?.id
    return typeof id === 'string' || typeof id === 'number' ? [String(id)] : []
  })
  const stocked = ids.length > 0 ? await reader.productsInStock(ids) : new Set<string>()
  const summaries = docs.flatMap((doc) => summaryOf(doc, stocked, locale, t) ?? [])
  return assertPublicProjection(summaries.map(withoutInternalId), 'shop')
}

export function productBySlugQuery(slug: string, locale: SiteLocale): CatalogueFind {
  return {
    collection: 'products',
    where: { and: [PUBLISHED, SHOP_ONLY, { slug: { equals: slug } }] },
    select: PRODUCT_DETAIL_SELECT,
    populate: PRODUCT_POPULATE,
    limit: 1,
    locale,
    depth: 1,
  }
}

export async function getProduct(
  reader: CatalogueReader,
  id: string,
  locale: SiteLocale,
  t: ChatCopy,
): Promise<ProductDetail | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 200) return null
  const [doc] = await reader.find(productBySlugQuery(id, locale))
  const internalId = asDoc(doc)?.id
  if (doc === undefined || (typeof internalId !== 'string' && typeof internalId !== 'number')) {
    return null
  }
  const stocked = await reader.productsInStock([String(internalId)])
  const summary = summaryOf(doc, stocked, locale, t)
  const raw = asDoc(doc)
  if (summary === null || raw === null) return null
  const detail: ProductDetail = {
    ...withoutInternalId(summary),
    sku: str(raw.sku, 80),
    category: relField(raw.category, 'label'),
    description: plainText(raw.description),
    variants: list(raw.variants).flatMap((row) => {
      const variant = asDoc(row)
      const sku = str(variant?.sku, 80)
      if (variant === null || sku === null || variant.active === false) return []
      const own = num(variant.price)
      return [
        {
          sku,
          label: str(variant.label, 120),
          priceLabel: priceLabel(own ?? num(raw.price), locale),
        },
      ]
    }),
  }
  return assertPublicProjection(detail, 'shop')
}
