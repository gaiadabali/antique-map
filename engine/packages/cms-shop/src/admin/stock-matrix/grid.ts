/**
 * The stock matrix's rows and filters (TASKS.md 27.4.b; the plan's §3.8), pure so the view and its
 * tests share them:
 *
 * - **A line** is what a store counts: a product without variants, or one variant of a product. A
 *   search that names a variant's SKU shows that variant's line alone, not its siblings.
 * - **Low** (the plan's K8): an existing stock row at or below the one global threshold
 *   (`site-settings.shop.lowStockThreshold`, default 2). A store that never stocked the line is
 *   not low — it is not stocked.
 * - **The address** of a filtered page: the search, the store, the low filter and the page, as the
 *   view's own GET form writes them.
 *
 * The counts themselves go through `stock-levels` as the person (`../products/stock-grid`
 * `stockRequest`): this file never decides who may write.
 */
import type { Id } from '../products/stock-grid'

export const PAGE_SIZE = 25
/** Store columns a page shows when every store is: a hundred columns of boxes is no screen. */
export const STORES_PER_PAGE = 10

export type MatrixProduct = {
  readonly id: Id
  readonly name: string
  readonly sku: string
  readonly variants: ReadonlyArray<{ readonly sku: string; readonly label: string }>
}

export type MatrixLine = {
  readonly key: string
  readonly product: Id
  readonly name: string
  /** The line's SKU: the variant's, or the product's own. */
  readonly sku: string
  /** The variant this line counts, or null for a product without variants. */
  readonly variantSku: string | null
  readonly variantLabel: string | null
}

export type MatrixRow = {
  readonly id: Id
  readonly store: Id
  readonly product: Id
  readonly variantSku: string | null
  readonly quantity: number
}

export type MatrixQuery = {
  readonly q: string
  readonly page: number
  readonly low: boolean
  readonly store: string
  /** The page of store columns, when every store is shown. */
  readonly cols: number
}

/** Where a row (or an empty cell) sits: the line and the store. */
export const matrixKey = (product: Id, variantSku: string | null, store: Id): string =>
  `${String(product)}|${variantSku ?? ''}|${String(store)}`

const lineKey = (product: Id, variantSku: string | null) => `${String(product)}|${variantSku ?? ''}`

/** The search as typed: trimmed, at most 100 characters (the view's input caps it too). */
export const cleanQuery = (value: string): string => value.trim().slice(0, 100)

const contains = (text: string, q: string) => text.toLowerCase().includes(q.toLowerCase())

/** The lines of a page of products, in the products' order and each product's variant order. */
export function linesOf(products: readonly MatrixProduct[], query: string): MatrixLine[] {
  const q = cleanQuery(query)
  const lines: MatrixLine[] = []
  for (const product of products) {
    const variants = product.variants.filter((variant) => variant.sku !== '')
    if (variants.length === 0) {
      lines.push({
        key: lineKey(product.id, null),
        product: product.id,
        name: product.name,
        sku: product.sku,
        variantSku: null,
        variantLabel: null,
      })
      continue
    }
    const byProduct = q === '' || contains(product.name, q) || contains(product.sku, q)
    const named = byProduct ? variants : variants.filter((variant) => contains(variant.sku, q))
    for (const variant of named.length > 0 ? named : variants) {
      lines.push({
        key: lineKey(product.id, variant.sku),
        product: product.id,
        name: product.name,
        sku: variant.sku,
        variantSku: variant.sku,
        variantLabel: variant.label || variant.sku,
      })
    }
  }
  return lines
}

/** A stock row's quantity is low: at or below the threshold. */
export const isLow = (quantity: number, threshold: number): boolean => quantity <= threshold

/** The lines with a row at or below the threshold in one of the shown stores. */
export function lowLines(
  lines: readonly MatrixLine[],
  rows: readonly MatrixRow[],
  threshold: number,
): MatrixLine[] {
  const low = new Set(
    rows
      .filter((row) => isLow(row.quantity, threshold))
      .map((row) => lineKey(row.product, row.variantSku)),
  )
  return lines.filter((line) => low.has(line.key))
}

/** The query from the address: an unreadable page is the first, an unknown flag is off. */
export function readQuery(params: Record<string, string | string[] | undefined>): MatrixQuery {
  const one = (value: string | string[] | undefined) =>
    Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
  const whole = (value: string) => {
    const n = Number(value)
    return Number.isSafeInteger(n) && n > 0 ? n : 1
  }
  return {
    q: cleanQuery(one(params.q)),
    page: whole(one(params.page)),
    low: one(params.low) === '1',
    store: one(params.store).trim().slice(0, 20),
    cols: whole(one(params.cols)),
  }
}

/** One page of store columns: the slice shown, and how many pages there are. */
export function storeColumns<T>(stores: readonly T[], cols: number): { shown: T[]; pages: number } {
  const pages = Math.max(1, Math.ceil(stores.length / STORES_PER_PAGE))
  const page = Math.min(Math.max(cols, 1), pages)
  return { shown: stores.slice((page - 1) * STORES_PER_PAGE, page * STORES_PER_PAGE), pages }
}

/** The view's address for `query` with `change` applied; a filter change starts at page 1. */
export function matrixHref(query: MatrixQuery, change: Partial<MatrixQuery> = {}): string {
  const next = { ...query, ...(change.page === undefined ? { page: 1 } : {}), ...change }
  const pairs: Array<[string, string]> = []
  if (next.q) pairs.push(['q', next.q])
  if (next.store) pairs.push(['store', next.store])
  if (next.low) pairs.push(['low', '1'])
  if (next.page > 1) pairs.push(['page', String(next.page)])
  if (next.cols > 1 && !next.store) pairs.push(['cols', String(next.cols)])
  const qs = pairs.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
  return qs ? `/admin/stock?${qs}` : '/admin/stock'
}
