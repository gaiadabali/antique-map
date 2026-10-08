/**
 * The products and stock sheets of the layer (CONTENT-MODEL.md §9), in memory (task 10.6.e): the
 * same columns the owner's sheets use, so the same importer reads them. A product row carries the
 * text, category and price; each variant row names its parent. The pictures are not in the sheet
 * (`image_files` stays empty): `./attach` places them with their own role and provenance.
 */
import { PRODUCT_COLUMNS, STOCK_COLUMNS } from '../../import/kinds'
import { mulberry32 } from '../shop/generate'
import type { CatalogueProduct } from './types'

export type Cells = Record<string, string>

const blank = (columns: readonly string[]): Cells =>
  Object.fromEntries(columns.map((column) => [column, '']))

export function productRows(products: readonly CatalogueProduct[]): Cells[] {
  const rows: Cells[] = []
  for (const product of products) {
    const shared = {
      name_en: product.nameEn,
      name_id: product.nameId,
      category: product.category.en,
    }
    rows.push({
      ...blank(PRODUCT_COLUMNS),
      ...shared,
      sku: product.sku,
      description_en: product.descriptionEn,
      description_id: product.descriptionId,
      price_idr: String(product.priceIdr),
      active: 'yes',
    })
    for (const variant of product.variants) {
      rows.push({
        ...blank(PRODUCT_COLUMNS),
        ...shared,
        sku: variant.sku,
        parent_sku: product.sku,
        variant_label_en: variant.labelEn,
        variant_label_id: variant.labelId,
        price_idr: String(variant.priceIdr),
        active: 'yes',
      })
    }
  }
  return rows
}

/** The fixed seed of this layer's stock: the same run twice writes the same rows. */
export const STOCK_SEED = 20261008
/** The share of the stores a design reaches, and how many variants are nowhere in stock. */
export const STORE_CARRIES_DESIGN = 0.6
export const OUT_EVERYWHERE = 6

const stockRow = (store: string, sku: string, variantSku: string, quantity: number): Cells => ({
  ...blank(STOCK_COLUMNS),
  store_code: store,
  sku,
  variant_sku: variantSku,
  quantity: String(quantity),
})

/**
 * One row per store and variant that holds units (1 to 4 of a mounted print, 1 to 3 of a framed
 * one), plus an explicit zero for the few variants nowhere in stock. A store a design does not
 * reach has no row: no row is no stock, and it keeps the file in step with the importer's size
 * limit (`../../import/csv` MAX_DATA_ROWS).
 */
export function stockRows(
  products: readonly CatalogueProduct[],
  storeCodes: readonly string[],
  seed: number = STOCK_SEED,
): Cells[] {
  const rng = mulberry32(seed)
  const variants = products.flatMap((product) =>
    product.variants.map((variant) => ({ parent: product.sku, variant })),
  )
  const nowhere = new Set<string>()
  while (nowhere.size < Math.min(OUT_EVERYWHERE, variants.length)) {
    nowhere.add(variants[Math.floor(rng() * variants.length)]!.variant.sku)
  }
  const rows: Cells[] = []
  for (const { parent, variant } of variants) {
    const maxUnits = variant.sku.endsWith('-M') ? 4 : 3
    for (const store of storeCodes) {
      const carried = rng() < STORE_CARRIES_DESIGN
      const units = 1 + Math.floor(rng() * maxUnits)
      if (nowhere.has(variant.sku)) {
        rows.push(stockRow(store, parent, variant.sku, 0))
      } else if (carried) {
        rows.push(stockRow(store, parent, variant.sku, units))
      }
    }
  }
  return rows
}

/** RFC 4180 text, CRLF, in the template's column order: what the importer's parser reads. */
export function csvOf(columns: readonly string[], rows: readonly Cells[]): string {
  const quote = (value: string) =>
    /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
  const lines = [columns.join(',')]
  for (const row of rows) lines.push(columns.map((column) => quote(row[column] ?? '')).join(','))
  return `${lines.join('\r\n')}\r\n`
}

/** The stock rows in files the importer takes (10,000 rows each; its limit is 20,000). */
export function stockFiles(rows: readonly Cells[], perFile = 10_000): string[] {
  const files: string[] = []
  for (let start = 0; start < rows.length; start += perFile) {
    files.push(csvOf(STOCK_COLUMNS, rows.slice(start, start + perFile)))
  }
  return files
}
