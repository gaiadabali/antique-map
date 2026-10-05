/**
 * The order page's read (TASKS.md 6.5.a; COMMERCE.md §8, §10; SECURITY.md T1–T2): a buyer's own
 * order, by its number and the tracking token the checkout redirect carried — never by number
 * alone. A wrong number and a wrong token answer the same `null`, compared in constant time so
 * neither can be found a byte at a time by timing the response.
 *
 * A narrow SQL `SELECT` of only the columns the page shows (never the pin, the buyer's full
 * contact, staff notes or the token hash itself) through the CMS's own pool (`@engine/cms/instance`
 * `cmsPool`) — Payload's Local API has no access rule for "the caller holds this order's token", so
 * this is the `or a narrow SQL SELECT` the ticket allows. The page-facing `current*` wrappers below
 * call `connection()` first (uncached: a payment status decides what the buyer may do next); the
 * `payload`-taking functions above them stay free of request-scope APIs so `*.db.test.ts` can call
 * them directly.
 */
import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'

import { connection } from 'next/server'

import { cms, cmsPool, type Payload } from '@engine/cms/instance'

export type OrderLineView = {
  readonly name: string
  readonly variantLabel: string | null
  readonly qty: number
  readonly lineTotalIdr: number
}

export type OrderTotalsView = {
  readonly subtotalIdr: number
  readonly discountIdr: number
  readonly deliveryIdr: number
  readonly totalIdr: number
}

/** The latest payment attempt's Midtrans state (`opening`, `open`, `pending`, `settlement`, …). */
export type AttemptView = { readonly state: string } | null

export type OrderView = {
  readonly number: number
  readonly status:
    | 'pending_payment'
    | 'paid'
    | 'processing'
    | 'waiting_driver'
    | 'on_the_way'
    | 'delivered'
    | 'cancelled'
    | 'expired'
  readonly expiresAt: Date
  readonly locale: 'en' | 'id'
  readonly storeArea: string | null
  readonly lines: readonly OrderLineView[]
  readonly totals: OrderTotalsView
  readonly attempt: AttemptView
  /**
   * Set only for an `expired` order a payment later reached (`decide.ts`'s `late-payment`): the
   * page's own "we'll contact you on WhatsApp today" text, never the staff-facing flag's wording.
   */
  readonly needsAttention: { readonly reason: 'late_payment' } | null
}

/** `orders.tracking_token_hash`'s own hash, mirrored exactly (`shop/orders`' `trackingTokenHash`). */
function tokenHash(token: string): Buffer {
  return createHash('sha256').update(token, 'utf8').digest()
}

function wholeOf(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isSafeInteger(n) ? n : 0
}

const ORDER_SELECT = `
  SELECT id, number, status::text AS status, expires_at, tracking_token_hash, contact_locale,
         store_snapshot_area, totals_subtotal, totals_discount, totals_delivery_fee, totals_total,
         needs_attention_flag
    FROM orders WHERE number = $1`

const LINES_SELECT = `
  SELECT name, variant_label, qty, line_total FROM orders_lines
   WHERE _parent_id = $1 ORDER BY _order`

const LATEST_ATTEMPT_SELECT = `
  SELECT state FROM orders_payment_attempts
   WHERE _parent_id = $1 ORDER BY _order DESC LIMIT 1`

const BAG_LINES_SELECT = `
  SELECT product_id, variant_sku, qty FROM orders_lines
   WHERE _parent_id = $1 ORDER BY _order`

function parsedNumber(number: string | number): number | null {
  const n = typeof number === 'number' ? number : Number(number)
  return Number.isSafeInteger(n) && n >= 1 ? n : null
}

/** The order `number`'s id, when `token` is its own — checked in constant time — else `null`. */
async function verifiedOrderId(
  client: { query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }> },
  n: number,
  token: string,
): Promise<number | null> {
  const { rows } = await client.query(
    'SELECT id, tracking_token_hash FROM orders WHERE number = $1',
    [n],
  )
  const order = rows[0]
  const stored = order?.tracking_token_hash
  if (typeof stored !== 'string') return null
  const expected = Buffer.from(stored, 'hex')
  const given = tokenHash(token)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  return wholeOf(order!.id)
}

