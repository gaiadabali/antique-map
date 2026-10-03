/**
 * The small interface every payment provider meets (TASKS.md 6.4.a): Midtrans Snap
 * (`./snap`) and the simulator (`./simulator`), chosen by `createPaymentProvider(config)`. The
 * order code never talks to Midtrans directly.
 *
 * - `createPayment` opens one Snap transaction — an **attempt** — for an order's priced lines and
 *   answers the Snap token and redirect URL.
 * - `getStatus` asks the provider what it holds for one attempt's `order_id` (`{number}-{n}`):
 *   the webhook confirms every notification through it, and the reconcile and sweep jobs ask it
 *   before they decide (COMMERCE.md §6; SECURITY.md W2, W6).
 *
 * `paymentItems` turns an order's stored amounts into Midtrans's `item_details`: the lines, the
 * discount as one negative item and the delivery fee as one item, summing to `gross_amount`
 * exactly (Midtrans refuses a mismatch; COMMERCE.md §2). It never prices anything: it reads the
 * order's own figures and refuses ones that do not add up.
 */
import type { MidtransMode } from './config'
import type { MidtransStatus } from './notification'

/** One Midtrans `item_details` entry: whole rupiah, a name of at most 50 characters. */
export type PaymentItem = {
  readonly id: string
  readonly name: string
  readonly price: number
  readonly quantity: number
}

export type PaymentRequest = {
  /** The attempt's Midtrans `order_id`, `{order number}-{attempt}`. */
  readonly midtransOrderId: string
  /** The order's priced total in whole rupiah: what the buyer pays. */
  readonly grossAmount: number
  readonly items: readonly PaymentItem[]
  readonly customer: { readonly name: string; readonly email: string; readonly phone: string }
  /** The order's payment window: the attempt stops taking money then (COMMERCE.md §6). */
  readonly expiresAt: Date
  readonly now: Date
  /** Where Snap sends the buyer back (the tracking page, which trusts no query string). */
  readonly finishUrl?: string
}

export type CreatedPayment = { readonly token: string; readonly redirectUrl: string }

export type StatusAnswer =
  | { readonly found: true; readonly status: MidtransStatus; readonly raw: string }
  | { readonly found: false }

export interface PaymentProvider {
  readonly mode: MidtransMode
  createPayment(request: PaymentRequest): Promise<CreatedPayment>
  getStatus(midtransOrderId: string): Promise<StatusAnswer>
  /** The pay page for an attempt's existing token, to reopen it rather than open another. */
  redirectUrlFor(token: string, midtransOrderId: string): string
}

/** Midtrans's limit on an item's id and name. */
export const ITEM_TEXT_MAX = 50

const cut = (value: string) => [...value].slice(0, ITEM_TEXT_MAX).join('')

export type PricedOrder = {
  readonly lines: ReadonlyArray<{
    readonly sku: string
    readonly name: string
    readonly variantLabel: string | null
    readonly unitPrice: number
    readonly qty: number
  }>
  readonly totals: {
    readonly subtotal: number
    readonly discount: number
    readonly deliveryFee: number
    readonly total: number
  }
}

/** The order's stored figures as Midtrans items; throws when they do not sum to the total. */
export function paymentItems(order: PricedOrder): PaymentItem[] {
  const items: PaymentItem[] = order.lines.map((line) => ({
    id: cut(line.sku),
    name: cut(line.variantLabel ? `${line.name} — ${line.variantLabel}` : line.name),
    price: line.unitPrice,
    quantity: line.qty,
  }))
  if (order.totals.discount > 0) {
    items.push({ id: 'DISCOUNT', name: 'Discount', price: -order.totals.discount, quantity: 1 })
  }
  if (order.totals.deliveryFee > 0) {
    items.push({ id: 'DELIVERY', name: 'Delivery', price: order.totals.deliveryFee, quantity: 1 })
  }
  for (const item of items) {
    if (
      !Number.isSafeInteger(item.price) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1
    ) {
      throw new RangeError(`payments: item ${item.id} is not whole rupiah × a whole quantity`)
    }
  }
  const sum = items.reduce((total, item) => total + item.price * item.quantity, 0)
  if (sum !== order.totals.total) {
    throw new RangeError(
      `payments: the items sum to ${sum}, not the order total ${order.totals.total}`,
    )
  }
  return items
}
