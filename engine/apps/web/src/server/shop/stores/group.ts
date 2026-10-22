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
