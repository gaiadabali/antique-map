/**
 * @contract C2 — view models: commerce building blocks · owner: ARC · consumers: WEB, UXG, UXE, DOM
 *
 * What the bag, checkout, order, payment-link, quote and account pages share. Two kinds of
 * part, never mixed: display figures — C5 `Money` and `PriceSet`, safe-integer minor units
 * priced on the server for this visitor's market — and intents (`../common` `LineIntent`,
 * each surface's `intents`), which carry ids, choices and C6's opaque `PricingToken` back to
 * the commerce API. No figure is ever part of an intent, so nothing a component posts can
 * name a price: the server prices again and answers `price-changed` when its own figures
 * produce a different token from the one the buyer accepted. C6, C7 and C8 vocabulary —
 * steps, problems, notices, sessions — is used as it is, so a code means the same thing on the
 * wire and on the page; an order's status is C6's `BuyerOrderStatus`, never a machine's state.
 */
import type { CountryCode, CurrencyCode, TaxRegime } from '@engine/config/schema'
import type {
  BuyerOrderStatus,
  CartRemoveCodeRequest,
  OrderTotalsView,
  PaymentOptionView,
  PricingToken,
  ShipmentView,
  ShippingOptionView,
} from '@engine/domain/api'

import type { ImageVM, IsoDateTime, Money } from './common'
import type { LocationSummaryVM } from './surfaces/editorial'
import type { AxisKey } from './surfaces/purchase-variants'

export type { PricingToken }

/** The market the ship-to selector chose: the only input to currency and prices. */
export type MarketVM = { country: CountryCode; currency: CurrencyCode }

/**
 * Totals as the buyer reads them: C6's figures without the token (`OrderTotalsView`), and
 * the seller's tax regime so the page can say "incl. PPN" or "GST not charged". The token
 * naming these figures travels only inside an intent.
 */
export type TotalsVM = OrderTotalsView & { taxRegime: TaxRegime }

/** A work or product a commerce page mentions: enough to recognise it, one link. */
export type ItemRefVM = {
  title: string
  href: string | null
  image: ImageVM | null
  /** `M.0001` — also the WhatsApp reference. */
  stockNumber: string | null
  /** Always true for reproductions and merchandise: the label is never optional. */
  isReproduction: boolean
}

/**
 * A configured line's choices as the page shows them: "Frame · Natural teak". `axis` is `null` for
 * an order's option whose axis no product type has any more: its label as sold, shown alone.
 */
export type OptionLabelVM = { axis: AxisKey | null; value: string }

/** A code on the bag: what it takes off or pays at the current totals, and how to remove it. */
export type AppliedCodeVM = {
  code: string
  kind: 'discount' | 'gift-card'
  value: Money
  remove: CartRemoveCodeRequest
}

/** A rate as C6 prices it for this checkout; `quote-required` carries no price. */
export type ShippingOptionVM = ShippingOptionView
/** A method routing allows (PAYMENTS.md §3), in the seller's method order. */
export type PaymentOptionVM = PaymentOptionView
/** A shipment and its courier timeline, normalised across carriers. */
export type ShipmentVM = ShipmentView

/** Pickup at a location with stock: "Ready at the showroom in 2 hours" when it can be promised. */
export type PickupVM = {
  locationId: string
  location: LocationSummaryVM
  readyWithinHours: number | null
}

/** A saved address, shaped for its country (Indonesia down to the sub-district). */
export type AddressVM = {
  id: string
  label: string | null
  shape: 'indonesia' | 'international'
  country: CountryCode
  /** As it prints on a label. */
  lines: readonly string[]
  isDefault: boolean
}

/** The order documents a buyer downloads (COMMERCE.md §12): per seller, in their language. */
export type DocumentKind =
  | 'confirmation'
  | 'proforma'
  | 'receipt'
  | 'certificate'
  | 'commercial-invoice'
  | 'packing-slip'
  | 'return-authorisation'
  /** An approved retailer's terms or price list (D32), to them alone. */
  | 'trade-terms'
export type DocumentVM = { kind: DocumentKind; href: string }

/**
 * An order in a list — the account, a lookup — with enough to recognise it. `Reorder` is what
 * its row may offer, and every use says which: `null` for a buyer's or a guest's, and
 * `ReorderIntentVM | null` for an approved partner's (an order it cannot reorder has `null`).
 */
export type OrderSummaryVM<Reorder extends ReorderIntentVM | null> = {
  number: string
  placedAt: IsoDateTime
  /** Where the order stands for its buyer (C6), derived by the loader: never a dispute. */
  status: BuyerOrderStatus
  total: Money
  items: readonly ItemRefVM[]
  /** `href('order', { number })`: it opens with the session or the order-access cookie. */
  href: string
  reorder: Reorder
}

/**
 * "Reorder, one click from your order history" (D32): the order, by its number, posted as C6
 * `quote.reorder` `{ fromOrder }` — a hidden field without JavaScript, the page minting the
 * idempotency key beside it. The server copies the lines from the partner's own order, so
 * nothing can be added or tampered with, and the session is the contact. Never a cart and
 * never a price: staff price the quote when they issue it, at the partner's tier.
 */
export type ReorderIntentVM = { fromOrder: string }
