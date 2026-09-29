/**
 * @contract C2 — view models: the purchase panel · owner: ARC · consumers: WEB, UXG, UXE, DOM
 *
 * `ItemVM.purchase` is viewer-relative (DESIGN-SYSTEM.md §3): the item's own status crossed
 * with this viewer's relation to it, the export status and the ship-to destination, so the
 * panel renders a designed state for every combination — a `domestic-only` item seen from
 * abroad reads "Available for delivery within Indonesia · View it in Jakarta", never a
 * disabled Buy button. It is resolved at request time and streamed; the panel reserves its
 * height and shows no purchase control until it resolves, and a read that fails resolves to
 * `enquiryOnly` / `unverified`, never to an error (`Streamed`). Loaders apply the tier, the
 * status and the modules, so a component never decides which actions exist.
 */
import type { CountryCode, PurchaseAction, PurchaseBand } from '@engine/config/schema'
import type { AvailabilityState } from '@engine/domain/machines/availability'

import type { CardVM } from '../cards'
import type { IsoDateTime, LineIntent, LinkVM, Money, PriceVM } from '../common'
import type { VariantsPurchaseVM } from './purchase-variants'
import type { SisterLinkVM } from './sister'

export type * from './purchase-variants'
export type * from './sister'

export type PurchaseVM = UniquePurchaseVM | VariantsPurchaseVM | EnquiryOnlyPurchaseVM

/**
 * What C11's `item.viewed` reports that only this streamed part knows, so the page sends that
 * event once the panel resolves: the purchase tier the price falls in (C1 `PurchaseBand`, never
 * the amount) and the item's availability (C8) — `null` when it could not be read (`unverified`).
 * For counted stock, `available` while a variant can be bought, `sold` once every one is sold out.
 */
export type PurchaseAnalyticsVM = { priceBand: PurchaseBand; status: AvailabilityState | null }

/**
 * An action the panel offers. `buy` posts its line to `cart.addLines` (C6) — ids and a
 * quantity of 1, never the price beside it; `pay` opens the payment link of what is held for
 * this viewer; `whatsapp` opens a chat prefilled with the stock number and title in the
 * page's language; the others open their dialog, whose no-JavaScript path is `href` (C10).
 */
export type PurchaseActionVM =
  | { action: 'buy'; line: LineIntent }
  | { action: 'pay'; href: string }
  | { action: 'whatsapp'; href: string }
  | { action: Exclude<PurchaseAction, 'buy' | 'whatsapp'>; href: string }
/** Every action but Buy: what a panel offers when the item cannot go in the bag now. */
export type NoBuyActionVM = Exclude<PurchaseActionVM, { action: 'buy' }>

export type PurchaseActionsVM<P extends PurchaseActionVM = PurchaseActionVM> = {
  primary: P | null
  secondary: readonly P[]
}

/** Whether the item can reach the ship-to destination (COMMERCE.md §2, COMPLIANCE.md §1). */
export type DeliveryGateVM =
  | { kind: 'deliverable' }
  /** Held in Indonesia and not export-cleared, seen from abroad. `viewAt`: "Jakarta". */
  | { kind: 'domesticOnly'; country: CountryCode; viewAt: string }
  /** An export permit is in progress: ask, or view it where it is. */
  | { kind: 'exportPending'; viewAt: string }

export type UniquePriceVM =
  | { kind: 'fixed'; price: PriceVM }
  /** "Price on request": the request-price flow answers in place. */
  | { kind: 'onRequest' }
  /** Answered in place after the viewer left an email or WhatsApp number. */
  | { kind: 'revealed'; price: PriceVM }
  /** A sensitive item: "A specialist will reply within {hours}". */
  | { kind: 'queued'; replyHours: number }
  /** No asking price (`pricing.mode: offer-only`): the panel invites an offer. */
  | { kind: 'offerOnly' }
  /** Sold: no price. */
  | { kind: 'hidden' }
type Price<K extends UniquePriceVM['kind']> = Extract<UniquePriceVM, { kind: K }>

