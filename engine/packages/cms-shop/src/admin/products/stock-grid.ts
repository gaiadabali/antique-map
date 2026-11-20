/**
 * The product's stock table, stores × variants (TASKS.md 27.2.d; the plan's §3.2): which stores
 * show, what a cell holds, and the one request a typed count becomes. Pure, so the table and its
 * tests share it.
 *
 * - **A count is the shelf count.** A typed number goes to `stock-levels` as `physicalCount`,
 *   and the server stores it less the units held for open orders (`collections/stock-levels/count`):
 *   the checkout's atomic decrement and release are untouched.
 * - **Through Payload, as the person.** The requests are plain REST calls with the admin's own
 *   cookie, so the collection's access decides: the owner starts a row at any store (`create`);
 *   an editor or store staff only count rows that exist, and store staff only ever see and reach
 *   their own store's (`collections/stock-levels/access`). Nothing here widens that.
 */
export type Id = number | string

export type StockStore = { readonly id: Id; readonly name: string; readonly code: string }

export type StockRow = {
  readonly id: Id
  readonly store: Id
  /** The variant's SKU, or null for a product without variants. */
  readonly variantSku: string | null
  readonly quantity: number
}

/** A column of the table: a variant's SKU and label, or the product itself (`sku: null`). */
export type StockColumn = { readonly sku: string | null; readonly label: string }

/** Where one cell's row is kept: the store and the variant. */
export const cellKey = (store: Id, variantSku: string | null): string =>
  `${String(store)}|${variantSku ?? ''}`

export function indexRows(rows: readonly StockRow[]): Map<string, StockRow> {
  return new Map(rows.map((row) => [cellKey(row.store, row.variantSku), row]))
}

/** The columns: one per saved variant, or one for the product when it has none. */
export function columnsOf(
  variants: readonly { sku?: unknown; label?: unknown }[],
  productLabel: string,
): StockColumn[] {
  const named = variants.filter(
    (variant): variant is { sku: string; label?: unknown } =>
      typeof variant.sku === 'string' && variant.sku !== '',
  )
  if (named.length === 0) return [{ sku: null, label: productLabel }]
  return named.map((variant) => ({
    sku: variant.sku,
    label: typeof variant.label === 'string' && variant.label !== '' ? variant.label : variant.sku,
  }))
}

/** A typed count: a whole number of at least 0, `undefined` for an empty box, `null` if invalid. */
export function parseCount(text: string): number | null | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return undefined
  if (!/^\d+$/.test(trimmed)) return null
  const count = Number(trimmed)
  return Number.isSafeInteger(count) ? count : null
}

/**
 * The stores to list: those matching `query` (name or code), the ones already holding a row for
 * this product first, each group by name; at most `limit` unless `all`.
 */
export function visibleStores(
  stores: readonly StockStore[],
  rows: ReadonlyMap<string, StockRow>,
  query: string,
  options: { limit: number; all: boolean },
): { stores: StockStore[]; total: number } {
  const q = query.trim().toLowerCase()
  const held = new Set([...rows.values()].map((row) => String(row.store)))
  const matching = stores.filter(
    (store) =>
      q === '' || store.name.toLowerCase().includes(q) || store.code.toLowerCase().includes(q),
  )
  const byName = (a: StockStore, b: StockStore) => a.name.localeCompare(b.name)
  const ordered = [
    ...matching.filter((store) => held.has(String(store.id))).sort(byName),
    ...matching.filter((store) => !held.has(String(store.id))).sort(byName),
  ]
  const shown = options.all || q !== '' ? ordered : ordered.slice(0, options.limit)
  return { stores: shown, total: matching.length }
}

export type StockRequest = {
  readonly method: 'PATCH' | 'POST'
  readonly url: string
  readonly body: Record<string, unknown>
}

/**
 * The request a count becomes: the row's own update when it exists, else a new row for the store,
 * product and variant — which only the owner may make (`canStart`).
 */
export function stockRequest(input: {
  readonly row: StockRow | undefined
  readonly store: Id
  readonly product: Id
  readonly variantSku: string | null
  readonly count: number
}): StockRequest {
  if (input.row) {
    return {
      method: 'PATCH',
      url: `/api/stock-levels/${encodeURIComponent(String(input.row.id))}?depth=0`,
      body: { physicalCount: input.count },
    }
  }
  return {
    method: 'POST',
    url: '/api/stock-levels?depth=0',
    body: {
      store: input.store,
      product: input.product,
      ...(input.variantSku === null ? {} : { variantSku: input.variantSku }),
      physicalCount: input.count,
    },
  }
}

/** Whether `role` may start a row at a store that has none: the collection's `create` is the owner's. */
export const canStart = (role: unknown): boolean => role === 'owner'

/** The units the server held back from a count: what was typed less what can still be sold. */
export const heldBack = (typed: number, quantity: number): number => Math.max(typed - quantity, 0)

/** The sum of the shown rows' quantities for one column (or every column). */
export function totalOf(rows: ReadonlyMap<string, StockRow>, variantSku?: string | null): number {
  let total = 0
  for (const row of rows.values()) {
    if (variantSku === undefined || row.variantSku === variantSku) total += row.quantity
  }
  return total
}
