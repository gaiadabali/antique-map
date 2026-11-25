/**
 * The stores page's pure shaping (13.2): a raw, projected store doc into a view model, the stores
 * grouped by area, and the map link. Nothing here reads a database. A store's coordinates leave
 * only as Nearby's `position`, rounded to two decimals (about a kilometre). The rounding trims
 * the payload to what sorting by distance needs; it is not a privacy measure, because
 * `/api/stores` already exposes the stores' coordinates to the public by design, and the cards
 * show the owner's one address, not the store's own.
 */
import { imageOf } from '../catalogue/images'
import { OWNER_MAP_URL } from './owner-location'

/** Where a store is, to about a kilometre (`positionOf`). */
export type Position = { readonly lat: number; readonly lng: number }

const coordinate = (value: unknown, max: number): number | null =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max
    ? Math.round(value * 100) / 100
    : null

/** A doc's coordinates rounded to two decimals, or `null` without both. */
export function positionOf(doc: unknown): Position | null {
  if (typeof doc !== 'object' || doc === null) return null
  const record = doc as Record<string, unknown>
  const lat = coordinate(record.lat, 90)
  const lng = coordinate(record.lng, 180)
  return lat === null || lng === null ? null : { lat, lng }
}

/** A store's own photograph: the public derivative, as a product's image is (`imageOf`). */
export type StoreImage = {
  readonly url: string
  readonly alt: string
  readonly width: number | null
  readonly height: number | null
  readonly srcSet?: string
}

/** A store as the page shows it: the public fields and the map link, nothing else. */
export type StoreVM = {
  readonly name: string
  readonly address: string | null
  readonly hours: string | null
  readonly mapUrl: string
  /** Its first uploaded photograph, once published; `null` falls back to the shared photos. */
  readonly image: StoreImage | null
}

/**
 * The stores page's sections (TASKS.md 28.2; the owner's feedback of 2026-11-19, F4, and the
 * order of 2026-11-25): the flagships first, then the four regions in the owner's order with one
 * store each, then every other store as Nearby. A store names its region in the admin (`region`).
 */
export const STORE_REGION_ORDER = ['lombok', 'ubud', 'amed', 'canggu'] as const
export type StoreRegionKey = (typeof STORE_REGION_ORDER)[number]

/** How many stores a region shows (the order of 2026-11-25: one each); the rest are Nearby. */
export const REGION_SHOWS = 1

type Store = StoreVM & { readonly area: string | null }

/**
 * A Nearby store: its rounded position, for the page's "nearest to me", and its region when it is
 * one of a region's stores past the first (a region's "N more stores" link narrows Nearby to them).
 */
export type NearbyStoreVM = Store & {
  readonly position: Position | null
  readonly region: StoreRegionKey | null
}

export type RegionGroup = {
  readonly region: StoreRegionKey
  readonly stores: readonly Store[]
  /** How many of the region's stores are under Nearby instead (past its first). */
  readonly more: number
}

export type StoreDirectoryData = {
  readonly flagships: readonly Store[]
  readonly regions: readonly RegionGroup[]
  /**
   * Every other store — a region's stores past its first, and the stores of no region — by area,
   * as each Nearby card names it, then by name; a store with no area last. The page puts them
   * nearest first instead once the visitor's browser gives a position.
   */
  readonly nearby: readonly NearbyStoreVM[]
  readonly total: number
}

const withoutPosition = (store: NearbyStoreVM): Store => ({
  name: store.name,
  area: store.area,
  address: store.address,
  hours: store.hours,
  mapUrl: store.mapUrl,
  image: store.image,
})

const regionOf = (value: unknown): StoreRegionKey | null =>
  (STORE_REGION_ORDER as readonly unknown[]).includes(value) ? (value as StoreRegionKey) : null