/** "On hold until Friday 14:00" — someone else's lock, hold, offer or invoice. */
export type HeldByOtherVM = { kind: 'heldByOther'; until: IsoDateTime | null }
/** A staff hold, an accepted offer or a proforma for this viewer: `pay` leads, Buy never shows. */
export type HeldForMeVM = {
  kind: 'heldForMe'
  reason: 'hold' | 'offer' | 'invoice'
  until: IsoDateTime
}
/** Already in this viewer's bag (a bag never reserves, so it can still sell): "View your bag". */
export type InMyBagVM = { kind: 'inMyBag'; cartHref: string }
/** This viewer's checkout lock: the countdown is true, so it is shown. */
export type InMyCheckoutVM = { kind: 'inMyCheckout'; until: IsoDateTime; checkoutHref: string }
/**
 * This viewer's open offer, submitted or countered (the counter open until `counterExpiresAt`).
 * A declined, expired or withdrawn offer is history on the account (`AccountOfferVM`): the
 * panel shows the item's own state again, and a new offer may be made.
 */
export type MyOfferVM = {
  kind: 'myOffer'
  status: 'submitted' | 'countered'
  amount: Money
  counter: Money | null
  counterExpiresAt: IsoDateTime | null
  href: string
}
/**
 * Sold, and still published: no price (a price realised only for a signed-in buyer), the
 * available example of the same edition, and a print from the sister where one exists.
 */
export type SoldVM = {
  kind: 'sold'
  priceRealised: PriceVM | null
  alternative: CardVM | null
  print: SisterLinkVM | null
}
export type UniqueStateVM =
  | { kind: 'available' }
  | HeldByOtherVM
  | HeldForMeVM
  | InMyBagVM
  | InMyCheckoutVM
  | MyOfferVM
  | SoldVM

/**
 * Each state with the prices and actions it can show. An impossible panel — a sold item with a
 * price, someone else's hold with a price revealed to this viewer, Buy beside the viewer's own
 * hold, bag or offer — does not compile (`commerce-check.ts`).
 */
export type UniquePanelVM =
  | {
      state: { kind: 'available' }
      price: Price<'fixed' | 'onRequest' | 'revealed' | 'queued' | 'offerOnly'>
      actions: PurchaseActionsVM
    }
  | {
      state: HeldByOtherVM
      price: Price<'fixed' | 'onRequest' | 'offerOnly'>
      actions: PurchaseActionsVM<NoBuyActionVM>
    }
  | {
      state: HeldForMeVM
      price: Price<'fixed' | 'revealed'>
      actions: {
        primary: Extract<PurchaseActionVM, { action: 'pay' }>
        secondary: readonly NoBuyActionVM[]
      }
    }
  | {
      state: InMyBagVM | InMyCheckoutVM
      price: Price<'fixed' | 'revealed'>
      actions: PurchaseActionsVM<NoBuyActionVM>
    }
  | {
      state: MyOfferVM
      price: Price<'fixed' | 'onRequest' | 'revealed' | 'offerOnly'>
      actions: PurchaseActionsVM<NoBuyActionVM>
    }
  | { state: SoldVM; price: Price<'hidden'>; actions: PurchaseActionsVM<NoBuyActionVM> }

/** What every unique panel carries whatever its state. */
export type UniqueBaseVM = {
  kind: 'unique'
  delivery: DeliveryGateVM
  /** A numbered edition unit; `null` for a one-of-one, which may say so because it is true. */
  edition: { number: number; of: number } | null
  /** Where it ships from — the public city of its stock location, never the location record. */
  shipsFrom: string | null
  /** An insured shipping estimate to the ship-to country; `quote` above the insured threshold. */
  insuredShipping: { kind: 'estimate'; price: PriceVM } | { kind: 'quote' } | null
  /** The trust pages the panel cites: guarantee, certificate, returns, shipping. */
  reassurance: readonly LinkVM[]
  /** "Tell me when another example arrives"; `null` when `retention.wantList` is off. */
  alert: { href: string } | null
  analytics: PurchaseAnalyticsVM
}
export type UniquePurchaseVM = UniqueBaseVM & UniquePanelVM

/**
 * No purchase online: routable nowhere (no recorded location or export status), not for
 * sale, or `unverified` — availability could not be read just now, so the panel offers an
 * enquiry rather than guessing, and the next request tries again.
 */
export type EnquiryOnlyPurchaseVM = {
  kind: 'enquiryOnly'
  reason: 'unroutable' | 'notForSale' | 'unverified'
  price: PriceVM | null
  actions: PurchaseActionsVM<NoBuyActionVM>
  analytics: PurchaseAnalyticsVM
}
