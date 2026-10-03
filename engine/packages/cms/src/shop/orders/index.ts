/**
 * The shop's orders core (TASKS.md 6.3.b, 6.3.c; COMMERCE.md §3–§4, §8, §10): the nearest store
 * that holds the whole bag, and order creation in one transaction with the atomic stock
 * decrement. The checkout form (6.3.a) and the pay step (6.5) use only what is exported here.
 *
 * The checkout, per request (server side only; the request carries the `cart` cookie, the
 * contact, the address, the pin, the notes and the typed code — never a price):
 *
 *   const bagKey  = bagCookieKeyFromEnv()                         // from ./shop/pricing
 *   // Steps 1–2, on submit: validate the form on the server.
 *   const checked = validateCheckoutDetails({ contact, delivery: { address, notes, lat, lng }, giftNote })
 *   if (!checked.ok) …                                            // name checked.fields
 *   // Steps 2–3, the delivery fee and the review: the same assignment the order will use, no stock taken.
 *   const quoted  = await quoteCheckout(payload, { bagCookie, pin: checked.details.delivery,
 *                                                  welcomeCode, contact: checked.details.contact }, { bagKey })
 *   if (!quoted.ok) …                                             // a refusal (below)
 *   // show quoted.quote (lines, fee, discount, total) and quoted.sendingStore.area
 *   // Pay: the order, in one transaction; then 6.4's openPaymentAttempt(payload, provider, { orderId }).
 *   const created = await createOrder(payload, { bagCookie, details: { contact, delivery, giftNote },
 *                                                welcomeCode, expectedTotalIdr: quoted.quote.totalIdr }, { bagKey })
 *   if (created.ok) → the tracking link with created.trackingToken (shown once, never stored), the
 *                     payment with created.orderId, the time left from created.expiresAt
 *
 * Refusals (`refusal`), each a designed answer, never a stack:
 * - `invalid_details` (+ `fields`) — fix the named fields.
 * - `checkout_disabled` — the owner switched checkout off: offer WhatsApp.
 * - `empty_bag` — nothing to buy.
 * - `invalid_pin`, `outside_indonesia`, `outside_reach` — "we deliver within reach of our stores in
 *   Bali for now", with WhatsApp.
 * - `no_delivery_table` — the owner's fee table is unusable: WhatsApp, and alert staff.
 * - `no_single_store` (+ `missing`) — no split orders (Q4): offer to remove the named lines or to
 *   ask on WhatsApp with the cart attached. Checked before payment, so no stock changes.
 * - `out_of_stock` (+ `lines`) — "X just sold out": a line ran out between review and pay.
 * - `code_refused` (+ `code.messageKey`) — the welcome code no longer applies.
 * - `price_changed` (+ `totals`) — nothing created; show the new figures and ask again.
 *
 * `pickStore` is exported on its own for a pin picker that wants the assignment without a quote.
 */
export {
  assignStore,
  lineKey,
  type AssignInput,
  type LineRef,
  type PickRefusal,
  type PickRefusalReason,
  type PickResult,
  type PickedStore,
  type StockRow,
  type StoreCandidate,
} from './assign'
export {
  NAME_MAX,
  TEXT_MAX,
  normaliseEmail,
  normaliseWhatsApp,
  validateCheckoutDetails,
  type CheckoutContact,
  type CheckoutDetails,
  type CheckoutDetailsCheck,
  type CheckoutDetailsInput,
  type CheckoutField,
} from './checkout-input'
export {
  createOrder,
  type CreateOrderOptions,
  type CreateOrderRequest,
  type CreateOrderResult,
  type CreatedOrder,
  type OrderRefusal,
  type OrderTotals,
} from './create-order'
export {
  distanceTenths,
  haversineKm,
  isInIndonesia,
  isValidPin,
  roundedDistanceKm,
  type Pin,
} from './geo'
export { trackingTokenHash } from './order-sql'
export { pickStore, type OrderSource, type PickStoreInput } from './pick-store'
export { type PrepareRefusal } from './prepare'
export {
  quoteCheckout,
  type CheckoutQuote,
  type CheckoutQuoteResult,
  type QuoteCheckoutRequest,
} from './quote-checkout'
