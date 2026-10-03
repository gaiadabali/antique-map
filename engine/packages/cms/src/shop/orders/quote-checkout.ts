/**
 * The checkout's delivery and review steps (COMMERCE.md §3): "the delivery step shows the fee from
 * the same assignment the order will use, without taking stock". The same preparation and the same
 * `pickStore` as `createOrder`, read outside any transaction; nothing is written. The figures
 * returned are the ones the review page shows and the pay button echoes back as
 * `expectedTotalIdr`.
 *
 * What leaves the server: the priced quote (prices, fee, discount, total) and the sending store's
 * name and area (the review shows "the sending area"; COMMERCE.md §3) — never its code, its stock,
 * or which other stores hold what.
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
  /** 6.2's quote with the delivery fee from the assigned store: `refusal` is never set here. */
  readonly quote: Quote
  readonly sendingStore: { readonly name: string; readonly area: string | null }
  readonly distanceKm: number
}

export type CheckoutQuoteResult = CheckoutQuote | PrepareRefusal | PickRefusal

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

  const { bands } = prepared.settings.delivery
  const pick = await pickStore(payload, { lines: prepared.lines, pin, bands })
  if (!pick.ok) return pick
  const quote = quoteBag(prepared.lines, prepared.catalogue, prepared.settings, {
    distanceKm: pick.distanceKm,
    discount: prepared.discount,
  })
  if (quote.refusal === 'beyond_reach') return { ok: false, refusal: 'outside_reach' }
  if (quote.refusal === 'no_delivery_table') return { ok: false, refusal: 'no_delivery_table' }
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
