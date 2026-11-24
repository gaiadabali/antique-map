/**
 * Where a products rail takes its products from (the plan's §3.4; TASKS.md 27.1.c, 27.5.d): the
 * newest of the whole shop, the newest of one category, or products picked by hand in the order
 * dragged.
 *
 * A rail saved before `source` existed has none: it reads as `category` when it names a category
 * and `newest` otherwise — what it showed then (`railSourceOf`). The default is a function so the
 * new column has no database default that would rewrite those rails.
 */
import type { Field, Validate } from 'payload'
import { relationship } from 'payload/shared'

export const RAIL_SOURCES = ['newest', 'category', 'picked'] as const
export type RailSource = (typeof RAIL_SOURCES)[number]

const SOURCE_LABELS: Record<RailSource, { en: string; id: string }> = {
  newest: { en: 'The newest products', id: 'Produk terbaru' },
  category: { en: 'The newest of one category', id: 'Terbaru dari satu kategori' },
  picked: { en: 'Products I pick', id: 'Produk pilihan saya' },
}

type Rail = { source?: unknown; category?: unknown }

/** A rail's source, a rail saved before `source` existed included. */
export function railSourceOf(rail: Rail | null | undefined): RailSource {
  const source = rail?.source
  if ((RAIL_SOURCES as readonly unknown[]).includes(source)) return source as RailSource
  return rail?.category !== null && rail?.category !== undefined ? 'category' : 'newest'
}

const shows = (source: RailSource) => (_data: unknown, sibling: Rail | undefined) =>
  railSourceOf(sibling) === source

const isEmpty = (value: unknown) =>
  value === null || value === undefined || (Array.isArray(value) && value.length === 0)

/** Payload's own check of the relationship, plus: present when the rail's source is `source`. */
function neededFor(source: RailSource, message: string): Validate {
  return (value, args) =>
    (args.siblingData as Rail | undefined)?.source === source && isEmpty(value)
      ? message
      : (relationship as Validate)(value, args)
}

export const railSource: Field[] = [
  {
    name: 'source',
    type: 'select',
    label: { en: 'Products', id: 'Produk' },
    defaultValue: () => 'newest',
    options: RAIL_SOURCES.map((value) => ({ value, label: SOURCE_LABELS[value] })),
    admin: { isClearable: false },
  },
  {
    name: 'category',
    type: 'relationship',
    relationTo: 'categories',
    label: { en: 'Category', id: 'Kategori' },
    validate: neededFor('category', 'Choose the category whose newest products the rail shows.'),
    admin: { condition: shows('category') },
  },
  {
    name: 'products',
    type: 'relationship',
    relationTo: 'products',
    hasMany: true,
    maxRows: 12,
    label: { en: 'Picked products', id: 'Produk pilihan' },
    validate: neededFor('picked', 'Pick at least one product, or choose another source.'),
    admin: {
      condition: shows('picked'),
      isSortable: true,
      description: {
        en: 'Shown in this order; drag to reorder. A product that is not published is left out.',
        id: 'Tampil sesuai urutan ini; seret untuk mengubah urutan. Produk yang tidak terbit tidak ditampilkan.',
      },
    },
  },
]
