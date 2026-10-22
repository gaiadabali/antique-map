/**
 * The shop's stores page read (13.2): every store that is active and listed, projected to name,
 * area, address and hours. A public read of a protected collection — `overrideAccess: false`, so
 * the collection's own access answers with `PUBLIC_STORES`; `select` keeps a store's code,
 * WhatsApp, coordinates and notes out of the result in the first place.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import type { SiteLocale } from '@engine/config/sites'
import { cms } from '@engine/cms/instance'

import { groupByArea, type AreaGroup } from './group'

export type { AreaGroup, StoreVM } from './group'

/** A sane ceiling: the shop is stocked in 100+ stores; this leaves room without an unbounded read. */
const STORE_LIMIT = 500

/**
 * Cached for minutes only: there is no stores cache tag, and nothing invalidates one when a store
 * is edited, so a short life is the only way an edit reaches the page.
 */
export async function listedStores(locale: SiteLocale): Promise<readonly AreaGroup[]> {
  'use cache'
  cacheLife('minutes')
  const payload = await cms()
  const { docs } = await payload.find({
    collection: 'stores',
    overrideAccess: false,
    where: { and: [{ active: { equals: true } }, { listed: { equals: true } }] },
    select: { name: true, area: true, address: true, hours: true },
    sort: ['area', 'name'],
    locale,
    depth: 0,
    limit: STORE_LIMIT,
    pagination: false,
  })
  return groupByArea(docs)
}
