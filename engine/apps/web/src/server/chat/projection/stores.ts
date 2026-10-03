/**
 * `store_info` and `delivery_info` (AI.md §2.4). Stores: the public list only — active and listed,
 * `overrideAccess: false` — and only name, area, address and opening hours: never a store's
 * code, WhatsApp, coordinates, notes or stock. Delivery: from `site-settings`, never the model's
 * knowledge; the shop's bands as server-formatted fee labels, the gallery's fixed statement.
 */
import 'server-only'

import { formatMoney } from '@engine/i18n'

import type { ChatCopy } from '../lexicon'
import type { CatalogueFind, CatalogueReader } from '../ports'
import type { ChatSettings, SiteKey, SiteLocale } from '../types'
import { assertPublicProjection } from './forbidden'
import { asDoc, str } from './read'
import { literal } from './works'

export const STORE_SELECT = { name: true, area: true, address: true, hours: true } as const

export type StoreInfo = {
  readonly name: string
  readonly area: string | null
  readonly address: string | null
  readonly hours: string | null
}

export function storeQuery(area: string | undefined, locale: SiteLocale): CatalogueFind {
  const and: Record<string, unknown>[] = [
    { active: { equals: true } },
    { listed: { equals: true } },
  ]
  const words = area === undefined ? '' : literal(area)
  if (words !== '') and.push({ or: [{ area: { like: words } }, { name: { like: words } }] })
  return {
    collection: 'stores',
    where: { and },
    select: STORE_SELECT,
    limit: 12,
    locale,
    depth: 0,
  }
}

export async function findStores(
  reader: CatalogueReader,
  area: string | undefined,
  locale: SiteLocale,
): Promise<readonly StoreInfo[]> {
  const docs = await reader.find(storeQuery(area, locale))
  const stores = docs.flatMap((raw) => {
    const doc = asDoc(raw)
    const name = str(doc?.name, 160)
    if (doc === null || name === null) return []
    return [
      {
        name,
        area: str(doc.area, 120),
        address: str(doc.address, 400),
        hours: str(doc.hours, 600),
      },
    ]
  })
  return assertPublicProjection(stores, 'shop')
}

export type DeliveryInfo =
  | { readonly site: 'gallery'; readonly statement: string }
  | {
      readonly site: 'shop'
      readonly statement: string
      readonly bands: readonly { readonly upToKm: number; readonly feeLabel: string }[]
      readonly reachKm: number | null
      readonly freeOverLabel: string | null
    }

export function deliveryInfo(
  site: SiteKey,
  settings: ChatSettings,
  locale: SiteLocale,
  t: ChatCopy,
): DeliveryInfo {
  if (site === 'gallery') {
    return assertPublicProjection({ site, statement: t('delivery.gallery') }, site)
  }
  const bands = [...(settings.delivery?.bands ?? [])]
    .filter((band) => Number.isFinite(band.upToKm) && Number.isSafeInteger(band.feeIdr))
    .sort((a, b) => a.upToKm - b.upToKm)
  const free = settings.delivery?.freeOverIdr ?? null
  const label = (rupiah: number) => formatMoney({ amount: rupiah, currency: 'IDR' }, locale)
  return assertPublicProjection(
    {
      site,
      statement: t('delivery.shop'),
      bands: bands.map((band) => ({ upToKm: band.upToKm, feeLabel: label(band.feeIdr) })),
      reachKm: bands.at(-1)?.upToKm ?? null,
      freeOverLabel: free !== null && Number.isSafeInteger(free) && free > 0 ? label(free) : null,
    },
    site,
  )
}
