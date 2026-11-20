/**
 * The stores page's pure shaping (13.2): a raw, projected store doc into a view model, the stores
 * grouped by area, and the map link. Nothing here reads a database or a coordinate — the link is
 * made from the store's name and address alone.
 */

/** A store as the page shows it: the public fields and the map link, nothing else. */
export type StoreVM = {
  readonly name: string
  readonly address: string | null
  readonly hours: string | null
  readonly mapUrl: string
}

/**
 * The stores page's sections (TASKS.md 28.2; the owner's feedback of 2026-11-19, F4): the flagships
 * first, then the four regions in the owner's order, then every other store. A store names its
 * region in the admin (`region`); one with none, or `other`, is under Other.
 */
export const STORE_REGION_ORDER = ['lombok', 'ubud', 'amed', 'canggu'] as const
export type StoreRegionKey = (typeof STORE_REGION_ORDER)[number] | 'other'

export type RegionGroup = {
  readonly region: StoreRegionKey
  readonly stores: readonly (StoreVM & { readonly area: string | null })[]
}

export type StoreDirectoryData = {
  readonly flagships: readonly (StoreVM & { readonly area: string | null })[]
  readonly regions: readonly RegionGroup[]
  readonly total: number
}

const regionOf = (value: unknown): StoreRegionKey =>
  (STORE_REGION_ORDER as readonly unknown[]).includes(value) ? (value as StoreRegionKey) : 'other'

/** Flagships first (by name), then each region with a store, by name, Other last. */
export function groupByRegion(docs: readonly unknown[]): StoreDirectoryData {
  const flagships: (StoreVM & { area: string | null })[] = []
  const byRegion = new Map<StoreRegionKey, (StoreVM & { area: string | null })[]>()
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
    byRegion.set(region, [...(byRegion.get(region) ?? []), store])
  }
  const byName = (a: StoreVM, b: StoreVM) => compare(a.name, b.name)
  return {
    flagships: flagships.sort(byName),
    regions: [...STORE_REGION_ORDER, 'other' as const].flatMap((region) => {
      const stores = byRegion.get(region)
      return stores ? [{ region, stores: stores.sort(byName) }] : []
    }),
    total,
  }
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

/** A Google Maps search for the store, from its name and address only — never coordinates. */
export function mapUrl(name: string, address: string | null): string {
  const query = address === null ? name : `${name}, ${address}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** Shapes one doc defensively; a doc with no name is dropped. Reads the four public fields only. */
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
    mapUrl: mapUrl(name, address),
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
