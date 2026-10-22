/**
 * The checkout's delivery and review steps (COMMERCE.md §3): "the review step shows the store the
 * order will use, without taking stock or a delivery estimate" (TASKS.md 6.6: staff price delivery
 * after placement, so checkout itself quotes no fee — `quote.deliveryIdr` is always `null` here).
 * The same preparation and the same `pickStore` as `createOrder`, read outside any transaction;
 * nothing is written. The figures returned are the ones the review page shows and the pay button
 * echoes back as `expectedTotalIdr`.
 *
 * What leaves the server: the priced quote (prices, discount, total — no fee) and the sending
 * store's name and area (the review shows "the sending area"; COMMERCE.md §3) — never its code,
 * its stock, or which other stores hold what.
 */
import type { Payload } from 'payload'

import type { BagCookieKey } from '../pricing/bag'
import type { DiscountContact } from '../pricing/discount'
import { quoteBag, type Quote } from '../pricing/quote'
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

export type CheckoutQuote = {
  readonly ok: true
  /** 6.2's quote at no distance (TASKS.md 6.6): `quote.deliveryIdr` is always `null`, `refusal` is
   * never set here. */
  readonly quote: Quote
  readonly sendingStore: { readonly name: string; readonly area: string | null }
  readonly distanceKm: number
}

export type CheckoutQuoteResult =
  | CheckoutQuote
  | PrepareRefusal
  | PickRefusal
  /** Dead since TASKS.md 6.6 retired the distance-band fee (kept so a caller narrowing on this
   * union still typechecks): `quoteBag` never refuses this way when it is given no distance. */
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
    distanceKm: null,
    discount: prepared.discount,
  })
  if (quote.refusal !== undefined) {
    throw new Error(`orders: the quote of buyable lines failed (${quote.refusal})`)
  }
  return {
    ok: true,
    quote,
    sendingStore: { name: pick.store.name, area: pick.store.area },
    distanceKm: pick.distanceKm,
  }
}
