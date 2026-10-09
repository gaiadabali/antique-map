/**
 * Test support only — the payments `*.db.test.ts` on the staff stack (`collections/users/
 * staff.test-support`, a pushed database): an unpaid order holding stock, written as the order
 * code (6.3) writes one; the webhook route wired to the stack's Payload exactly as
 * `http/payload-port` wires it to the process's; and readers for what the tests assert.
 */
import type { Payload } from 'payload'

import { makeProduct, tokenHash } from '../../collections/stock-levels/shop.test-support'
import type { StaffStack } from '../../collections/users/staff.test-support'
import { applyPaymentStatus } from './apply'
import { createPaymentProvider } from './create-provider'
import { midtransWebhookRoute } from './http/webhook'
import { LOCAL_ENV } from './payments.test-support'

export const WEBHOOK_ENV = { ...LOCAL_ENV, MIDTRANS_MODE: 'simulate' }
export const UNIT_PRICE = 95000
export const DELIVERY_FEE = 15000

let orderNumber = 500000
let sku = 0

export type HeldOrder = { id: number; number: number; product: number; stock: number }

/**
 * A `pending_payment` order for `qty` units of a fresh product, whose stock row at `store` holds
 * `left` — what remains after the order's decrement took its units.
 */
export async function heldOrder(
  payload: Payload,
  input: {
    store: number
    qty?: number
    left?: number
    expiresInMinutes?: number
    /** An existing product and its stock row at `store` (e.g. one a checkout can buy), instead of a fresh one. */
    product?: { id: number; stock: number }
  },
): Promise<HeldOrder> {
  const qty = input.qty ?? 2
  sku += 1
  const product = input.product?.id ?? (await makeProduct(payload, `OEI-PAY-${sku}`)).id
  const stock =
    input.product === undefined
      ? ((await payload.create({
          collection: 'stock-levels',
          data: { store: input.store, product, quantity: input.left ?? 3 } as never,
        })) as unknown as { id: number })
      : { id: input.product.stock }
  // Past any number a checkout in the same database drew (`nextOrderNumber`: MAX + 1 when the
  // pushed database has no sequence), so the two never collide.
  const highest = await payload.find({ collection: 'orders', sort: '-number', limit: 1, depth: 0 })
  const taken = Number((highest.docs[0] as { number?: unknown } | undefined)?.number ?? 0)
  orderNumber = Math.max(orderNumber, taken) + 1
  const subtotal = UNIT_PRICE * qty
  const order = (await payload.create({
    collection: 'orders',
    data: {
      number: orderNumber,
      lines: [
        {
          product,
          sku: `OEI-PAY-${sku}`,
          name: 'A print',
          unitPrice: UNIT_PRICE,
          qty,
          lineTotal: subtotal,
        },
      ],
      contact: { name: 'Buyer', whatsapp: '+6281234567890', email: 'b@example.test', locale: 'en' },
      delivery: { address: 'Jl. Raya Ubud 1', lat: -8.5, lng: 115.26 },
      store: input.store,
      totals: { subtotal, discount: 0, deliveryFee: DELIVERY_FEE, total: subtotal + DELIVERY_FEE },
      status: 'pending_payment',
      expiresAt: new Date(Date.now() + (input.expiresInMinutes ?? 60) * 60_000).toISOString(),
      trackingTokenHash: tokenHash(),
    } as never,
  })) as unknown as { id: number }
  return { id: order.id, number: orderNumber, product, stock: stock.id }
}

/** The webhook route on the stack's Payload: the real verify → confirm → apply path. */
export function stackWebhook(payload: Payload) {
  const route = midtransWebhookRoute({
    env: WEBHOOK_ENV,
    log: () => {},
    load: async (config) => {
      const provider = createPaymentProvider(config)
      return {
        confirm: (midtransOrderId) => provider.getStatus(midtransOrderId),
        apply: (status, source, payloadHash) =>
          applyPaymentStatus(payload, { status, source, payloadHash }),
      }
    },
  })
  return (body: string) =>
    route(new Request('http://shop.localhost/api/x/webhooks/midtrans', { method: 'POST', body }))
}

/** Readers for the rows the tests assert on (ids are integers, interpolated safely). */
export function readers(stack: StaffStack) {
  const query = async (text: string) => (await stack.pool.query(text)).rows
  return {
    order: async (id: number) =>
      (
        await query(`SELECT status::text AS status, payment_method, payment_transaction_id, payment_paid_at,
                            needs_attention_flag, needs_attention_reason, totals_total
                       FROM orders WHERE id = ${id}`)
      )[0]!,
    events: (id: number) =>
      query(`SELECT outcome, source, transaction_status, gross_amount FROM payment_events
              WHERE order_id = ${id} ORDER BY id`),
    allEvents: async () => Number((await query(`SELECT count(*) AS n FROM payment_events`))[0]!.n),
    history: (id: number) =>
      query(`SELECT "from"::text AS "from", "to"::text AS "to", actor::text AS actor, note
               FROM orders_history WHERE _parent_id = ${id} ORDER BY _order`),
    stock: async (id: number) =>
      Number((await query(`SELECT quantity FROM stock_levels WHERE id = ${id}`))[0]!.quantity),
    attempts: (id: number) =>
      query(`SELECT midtrans_order_id, state, snap_token FROM orders_payment_attempts
              WHERE _parent_id = ${id} ORDER BY _order`),
    /** Moves an order's window (and creation) into the past, as time passing would. */
    age: (id: number, minutes: { expiresAgo?: number; createdAgo?: number }) =>
      query(`UPDATE orders SET
               expires_at = ${minutes.expiresAgo === undefined ? 'expires_at' : `now() - interval '${minutes.expiresAgo} minutes'`},
               created_at = ${minutes.createdAgo === undefined ? 'created_at' : `now() - interval '${minutes.createdAgo} minutes'`}
             WHERE id = ${id}`),
  }
}
