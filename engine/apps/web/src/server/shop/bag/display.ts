/**
 * What a bag line shows beside its price (TASKS.md 6.2; EXPERIENCE-SHOP.md §5): the product's
 * name, address and first image, and each variant's label by SKU. Editorial content only — the
 * price and availability come from the quote, computed live, never cached. The read is
 * published-only and projected (`overrideAccess: false`, `_status: 'published'`, an explicit
 * `select`), like the catalogue's (`../catalogue/queries`), and cached under the same tag so one
 * product edit re-renders the bag that shows it.
 */
import 'server-only'

import { cacheTag } from 'next/cache'

import { cms } from '@engine/cms/instance'

import { PUBLIC_IMAGE_SELECT } from '../../media/public-image'
import { imageOf } from '../catalogue/images'
import type { CatalogueImage } from '../catalogue/view-models'

export type BagDisplay = {
  readonly productId: number
  readonly slug: string
  readonly name: string
  /**
   * The first image as the catalogue shows it — the public derivative and its ladder, the
   * synthetic label — or `null` when the product has none published yet.
   */
  readonly image: CatalogueImage | null
  /** A variant's label by SKU; the page falls back to the SKU for one it does not name. */
  readonly variantLabels: Readonly<Record<string, string>>
}

type Doc = Record<string, unknown>

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/**
 * The bag's products as the bag page shows them. A product missing here was unpublished (or
 * deleted) since it was added: the page marks the line unavailable and offers to remove it.
 */
export async function displayFor(productIds: readonly number[]): Promise<readonly BagDisplay[]> {
  'use cache'
  cacheTag('products')
  const ids = [...new Set(productIds)]
  if (ids.length === 0) return []
  const payload = await cms()
  const found = await payload.find({
    collection: 'products',
    overrideAccess: false,
    where: {
      and: [
        { _status: { equals: 'published' } },
        { site: { equals: 'shop' } },
        { id: { in: ids } },
      ],
    },
    select: {
      name: true,
      slug: true,
      images: { image: { ...PUBLIC_IMAGE_SELECT, provenance: true } },
      variants: { sku: true, label: true },
    },
    depth: 1,
    pagination: false,
    limit: 20,
  })
  const display: BagDisplay[] = []
  for (const doc of found.docs as unknown as readonly Doc[]) {
    const id = typeof doc.id === 'number' ? doc.id : null
    if (id === null || typeof doc.slug !== 'string' || typeof doc.name !== 'string') continue
    const labels: Record<string, string> = {}
    for (const raw of asArray(doc.variants)) {
      if (typeof raw !== 'object' || raw === null) continue
      const variant = raw as Doc
      if (
        typeof variant.sku === 'string' &&
        typeof variant.label === 'string' &&
        variant.label !== ''
      ) {
        labels[variant.sku] = variant.label
      }
    }
    display.push({
      productId: id,
      slug: doc.slug,
      name: doc.name,
      image: imageOf((asArray(doc.images)[0] as { image?: unknown } | undefined)?.image),
      variantLabels: labels,
    })
  }
  return display
}