/** Flagships first (by name), then each region with a store (its first by name), then Nearby. */
export function groupByRegion(docs: readonly unknown[]): StoreDirectoryData {
  const flagships: Store[] = []
  const byRegion = new Map<StoreRegionKey, NearbyStoreVM[]>()
  const nearby: NearbyStoreVM[] = []
  let total = 0
  for (const doc of docs) {
    const store = storeFrom(doc)
    if (store === null) continue
    total += 1
    const record = doc as Record<string, unknown>
    if (record.flagship === true) {
      flagships.push(store)
      continue
    }
    const region = regionOf(record.region)
    const placed = { ...store, position: positionOf(doc), region }
    if (region === null) nearby.push(placed)
    else byRegion.set(region, [...(byRegion.get(region) ?? []), placed])
  }
  const byName = (a: StoreVM, b: StoreVM) => compare(a.name, b.name)
  const byArea = (a: Store, b: Store) =>
    a.area === b.area
      ? byName(a, b)
      : a.area === null
        ? 1
        : b.area === null
          ? -1
          : compare(a.area, b.area) || byName(a, b)
  const regions = STORE_REGION_ORDER.flatMap((region) => {
    const stores = (byRegion.get(region) ?? []).sort(byName)
    nearby.push(...stores.slice(REGION_SHOWS))
    // A region's own card needs no position: only Nearby is sorted by distance.
    const shown = stores.slice(0, REGION_SHOWS).map(withoutPosition)
    const more = Math.max(0, stores.length - REGION_SHOWS)
    return shown.length > 0 ? [{ region, stores: shown, more }] : []
  })
  return { flagships: flagships.sort(byName), regions, nearby: nearby.sort(byArea), total }
}

/** One area's section. `area` is `null` for the stores that name none ("Other areas", last). */
export type AreaGroup = {
  readonly area: string | null
  readonly stores: readonly StoreVM[]
}

type ShapedStore = StoreVM & { readonly area: string | null }

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed.slice(0, max)
}

/**
 * A Google Maps search for the store, from its name and address only — never coordinates. Kept
 * for the day each store has its own address; until then every store opens the owner's one
 * (`./owner-location`).
 */
export function mapUrl(name: string, address: string | null): string {
  const query = address === null ? name : `${name}, ${address}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** The store's first image that is published (a derivative exists), without the product's label. */
export function firstImageOf(doc: Record<string, unknown>): StoreImage | null {
  if (!Array.isArray(doc.images)) return null
  for (const row of doc.images as readonly unknown[]) {
    const media =
      typeof row === 'object' && row !== null ? (row as { image?: unknown }).image : null
    const image = imageOf(media)
    if (image !== null) {
      const { url, alt, width, height, srcSet } = image
      return { url, alt, width, height, ...(srcSet !== undefined ? { srcSet } : {}) }
    }
  }
  return null
}

/** Shapes one doc defensively; a doc with no name is dropped. Reads the public fields only. */
export function storeFrom(doc: unknown): ShapedStore | null {
  if (typeof doc !== 'object' || doc === null) return null
  const record = doc as Record<string, unknown>
  const name = text(record.name, 160)
  if (name === null) return null
  const address = text(record.address, 400)
  return {
    name,
    area: text(record.area, 120),
    address,
    hours: text(record.hours, 600),
    mapUrl: OWNER_MAP_URL,
    image: firstImageOf(record),
  }
}

const compare = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base' })

/** Areas alphabetical, stores by name within each, the no-area group last. */
export function groupByArea(docs: readonly unknown[]): readonly AreaGroup[] {
  const byArea = new Map<string | null, StoreVM[]>()
  for (const doc of docs) {
    const store = storeFrom(doc)
    if (store === null) continue
    const { area, ...view } = store
    byArea.set(area, [...(byArea.get(area) ?? []), view])
  }
  return [...byArea.entries()]
    .sort(([a], [b]) => {
      if (a === null) return b === null ? 0 : 1
      if (b === null) return -1
      return compare(a, b)
    })
    .map(([area, stores]) => ({
      area,
      stores: [...stores].sort((a, b) => compare(a.name, b.name)),
    }))
}
