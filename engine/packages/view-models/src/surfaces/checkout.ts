/**
 * @contract C2 — view models: checkout · owner: ARC · consumers: WEB, UXG, UXE, DOM
 *
 * Steps are data (COMMERCE.md §5): the server decides which steps a checkout has from its
 * seller, destination and lines, and the app renders those present — one surface, never a
 * page per step. Totals are priced again at every step and when the payment attempt is
 * made; the page shows them, and `intents` send back only the opaque token naming what the
 * buyer saw (C6 `PricingToken`), so a moved figure is `price-changed`, never a silent
 * charge. The checkout lock is taken at the payment step and extended to the chosen
 * method's session; its countdown is true, so it is shown.
 */
import type { CountryCode } from '@engine/config/schema'
import type {
  BuyerOrderStatus,
  CheckoutContinueRequest,
  CheckoutStep,
  ChosenDelivery,
  FieldError,
  LineProblem,
  PaymentStartRequest,
  ProblemOf,
  ProformaRequest,
  WireSessionResult,
} from '@engine/domain/api'
import type { PaymentFailureClass, PaymentMethodId } from '@engine/domain/machines/payment'

import type { CardVM } from '../cards'
import type { IsoDateTime, LinkVM, SellerIdentityVM, SeoVM } from '../common'
import type {
  AddressVM,
  AppliedCodeVM,
  MarketVM,
  PaymentOptionVM,
  PickupVM,
  ShippingOptionVM,
  TotalsVM,
} from '../commerce'
import type { CartLineVM } from './cart'

/** A line as checkout shows it: the bag's line without its bag controls. */
export type CheckoutLineVM = Omit<CartLineVM, 'intents' | 'remedy' | 'maxQuantity'>

export type CheckoutContactVM = {
  /** An Indonesian destination asks for WhatsApp first: order updates arrive there. */
  whatsappFirst: boolean
  /** Organisation, tax id and PO number, shown when the buyer says they buy for one. */
  institutionAllowed: boolean
  /** What the buyer entered, or the account's details — never cleared on an error. */
  values: {
    fullName: string | null
    email: string | null
    whatsapp: string | null
    whatsappConfirmed: boolean
    institution: { organisation: string; taxId: string | null; poNumber: string | null } | null
  }
  /** Separate and unticked by default, one per purpose (COMPLIANCE.md §7). */
  consents: readonly ('marketingEmail' | 'marketingWhatsapp')[]
  signedIn: boolean
}

export type CheckoutDeliveryVM = {
  /** From the ship-to selector: an address in another country moves it and re-prices. */
  country: CountryCode
  /** Indonesia: searchable pickers to the sub-district, the map pin optional. */
  addressShape: 'indonesia' | 'international' | null
  savedAddresses: readonly AddressVM[]
  pickup: readonly PickupVM[]
  /** Hotel or villa delivery before a visitor's departure date. */
  deliverBeforeAllowed: boolean
  /**
   * What the buyer chose (C6 `ChosenDelivery`): the entries the form refills with when they
   * change it — after a 303 or a reload too — and a shipment's address as its label prints it.
   */
  chosen: ChosenDelivery | null
}

export type CheckoutPaymentVM = {
  options: readonly PaymentOptionVM[]
  /** Apple Pay / Google Pay where the seller supports them: they collapse the steps. */
  express: readonly PaymentOptionVM[]
  /** The gateway session once a method is chosen; every C7 kind is a designed state. */
  session: WireSessionResult | null
}

/**
 * Why the last step could not proceed — each a designed state that explains and instructs. It is
 * a post's outcome, which a page without JavaScript reads back through C13's `FORM_RESULT`, so
 * it is resolved, and nothing in it streams: a streamed part would stay hidden from that visitor.
 */
export type CheckoutProblemVM =
  /** The totals above are the new figures: shown, and confirmed again — never charged silently. */
  | { code: 'price-changed' }
  /** Someone else was first: alternatives and a want-list, never a dead end. */
  | {
      code: 'reservation-conflict'
      state: 'held' | 'sold'
      heldUntil: IsoDateTime | null
      alternatives: readonly CardVM[]
      /** The want-list page for the item (C10 `wantList`); `null` without `retention.emailWantList`. */
      wantList: { href: string } | null
    }
  | { code: 'line-not-routable'; lines: readonly LineProblem[] }
  /** The lock ran out mid-payment: start again from `href`. */
  | { code: 'expired'; restartAt: 'cart' | 'item' | 'link'; href: string }
  | ProblemOf<'method-unavailable'>
  /**
   * A payment declined, failed or expired, or a redirect cancelled: another method, the bag
   * kept. `reason` is C7's class, which the page words and `payment.failed` reports (C11).
   */
  | { code: 'payment-failed'; method: PaymentMethodId; reason: PaymentFailureClass }
  /** Every failing field at once, the buyer's entries kept. */
  | { code: 'invalid'; fields: readonly FieldError[] }

export type CheckoutVM = {
  surface: 'checkout'
  checkoutId: string
  seller: SellerIdentityVM
  market: MarketVM
  /** Only the steps this checkout has, in order, each `todo`, `current` or `done`. */
  steps: readonly CheckoutStep[]
  lines: readonly CheckoutLineVM[]
  totals: TotalsVM
  codes: readonly AppliedCodeVM[]
  contact: CheckoutContactVM
  delivery: CheckoutDeliveryVM
  shipping: { options: readonly ShippingOptionVM[]; selected: string | null }
  payment: CheckoutPaymentVM
  /** A unique item's lock once taken: "We're holding this for you for 14:52". */
  lock: { expiresAt: IsoDateTime } | null
  /** The order, once checkout reached payment, as its buyer reads it (C6 `BuyerOrderStatus`). */
  order: { number: string; status: BuyerOrderStatus } | null
  terms: LinkVM
  problem: CheckoutProblemVM | null
  intents: {
    /** "Continue to payment": the component adds `termsAccepted` and an idempotency key. */
    continue: Omit<CheckoutContinueRequest, 'termsAccepted' | 'idempotencyKey'>
    /** A method chosen: the component adds the method and an idempotency key. */
    pay: Omit<PaymentStartRequest, 'method' | 'idempotencyKey'>
    /**
     * "Proforma instead" (C6 `quote.proforma`): the component adds an idempotency key. `null`
     * unless `purchase.invoices` is on and the contact step named an institution.
     */
    proforma: Omit<ProformaRequest, 'idempotencyKey'> | null
  }
  seo: SeoVM
}
