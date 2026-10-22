/**
 * `pickStore` — the nearest active store that holds every line (TASKS.md 6.3.b; COMMERCE.md §4).
 * Reads the active stores' pins and their stock of the bag's products — those columns only — and
 * hands them to the pure rule (`./assign`).
 *
 * Two callers:
 * - the checkout's delivery step, with the `Payload` instance: it shows the fee from the same
 *   assignment the order will use, taking no stock;
 * - `createOrder`, with its transaction (`Tx`), so the pick reads the counts the decrement then
 *   guards. The read takes no lock: the decrement's `quantity >= n` is the guard, and a lost race
 *   is retried on fresh counts.
 *
 * The rows are staff data no visitor reads; nothing leaves here but the chosen store's id, code,
 * name and area, and the lines a refusal names.
 */
import type { Payload } from 'payload'

import type { BagLine } from '../pricing/bag'
import { sql, wholeOf, type Row, type Statement, type Tx } from '../payments/transaction'
import {
  assignStore,
  checkedLines,
  type PickResult,
  type StockRow,
  type StoreCandidate,
} from './assign'
import { isInIndonesia, isValidPin, type Pin } from './geo'

/** Where `pickStore` reads: the process's Payload (no transaction) or an order's transaction. */
export type OrderSource = Payload | Tx

export type PickStoreInput = {
  /** The quote's buyable lines (`buyableLines`): distinct, valid, at least one. */
  readonly lines: readonly BagLine[]
  readonly pin: Pin
}

type Session = Parameters<Payload['db']['execute']>[0]['db']

/** One statement's rows, in the transaction when given one, else on a pool connection. */
export function rowsFrom(source: OrderSource): (statement: Statement) => Promise<Row[]> {
  if ('rows' in source && typeof source.rows === 'function') return (s) => source.rows(s)
  const payload = source as Payload
  const drizzle = (payload.db as unknown as { drizzle: Session }).drizzle
  return async (statement) => {
    const result = (await payload.db.execute({ db: drizzle, sql: statement })) as { rows?: Row[] }
    return result.rows ?? []
  }
}

/** pg returns `numeric` as a string: a coordinate as a finite number. */
function coordinateOf(value: unknown, what: string): number {
  const number = typeof value === 'string' ? Number(value) : value
  if (typeof number !== 'number' || !Number.isFinite(number)) {
    throw new RangeError(`orders: ${what} is not a coordinate: ${String(value)}`)
  }
  return number
}

/** The active stores with a pin (an active store always has one: `stores_active_has_address_and_pin`). */
export async function readActiveStores(
  rows: (s: Statement) => Promise<Row[]>,
): Promise<StoreCandidate[]> {
  const found = await rows(sql`
    SELECT id, code, name, area, lat, lng
      FROM stores
     WHERE active IS TRUE AND lat IS NOT NULL AND lng IS NOT NULL`)
  return found.map((row) => ({
    id: wholeOf(row.id, 'stores.id'),
    code: String(row.code),
    name: String(row.name),
    area: typeof row.area === 'string' ? row.area : null,
    lat: coordinateOf(row.lat, 'stores.lat'),
    lng: coordinateOf(row.lng, 'stores.lng'),
  }))
}

/** The active stores' sellable stock (`quantity > 0`) of `productIds`. */
export async function readStock(
  rows: (s: Statement) => Promise<Row[]>,
  productIds: readonly number[],
): Promise<StockRow[]> {
  const ids = sql.join(
    [...new Set(productIds)].map((id) => sql`${id}`),
    sql`, `,
  )
  const found = await rows(sql`
    SELECT s.store_id, s.product_id, s.variant_sku, s.quantity
      FROM stock_levels s JOIN stores st ON st.id = s.store_id
     WHERE st.active IS TRUE AND s.quantity > 0 AND s.product_id IN (${ids})`)
  return found.map((row) => ({
    storeId: wholeOf(row.store_id, 'stock_levels.store_id'),
    productId: wholeOf(row.product_id, 'stock_levels.product_id'),
    variantSku: typeof row.variant_sku === 'string' ? row.variant_sku : null,
    quantity: wholeOf(row.quantity, 'stock_levels.quantity'),
  }))
}

/**
 * The store that sends `lines` to `pin`, and its distance — or why none can (`PickRefusal`). Never
 * cached: it decides a purchase.
 */
export async function pickStore(source: OrderSource, input: PickStoreInput): Promise<PickResult> {
  const lines = checkedLines(input.lines)
  const { pin } = input
  // A pin refused on its own (`./assign` step 1) needs no read.
  if (!isValidPin(pin) || !isInIndonesia(pin.lat, pin.lng)) {
    return assignStore({ lines, pin, stores: [], stock: [] })
  }
  const rows = rowsFrom(source)
  const stores = await readActiveStores(rows)
  const stock =
    stores.length === 0
      ? []
      : await readStock(
          rows,
          lines.map((line) => line.productId),
        )
  return assignStore({ lines, pin, stores, stock })
}
