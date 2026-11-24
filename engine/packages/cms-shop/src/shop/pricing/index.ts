/**
 * The shop's server-side pricing (TASKS.md 6.2): the bag cookie, the quote, the delivery fee and the
 * welcome code. The bag page and checkout use only what is exported here.
 *
 * The flow, per request:
 *   const key   = bagCookieKeyFromEnv()                         // BAG_COOKIE_KEY
 *   const lines = parseBag(cookies.get(BAG_COOKIE_NAME), key)   // [] if absent, forged or bad
 *   const { catalogue, settings, welcome } = await loadPricingInputs(payload, lines)
 *   const code  = await checkWelcomeCode({ enteredCode, welcome, now: new Date(),
 *                                          contact, hasBeenUsedBy: hasBeenUsedByFor(payload) })
 *   const quote = quoteBag(lines, catalogue, settings,
 *                          { distanceKm, discount: code.ok ? code.discount : null })
 */
export {
  BAG_COOKIE_ATTRIBUTES,
  BAG_COOKIE_KEY_ENV,
  BAG_COOKIE_NAME,
  MAX_BAG_COOKIE_LENGTH,
  MAX_BAG_LINES,
  MAX_LINE_QTY,
  bagCookieKeyFromEnv,
  bagLineKey,
  createBagCookieKey,
  parseBag,
  parseBagLine,
  parseBagLines,
  serialiseBag,
  type BagCookieKey,
  type BagLine,
} from './bag'
export { addToBag, removeFromBag, setBagLineQty, type BagEdit } from './bag-edit'
export {
  checkDeliveryTable,
  deliveryFeeFor,
  freeDeliveryRemainingIdr,
  type DeliveryBand,
  type DeliveryFee,
  type DeliveryRefusal,
  type DeliverySettings,
  type DeliveryTableCheck,
} from './delivery'
export {
  DISCOUNT_MESSAGE_KEYS,
  applyDiscount,
  checkWelcomeCode,
  normaliseDiscountCode,
  type AppliedDiscount,
  type DiscountCheck,
  type DiscountContact,
  type DiscountMessageKey,
  type DiscountRecord,
  type DiscountRefusal,
  type DiscountRefusalReason,
  type EligibleDiscount,
  type HasBeenUsedBy,
} from './discount'
export { isIdr, percentOfHalfUp } from './money'
export {
  PAID_ORDER_STATUSES,
  hasBeenUsedByFor,
  loadPricingInputs,
  type PricingInputs,
} from './payload-adapter'
export {
  buyableLines,
  quoteBag,
  type Catalogue,
  type CatalogueProduct,
  type CatalogueVariant,
  type PricingSettings,
  type Quote,
  type QuoteLine,
  type QuoteLineStatus,
  type QuoteOptions,
  type QuoteRefusal,
} from './quote'
