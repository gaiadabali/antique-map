/**
 * The shop's stores page read (13.2; TASKS.md 28.2): every store that is active and listed,
 * projected to name, area, address, hours, and — for the page's sections — whether it is a
 * flagship, its region, its first photograph and its coordinates (Nearby's "nearest to me", the order of 2026-11-25;
 * `./group` rounds them to about a kilometre before they reach a page). A public read of a
 * protected collection — `overrideAccess: false`, so the collection's own access answers with
 * `PUBLIC_STORES`; `select` keeps a store's code, WhatsApp and notes out of the result in the
 * first place.
 */
import 'server-only'

import { cacheLife } from 'next/cache'

import type { SiteLocale } from '@engine/config/sites'
import { cms } from '@engine/cms/instance'
import { PUBLIC_IMAGE_SELECT } from '@engine/site/media/public-image'

import { groupByRegion, type StoreDirectoryData } from './group'

export type {
  AreaGroup,
  NearbyStoreVM,
  Position,
  RegionGroup,
  StoreDirectoryData,
  StoreImage,
  StoreRegionKey,
  StoreVM,
} from './group'

/** A sane ceiling: the shop is stocked in 100+ stores; this leaves room without an unbounded read. */
const STORE_LIMIT = 500

/**
 * Cached for minutes only: there is no stores cache tag, and nothing invalidates one when a store
 * is edited, so a short life is the only way an edit reaches the page.
 */
export async function storeDirectory(locale: SiteLocale): Promise<StoreDirectoryData> {
  'use cache'
  cacheLife('minutes')
  const payload = await cms()
  const { docs } = await payload.find({
    collection: 'stores',
    overrideAccess: false,
    where: { and: [{ active: { equals: true } }, { listed: { equals: true } }] },
    select: {
      name: true,
      area: true,
      address: true,
      hours: true,
      flagship: true,
      region: true,
      lat: true,
      lng: true,
      // Only the media fields the card needs; the first row is the one shown (`./group`).
      images: { image: PUBLIC_IMAGE_SELECT },
    },
    sort: 'name',
    locale,
    // Depth 1 populates the media relation, as a product's images are read.
    depth: 1,
    limit: STORE_LIMIT,
    pagination: false,
  } as never)
  return groupByRegion(docs)
}
