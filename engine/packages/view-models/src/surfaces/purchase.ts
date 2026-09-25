/**
 * @contract C2 — view models: the purchase panel · owner: ARC · consumers: WEB, UXG, UXE, DOM
 *
 * `ItemVM.purchase` is viewer-relative (DESIGN-SYSTEM.md §3): the item's own status crossed
 * with this viewer's relation to it, the export status and the ship-to destination, so the
 * panel renders a designed state for every combination — a `domestic-only` item seen from
 * abroad reads "Available for delivery within Indonesia · View it in Jakarta", never a
 * disabled Buy button. It is resolved at request time and streamed; the panel reserves its
 * height and shows no purchase control until it resolves. Loaders apply the tier, the
 * status and the modules, so a component never decides which actions exist.
 */
import type { CountryCode, PurchaseAction } from '@engine/config/schema'

import type { CardVM } from '../cards'
import type { Id, ImageVM, IsoDateTime, LinkVM, Money, PriceVM } from '../common'
import type { VariantsPurchaseVM } from './purchase-variants'

export type * from './purchase-variants'

export type PurchaseVM = UniquePurchaseVM | VariantsPurchaseVM | EnquiryOnlyPurchaseVM

/**
 * An action the panel offers. `buy` posts to the cart API (C6); `whatsapp` opens a chat
 * prefilled with the stock number and title in the page's language; the others open their
 * dialog, whose no-JavaScript path is `href` (a Form surface, C10).
 */
export type PurchaseActionVM =
  | { action: 'buy'; productId: Id }
  | { action: 'whatsapp'; href: string }
  | { action: Exclude<PurchaseAction, 'buy' | 'whatsapp'>; href: string }

export type PurchaseActionsVM = {
  primary: PurchaseActionVM | null
  secondary: readonly PurchaseActionVM[]
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
  /** Sold: no price. */
  | { kind: 'hidden' }

/** The item's status as this viewer meets it. */
export type UniqueStateVM =
  | { kind: 'available' }
  /** "On hold until Friday 14:00" — someone else's lock, hold, offer or invoice. */
  | { kind: 'heldByOther'; until: IsoDateTime | null }
  /** A staff hold, an accepted offer or a proforma for this viewer, with its payment link. */
  | { kind: 'heldForMe'; reason: 'hold' | 'offer' | 'invoice'; until: IsoDateTime; payHref: string }
  /** This viewer's checkout lock: the countdown is true, so it is shown. */
  | { kind: 'inMyCheckout'; until: IsoDateTime; checkoutHref: string }
  /** This viewer's offer is pending, or countered (valid until `counterExpiresAt`). */
  | {
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
  | {
      kind: 'sold'
      priceRealised: PriceVM | null
      alternative: CardVM | null
      print: SisterLinkVM | null
    }

export type UniquePurchaseVM = {
  kind: 'unique'
  price: UniquePriceVM
  state: UniqueStateVM
  delivery: DeliveryGateVM
  actions: PurchaseActionsVM
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
}

/** No purchase online: routable nowhere (no recorded location or export status), or not for sale. */
export type EnquiryOnlyPurchaseVM = {
  kind: 'enquiryOnly'
  reason: 'unroutable' | 'notForSale'
  price: PriceVM | null
  actions: PurchaseActionsVM
}

export type SisterVM = {
  name: string
  /** The sister's home page — a separate shop with its own account, and the link says so. */
  href: string
  /** When the copy was last synced: the link never claims more certainty than that. */
  syncedAt: IsoDateTime
}

/** Cross-links between the sisters (BRANDS.md §5), obeying this page's destination rules. */
export type SisterLinkVM =
  /** On an original: the exact products the sister makes from its work. */
  | { kind: 'prints'; sister: SisterVM; products: readonly CardVM[] }
  /** On a reproduction: the original, priced in this visitor's market currency. */
  | {
      kind: 'original'
      sister: SisterVM
      original: {
        title: string
        href: string
        image: ImageVM | null
        status: 'available' | 'onHold' | 'sold' | 'enquire'
        price: PriceVM | null
        /** False for a `domestic-only` original seen from abroad: no buy route is offered. */
        canBuy: boolean
      }
    }
