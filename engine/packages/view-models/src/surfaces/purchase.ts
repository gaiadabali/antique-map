/**
 * @contract C2 — view models: the purchase panel · owner: ARC · consumers: WEB, UXG, UXE, DOM
 *
 * `ItemVM.purchase` is viewer-relative (DESIGN-SYSTEM.md §3): the item's own status crossed
 * with this viewer's relation to it, the export status and the ship-to destination, so the
 * panel renders a designed state for every combination — a `domestic-only` item seen from
 * abroad reads "Available for delivery within Indonesia · View it in Jakarta", never a
 * disabled Buy button. It is resolved at request time and the page awaits it in its own body,
 * so the panel's forms reach the first flush and work without JavaScript (CONVENTIONS.md §12);
 * its availability read is bounded by a short timeout, and a read that fails or times out
 * resolves to `enquiryOnly` / `unverified`, never to an error (`Streamed`). Loaders apply the
 * tier, the status and the modules, so a component never decides which actions exist.
 *
 * v1.5 (D50): where a brand's unique prices are on request (C1 `commerce.uniquePrices`, the
 * gallery) no unique panel carries a figure in any state — its price is `onRequest`, `queued` or
 * `hidden` — the conversation leads (WhatsApp, `call`), and a piece is held by the invoice staff
 * issue: `heldByOther` until its due date, for every visitor. The invoice's buyer pays through
 * the invoice's own link: the gallery signs no one in (D54), so no viewer relation — `heldForMe`,
 * `inMyCheckout`, `myOffer` — is produced at launch; they stay for a brand that signs buyers in.
 */
import type { CountryCode, PurchaseAction, PurchaseBand } from '@engine/config/schema'
import type { AvailabilityState } from '@engine/domain/machines/availability'

import type { CardVM } from '../cards'
import type { IsoDateTime, LineIntent, LinkVM, MessageVM, Money, PriceVM } from '../common'
import type { VariantsPurchaseVM } from './purchase-variants'
import type { SisterLinkVM } from './sister'

export type * from './purchase-variants'
export type * from './sister'

export type PurchaseVM = UniquePurchaseVM | VariantsPurchaseVM | EnquiryOnlyPurchaseVM

/**
 * What C11's `item.viewed` reports that only this request-time part knows, so the page sends
 * that event with the panel: the purchase tier the price falls in (C1 `PurchaseBand`, never
 * the amount) and the item's availability (C8) — `null` when it could not be read (`unverified`).
 * For counted stock, `available` while a variant can be bought, `sold` once every one is sold out.
 */
export type PurchaseAnalyticsVM = { priceBand: PurchaseBand; status: AvailabilityState | null }

/**
 * An action the panel offers. `buy` posts its line to `cart.addLines` (C6) — ids and a
 * quantity of 1, never the price beside it; `pay` opens the payment link of what is held for
 * this viewer; `whatsapp` opens a chat prefilled with the stock number and title in the
 * page's language; `call` dials the brand's number (C1 `identity.contact.phone`) and shows it as
 * text, which a visitor at a desktop reads (v1.5, D50); the others open their dialog, whose
 * no-JavaScript path is `href` (C10).
 */
export type PurchaseActionVM =
  | { action: 'buy'; line: LineIntent }
  | { action: 'pay'; href: string }
  | { action: 'whatsapp'; href: string }
  /** `href` is `tel:` and the E.164 number; `number` the number as the page prints it. */
  | { action: 'call'; href: `tel:${string}`; number: string }
  | { action: Exclude<PurchaseAction, 'buy' | 'whatsapp' | 'call'>; href: string }
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
  /** Never where the brand's unique prices are on request (C1 `commerce.uniquePrices`, D50). */
  | { kind: 'fixed'; price: PriceVM }
  /**
   * "Price on request": a request is answered in place where prices are shown, and by a person —
   * within the panel's `reply` — where they are on request.
   */
  | { kind: 'onRequest' }
  /**
   * Answered in place after the viewer left an email or WhatsApp number — never where the brand's
   * unique prices are on request: there the answer is a person's (`queued`).
   */
  | { kind: 'revealed'; price: PriceVM }
  /**
   * The request is with a person — every request where prices are on request, an item marked
   * sensitive elsewhere: "A specialist will reply", and when is the panel's `reply` (G9, v1.5).
   */
  | { kind: 'queued' }
  /** No asking price (`pricing.mode: offer-only`): the panel invites an offer. */
  | { kind: 'offerOnly' }
  /** Sold: no price. */
  | { kind: 'hidden' }
type Price<K extends UniquePriceVM['kind']> = Extract<UniquePriceVM, { kind: K }>

/**
 * "On hold until Friday 14:00" — someone else's lock, hold, offer or invoice; an invoice's until
 * its due date (D45).
 */
export type HeldByOtherVM = { kind: 'heldByOther'; until: IsoDateTime | null }
/**
 * A staff hold, an accepted offer, or an invoice or proforma for this viewer, known by the
 * viewer's session — where a brand signs buyers in, none at launch (D54): `pay` leads, Buy never
 * shows.
 */
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
      /** `onRequest` where the brand's unique prices are: the agreed figure is the invoice's (D50). */
      price: Price<'fixed' | 'revealed' | 'onRequest'>
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
  /**
   * "Tell me when another example arrives": the want-list page for this item (C10 `wantList`,
   * `like` its public id); `null` when `retention.emailWantList` is off.
   */
  alert: { href: string } | null
  /**
   * The reply promise beside the panel's conversation — WhatsApp, a call, a price request, an
   * enquiry (G9, v1.5): the brand's, from its settings (CONTENT-MODEL.md §6), a code the app words
   * at `message.<code>` — `replyWithinHours` `{hours}`, `replyWithinDays` `{days}`,
   * `replySameWorkingDay` `{timeZone}` (the gallery's: the same working day, Singapore time).
   * `null` where the brand promises none.
   */
  reply: MessageVM | null
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
  /** `null` where the brand's unique prices are on request, whatever the reason (D50). */
  price: PriceVM | null
  actions: PurchaseActionsVM<NoBuyActionVM>
  /** The reply promise beside the enquiry, as `UniqueBaseVM.reply` (G9, v1.5). */
  reply: MessageVM | null
  analytics: PurchaseAnalyticsVM
}
