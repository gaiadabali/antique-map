/**
 * How an order starts (the plan's K2; TASKS.md 27.3; COMMERCE.md §4–§5): ONE delivery model —
 * checkout prices delivery from the owner's distance bands, and a staff quote is the exception.
 *
 * - **Priced** — the store's distance falls inside a band (or the bag is over the free-delivery
 *   threshold, measured after the discount): the order starts `pending_payment`, its total
 *   `subtotal − discount + fee`, and the buyer's payment window (`orderExpiryMinutes`) opens now.
 * - **Quoted by staff** — the distance is past the last band (`beyond_reach`) or the owner's table
 *   cannot be trusted (`no_delivery_table`): the order starts `awaiting_quote` with no fee, its
 *   total `subtotal − discount`, and staff have `quoteWindowMinutes` to price it (TASKS.md 6.6).
 *
 * Pure: the figures are `quoteBag`'s, which rounds once (the percentage discount, half-up, on the
 * subtotal); nothing here rounds, adds or reads a price from anywhere else.
 */
import type { Quote } from '../pricing/quote'

/** Whole rupiah, as stored on the order. */
export type OrderTotals = {
  readonly subtotalIdr: number
  readonly discountIdr: number
  /** `null` while staff have still to quote it (`awaiting_quote`). */
  readonly deliveryIdr: number | null
  /** `subtotalIdr − discountIdr + (deliveryIdr ?? 0)`. */
  readonly totalIdr: number
}

export type OrderStartStatus = 'pending_payment' | 'awaiting_quote'

export type OrderStart = {
  readonly status: OrderStartStatus
  readonly totals: OrderTotals
  /** The window the order's `expiresAt` is set from: the payment window, or the quote window. */
  readonly windowMinutes: number
}

export type OrderWindows = {
  readonly orderExpiryMinutes: number
  readonly quoteWindowMinutes: number
}

/**
 * The order's first status, totals and window from the quote of its buyable lines at the picked
 * store's distance. Throws when the quote cannot be an order at all (an empty or sold-out bag, a
 * line that is not `ok`): the caller only quotes lines it already knows are buyable, so either is
 * a defect, never a buyer's input.
 */
export function orderStartFor(quote: Quote, windows: OrderWindows): OrderStart {
  if (
    quote.refusal === 'empty_bag' ||
    quote.refusal === 'out_of_stock' ||
    quote.lines.some((line) => line.status !== 'ok')
  ) {
    throw new Error(`orders: the quote of buyable lines failed (${quote.refusal ?? 'a line'})`)
  }
  const priced = quote.refusal === undefined && quote.deliveryIdr !== null
  const totals: OrderTotals = {
    subtotalIdr: quote.subtotalIdr,
    discountIdr: quote.discountIdr,
    deliveryIdr: priced ? quote.deliveryIdr : null,
    totalIdr: quote.totalIdr,
  }
  return priced
    ? { status: 'pending_payment', totals, windowMinutes: windows.orderExpiryMinutes }
    : { status: 'awaiting_quote', totals, windowMinutes: windows.quoteWindowMinutes }
}

/** The first history entry's note for each start (`./order-sql` `insertOrder`). */
export const START_NOTES: Record<OrderStartStatus, string> = {
  pending_payment:
    'Order placed on the shop; stock taken; delivery priced from the distance bands; awaiting payment.',
  awaiting_quote: 'Order placed on the shop; stock taken; awaiting a delivery price.',
}
