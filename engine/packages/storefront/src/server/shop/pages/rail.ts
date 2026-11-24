/**
 * Where a products rail takes its products from (TASKS.md 27.1.c, 27.5.d): the newest of the whole
 * shop, the newest of one category, or the products an editor picked, in the order dragged. The
 * same reading as the CMS's `railSourceOf` (`@engine/cms` `collections/pages/blocks/rail-source`,
 * which the package does not export to the app): a rail saved before `source` existed reads as
 * `category` when it names one and `newest` otherwise — what it showed then. Pure.
 */
import type { Where } from 'payload'

export const RAIL_SOURCES = ['newest', 'category', 'picked'] as const
export type RailSource = (typeof RAIL_SOURCES)[number]

/** A rail's products, as the loader reads them. */
export type RailSelection =
  | { readonly source: 'newest' }
  | { readonly source: 'category'; readonly categoryId: number }
  | { readonly source: 'picked'; readonly productIds: readonly number[] }

type Row = Record<string, unknown>

const idOf = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value)
    ? value
    : typeof value === 'object' && value !== null
      ? idOf((value as Row).id)
      : null

/** A rail's source, a rail saved before `source` existed included. */
export function railSourceOf(rail: { source?: unknown; category?: unknown }): RailSource {
  const source = rail.source
  if ((RAIL_SOURCES as readonly unknown[]).includes(source)) return source as RailSource
  return rail.category !== null && rail.category !== undefined ? 'category' : 'newest'
}

/**
 * A stored rail → what its loader reads. A `category` rail without its category, or a `picked` one
 * with nothing picked, falls back to the newest: never an empty rail from a half-made choice.
 */
export function railSelectionOf(rail: Row): RailSelection {
  switch (railSourceOf(rail)) {
    case 'category': {
      const categoryId = idOf(rail.category)
      return categoryId === null ? { source: 'newest' } : { source: 'category', categoryId }
    }
    case 'picked': {
      const ids = Array.isArray(rail.products) ? rail.products.map(idOf) : []
      const productIds = [...new Set(ids.filter((id): id is number => id !== null))]
      return productIds.length === 0 ? { source: 'newest' } : { source: 'picked', productIds }
    }
    default:
      return { source: 'newest' }
  }
}

/** Rows read for a `picked` rail, put back in the editor's order; ids not found are left out. */
export function inPickedOrder<T extends { readonly id: number | string }>(
  rows: readonly T[],
  productIds: readonly number[],
): T[] {
  const byId = new Map(rows.map((row) => [Number(row.id), row]))
  return productIds.flatMap((id) => {
    const row = byId.get(id)
    return row === undefined ? [] : [row]
  })
}

/** A newest rail's size, and a category rail's. */
const LIMIT = 6
/** A picked rail's most (the CMS's `maxRows`). */
const PICKED_LIMIT = 12

/** What a rail asks the products read for: its filter, order and size (pure, for the tests). */
export function railQuery(selection: RailSelection): {
  readonly where: readonly Where[]
  readonly sort: string
  readonly limit: number
} {
  switch (selection.source) {
    case 'category':
      return {
        where: [{ category: { equals: selection.categoryId } }],
        sort: '-updatedAt',
        limit: LIMIT,
      }
    case 'picked':
      return {
        where: [{ id: { in: [...selection.productIds] } }],
        sort: '-updatedAt',
        limit: Math.min(selection.productIds.length, PICKED_LIMIT),
      }
    default:
      return { where: [], sort: '-updatedAt', limit: LIMIT }
  }
}
