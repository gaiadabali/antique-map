/**
 * Opening (or reopening) the payment of an order — what the pay step (TASKS.md 6.5) calls when the
 * buyer taps *Pay* (COMMERCE.md §6, §10). It never prices anything: the amounts sent are the
 * order's stored lines and totals, checked to sum exactly (`paymentItems`).
 *
 * - **Reopen before opening.** The newest attempt still `open` or `pending` (a VA number issued,
 *   say) is reopened with its own token, so a buyer who comes back does not start a second
 *   transaction that could also be paid (COMMERCE.md §13 "two attempts both settle").
 * - **A new attempt** gets the next number, `{order number}-{n}`, written under the order's lock
 *   in a short transaction **before** Snap is called — so two taps cannot claim one `order_id`, and
 *   no transaction is held open across the network call. Snap's answer is then stored in a second
 *   transaction (`state: open`, the token — never in any API response, `NEVER_EXPOSED`); a Snap
 *   failure marks the attempt `failed` and rethrows.
 * - **Refused** (a value, not a throw): no such order, an order not `pending_payment`, or less
 *   than a minute of its window left (Snap's expiry is whole minutes, ending at `expiresAt`).
 */
import type { Payload } from 'payload'

import { attemptOrderId } from './notification'
import { DEFAULT_WINDOW_MINUTES, rowId } from './order-sql'
import { paymentItems, type PaymentProvider } from './provider'
import { minutesLeft } from './snap'
import { dateOf, inTransaction, sql, wholeOf, type Tx } from './transaction'

export type OpenedPayment =
  | {
      readonly ok: true
      readonly midtransOrderId: string
      readonly token: string
      readonly redirectUrl: string
      readonly reopened: boolean
    }
  | { readonly ok: false; readonly reason: 'not-found' | 'not-payable' | 'window-closed' }

const REOPENABLE = ['open', 'pending']

async function readOrder(tx: Tx, orderId: number) {
  const [order] = await tx.rows(sql`
    SELECT id, number, status::text AS status, contact_name, contact_email, contact_whatsapp,
           totals_subtotal, totals_discount, totals_delivery_fee, totals_total,
           COALESCE(expires_at, created_at + make_interval(mins => ${DEFAULT_WINDOW_MINUTES})) AS window_end
      FROM orders WHERE id = ${orderId} FOR UPDATE`)
  return order
}

export async function openPaymentAttempt(
  payload: Payload,
  provider: PaymentProvider,
  input: { readonly orderId: number; readonly now?: Date; readonly finishUrl?: string },
): Promise<OpenedPayment> {
  const now = input.now ?? new Date()

  const claim = await inTransaction(payload, async (tx) => {
    const order = await readOrder(tx, input.orderId)
    if (!order) return { ok: false as const, reason: 'not-found' as const }
    if (order.status !== 'pending_payment')
      return { ok: false as const, reason: 'not-payable' as const }
    const expiresAt = dateOf(order.window_end, 'the payment window')
    if (minutesLeft(now, expiresAt) < 1)
      return { ok: false as const, reason: 'window-closed' as const }

    const attempts = await tx.rows(sql`
      SELECT id, midtrans_order_id, snap_token, state FROM orders_payment_attempts
       WHERE _parent_id = ${input.orderId} ORDER BY _order DESC`)
    const [latest] = attempts
    if (
      latest &&
      typeof latest.snap_token === 'string' &&
      REOPENABLE.includes(String(latest.state))
    ) {
      return {
        ok: true as const,
        kind: 'reopen' as const,
        id: String(latest.midtrans_order_id),
        token: latest.snap_token,
      }
    }
    const lines = await tx.rows(sql`
      SELECT sku, name, variant_label, unit_price, qty FROM orders_lines
       WHERE _parent_id = ${input.orderId} ORDER BY _order`)
    const number = wholeOf(order.number, 'orders.number')
    const midtransOrderId = attemptOrderId(number, attempts.length + 1)
    const attemptRow = rowId()
    await tx.rows(sql`
      INSERT INTO orders_payment_attempts (_order, _parent_id, id, midtrans_order_id, created_at, state)
      VALUES (${attempts.length + 1}, ${input.orderId}, ${attemptRow}, ${midtransOrderId}, ${now}, 'opening')`)
    const total = wholeOf(order.totals_total, 'orders.totals_total')
    const items = paymentItems({
      lines: lines.map((line) => ({
        sku: String(line.sku),
        name: String(line.name),
        variantLabel: typeof line.variant_label === 'string' ? line.variant_label : null,
        unitPrice: wholeOf(line.unit_price, 'orders_lines.unit_price'),
        qty: wholeOf(line.qty, 'orders_lines.qty'),
      })),
      totals: {
        subtotal: wholeOf(order.totals_subtotal, 'orders.totals_subtotal'),
        discount: wholeOf(order.totals_discount, 'orders.totals_discount'),
        deliveryFee: wholeOf(order.totals_delivery_fee, 'orders.totals_delivery_fee'),
        total,
      },
    })
    const request = {
      midtransOrderId,
      grossAmount: total,
      items,
      customer: {
        name: String(order.contact_name),
        email: String(order.contact_email),
        phone: String(order.contact_whatsapp),
      },
      expiresAt,
      now,
      ...(input.finishUrl ? { finishUrl: input.finishUrl } : {}),
    }
    return { ok: true as const, kind: 'new' as const, attemptRow, request }
  })

  if (!claim.ok) return claim
  if (claim.kind === 'reopen') {
    const { id, token } = claim
    return {
      ok: true,
      midtransOrderId: id,
      token,
      redirectUrl: provider.redirectUrlFor(token, id),
      reopened: true,
    }
  }

  // A notification that raced ahead of this write keeps the state it set.
  const setAttempt = (state: string, token: string | null) =>
    inTransaction(payload, (tx) =>
      tx.rows(sql`
        UPDATE orders_payment_attempts
           SET snap_token = ${token},
               state = CASE WHEN state = 'opening' THEN ${state}::text ELSE state END
         WHERE id = ${claim.attemptRow}`),
    )
  let created
  try {
    created = await provider.createPayment(claim.request)
  } catch (error) {
    await setAttempt('failed', null)
    throw error
  }
  await setAttempt('open', created.token)
  return {
    ok: true,
    midtransOrderId: claim.request.midtransOrderId,
    token: created.token,
    redirectUrl: created.redirectUrl,
    reopened: false,
  }
}
