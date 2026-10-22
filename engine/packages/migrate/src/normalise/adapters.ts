/**
 * Source records → `LegacyProductInput`: a field-for-field mapping, raw
 * strings untouched. Two sources today — the public read's
 * `PublicProductRecord` (one JSON file per product) and a row of the
 * database extract (`products.jsonl`, the `products.sql` query's shape) —
 * and the owner's real dump will arrive in the second shape.
 */
import type { PublicProductRecord } from '../sources/public-read/index.ts'
import type { ImageSize } from './image-size.ts'
import type { LegacyProductInput } from './record.ts'
import type { NormaliseTables } from './tables.ts'

export function fromPublicRead(
  record: PublicProductRecord,
  tables: NormaliseTables,
  image: ImageSize | null,
): LegacyProductInput {
  const labels = tables.publicReadLabels
  const field = (label: string) =>
    record.fields.find((entry) => entry.label === label)?.value ?? null
  const stock = field(labels.stockNumber)
  return {
    source: 'public-read',
    legacyId: record.legacyId,
    path: record.path,
    title: field(labels.title) ?? record.cardTitle,
    originalTitle: record.longTitle,
    publication: { combined: field(labels.publication) },
    size: field(labels.dimensions),
    colour: field(labels.colour),
    condition: field(labels.condition),
    price: { text: field(labels.price) },
    stockNumber:
      stock !== null && stock.startsWith(labels.stockNumberPrefix)
        ? stock.slice(labels.stockNumberPrefix.length)
        : stock,
    maker:
      record.maker === null ? null : { legacyId: record.maker.legacyId, name: record.maker.name },
    publisher: null,
    categories: record.categories.map((category) => ({
      legacyId: category.legacyId,
      name: category.name,
    })),
    descriptionHtml: record.descriptionHtml,
    image,
    status: {
      listed: record.availability === 'listed',
      sold: record.availability === 'sold',
      deleted: false,
    },
  }
}

/** A row of the database extract (`fixtures/mock-queries/products.sql`'s JSON object). */
export type CatalogueRow = {
  legacyId: number
  path?: string | null
  sku?: string | null
  title?: string | null
  originalTitle?: string | null
  maker?: { legacyId: number; name: string } | null
  publisher?: string | null
  publicationPlace?: string | null
  year?: string | null
  size?: string | null
  colour?: string | null
  condition?: string | null
  descriptionHtml?: string | null
  price?: string | null
  priceOnRequest?: boolean | null
  listed?: boolean | null
  sold?: boolean | null
  deletedAt?: string | null
  categoryIds?: number[] | null
}

export function fromCatalogueRow(
  row: CatalogueRow,
  image: ImageSize | null = null,
): LegacyProductInput {
  return {
    source: 'catalogue',
    legacyId: row.legacyId,
    path: row.path ?? null,
    title: row.title ?? null,
    originalTitle: row.originalTitle ?? null,
    publication: { year: row.year ?? null, place: row.publicationPlace ?? null },
    size: row.size ?? null,
    colour: row.colour ?? null,
    condition: row.condition ?? null,
    price: { text: row.price ?? null, onRequestFlag: row.priceOnRequest ?? null },
    stockNumber: row.sku ?? null,
    maker: row.maker ? { legacyId: row.maker.legacyId, name: row.maker.name } : null,
    publisher: row.publisher ?? null,
    categories: (row.categoryIds ?? []).map((legacyId) => ({ legacyId, name: null })),
    descriptionHtml: row.descriptionHtml ?? null,
    image,
    status: {
      listed: row.listed === true,
      sold: row.sold === true,
      deleted: row.deletedAt !== null && row.deletedAt !== undefined,
    },
  }
}