/** A buyer's own order view, or `null` for a wrong number, a wrong token, or neither given. */
export async function loadOrderForBuyer(
  payload: Payload,
  number: string | number,
  token: string | null | undefined,
): Promise<OrderView | null> {
  const n = parsedNumber(number)
  if (n === null) return null
  if (typeof token !== 'string' || token.length === 0) return null

  const pool = cmsPool(payload)
  const client = await pool.connect()
  try {
    const { rows } = await client.query(ORDER_SELECT, [n])
    const order = rows[0] as Record<string, unknown> | undefined
    if (!order) return null

    const stored = order.tracking_token_hash
    if (typeof stored !== 'string') return null
    const expected = Buffer.from(stored, 'hex')
    const given = tokenHash(token)
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

    const [{ rows: lineRows }, { rows: attemptRows }] = await Promise.all([
      client.query(LINES_SELECT, [order.id]),
      client.query(LATEST_ATTEMPT_SELECT, [order.id]),
    ])

    const status = String(order.status) as OrderView['status']
    const flagged = order.needs_attention_flag === true
    const attemptState = attemptRows[0]?.state
    return {
      number: wholeOf(order.number),
      status,
      expiresAt: new Date(String(order.expires_at)),
      locale: order.contact_locale === 'id' ? 'id' : 'en',
      storeArea: typeof order.store_snapshot_area === 'string' ? order.store_snapshot_area : null,
      lines: (lineRows as Record<string, unknown>[]).map((line) => ({
        name: String(line.name ?? ''),
        variantLabel: typeof line.variant_label === 'string' ? line.variant_label : null,
        qty: wholeOf(line.qty),
        lineTotalIdr: wholeOf(line.line_total),
      })),
      totals: {
        subtotalIdr: wholeOf(order.totals_subtotal),
        discountIdr: wholeOf(order.totals_discount),
        deliveryIdr: wholeOf(order.totals_delivery_fee),
        totalIdr: wholeOf(order.totals_total),
      },
      attempt: typeof attemptState === 'string' ? { state: attemptState } : null,
      needsAttention: status === 'expired' && flagged ? { reason: 'late_payment' } : null,
    }
  } finally {
    client.release()
  }
}

/**
 * The order's own database id, once `token` is checked against `number` — what the pay action
 * passes to `openPaymentAttempt` (which never takes the public order number). `null` for a wrong
 * number or token.
 */
export async function orderIdForBuyer(
  payload: Payload,
  number: string | number,
  token: string | null | undefined,
): Promise<number | null> {
  const n = parsedNumber(number)
  if (n === null) return null
  if (typeof token !== 'string' || token.length === 0) return null
  const pool = cmsPool(payload)
  const client = await pool.connect()
  try {
    return await verifiedOrderId(client, n, token)
  } finally {
    client.release()
  }
}

/**
 * "Put these back in my bag" (EXPERIENCE-SHOP.md §8): the order's lines as bag lines — product,
 * variant and quantity only, never a price — once `token` is checked against `number` exactly as
 * `loadOrderForBuyer` does. `null` for a wrong number or token.
 */
export async function loadOrderLinesForBag(
  payload: Payload,
  number: string | number,
  token: string | null | undefined,
): Promise<ReadonlyArray<{ productId: number; variantSku: string | null; qty: number }> | null> {
  const n = parsedNumber(number)
  if (n === null) return null
  if (typeof token !== 'string' || token.length === 0) return null

  const pool = cmsPool(payload)
  const client = await pool.connect()
  try {
    const orderId = await verifiedOrderId(client, n, token)
    if (orderId === null) return null
    const { rows } = await client.query(BAG_LINES_SELECT, [orderId])
    return (rows as Record<string, unknown>[]).map((row) => ({
      productId: wholeOf(row.product_id),
      variantSku: typeof row.variant_sku === 'string' ? row.variant_sku : null,
      qty: wholeOf(row.qty),
    }))
  } finally {
    client.release()
  }
}

/**
 * The order page's read, on the process's one Payload (`cms()`): see `loadOrderForBuyer`.
 * Uncached — `connection()` first — since a payment status decides what the buyer may do next.
 */
export async function currentOrderView(
  number: string | number,
  token: string | null | undefined,
): Promise<OrderView | null> {
  await connection()
  return loadOrderForBuyer(await cms(), number, token)
}

/**
 * The pay action's and the simulate page's read of an order's own id: see `orderIdForBuyer`.
 * Uncached — `connection()` first — the simulate page's `notFound()` turns on this read.
 */
export async function currentOrderId(
  number: string | number,
  token: string | null | undefined,
): Promise<number | null> {
  await connection()
  return orderIdForBuyer(await cms(), number, token)
}

/** "Put these back in my bag"'s read of an order's lines: see `loadOrderLinesForBag`. */
export async function currentBagLines(
  number: string | number,
  token: string | null | undefined,
): Promise<ReadonlyArray<{ productId: number; variantSku: string | null; qty: number }> | null> {
  return loadOrderLinesForBag(await cms(), number, token)
}
