/**
 * The checkout's delivery and review steps (COMMERCE.md §3; the plan's K2, TASKS.md 27.3): once the
 * pin exists, the store the order will use and the delivery fee from its distance, so the total the
 * buyer sees before paying includes delivery. Past the last band (or with no table to trust) there
 * is no fee yet: the review says staff will confirm it, and shows the items total. The same
 * preparation, the same `pickStore` and the same `quoteBag` as `createOrder` (`./start` decides
 * the same way), read outside any transaction, taking no stock; nothing is written. The figures
 * returned are the ones the review shows and the pay button echoes back as `expectedTotalIdr` —
 * which `createOrder` only compares, never reads as a price.
 *
 * What leaves the server: the priced quote (prices, discount, total — no fee) and the sending
 * store's name and area (the review shows "the sending area"; COMMERCE.md §3) — never its code,
 * its stock, or which other stores hold what.
 */
import type { Payload } from 'payload'

import type { BagCookieKey } from '../pricing/bag'
import type { DiscountContact } from '../pricing/discount'
import { quoteBag, type Quote } from '../pricing/quote'
import { orderStartFor } from './start'
import type { PickRefusal } from './assign'
import { isInIndonesia, isValidPin, type Pin } from './geo'
import { pickStore } from './pick-store'
import { prepareBag, type PrepareRefusal } from './prepare'

export type QuoteCheckoutRequest = {
  readonly bagCookie: string | null | undefined
  /** The map pin, as validated decimal degrees (`validateCheckoutDetails` makes one from a form). */
  readonly pin: Pin
  readonly welcomeCode?: string | null
  /** Step 1's contact when known, so a once-per-buyer code is checked as `createOrder` will. */
  readonly contact?: DiscountContact | null
}

/** The delivery line the review shows: a fee from the bands, or a staff quote to come. */
export type CheckoutDelivery =
  | { readonly kind: 'priced'; readonly feeIdr: number; readonly isFree: boolean }
  | { readonly kind: 'staff_quote' }

export type CheckoutQuote = {
  readonly ok: true
  /**
   * 6.2's quote at the picked store's distance: `totalIdr` is what the order will be created with
   * (`expectedTotalIdr`). Past the last band `refusal` is `beyond_reach` (or `no_delivery_table`)
   * and `totalIdr` the items total — read `delivery`, never `refusal`, for what to show.
   */
  readonly quote: Quote
  readonly delivery: CheckoutDelivery
  readonly sendingStore: { readonly name: string; readonly area: string | null }
  readonly distanceKm: number
}

export type CheckoutQuoteResult =
  | CheckoutQuote
  | PrepareRefusal
  | PickRefusal
  /** Never returned: past the last band is a staff quote (`delivery.kind`), not a refusal (kept so
   * a caller narrowing on this union still typechecks). */
  | { readonly ok: false; readonly refusal: 'outside_reach' | 'no_delivery_table' }

export async function quoteCheckout(
  payload: Payload,
  request: QuoteCheckoutRequest,
  options: { readonly bagKey: BagCookieKey; readonly now?: Date },
): Promise<CheckoutQuoteResult> {
  const { pin } = request
  if (!isValidPin(pin)) return { ok: false, refusal: 'invalid_pin' }
  if (!isInIndonesia(pin.lat, pin.lng)) return { ok: false, refusal: 'outside_indonesia' }
  const prepared = await prepareBag(payload, {
    bagCookie: request.bagCookie,
    bagKey: options.bagKey,
    welcomeCode: request.welcomeCode,
    contact: request.contact ?? null,
    now: options.now ?? new Date(),
  })
  if (!prepared.ok) return prepared

  const pick = await pickStore(payload, { lines: prepared.lines, pin })
  if (!pick.ok) return pick
  const quote = quoteBag(prepared.lines, prepared.catalogue, prepared.settings, {
    distanceKm: pick.distanceKm,
    discount: prepared.discount,
  })
  // Throws on a quote that cannot be an order, exactly as `createOrder` would.
  const start = orderStartFor(quote, prepared.orderSettings)
  const delivery: CheckoutDelivery =
    start.status === 'pending_payment'
      ? { kind: 'priced', feeIdr: start.totals.deliveryIdr!, isFree: quote.isFreeDelivery }
      : { kind: 'staff_quote' }
  return {
    ok: true,
    quote,
    delivery,
    sendingStore: { name: pick.store.name, area: pick.store.area },
    distanceKm: pick.distanceKm,
  }
}
