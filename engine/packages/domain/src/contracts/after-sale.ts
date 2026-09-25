/**
 * @contract C6 Commerce API — order lookup, return requests and quotes · owner: ARC · via `@engine/domain/api`
 *
 * After the order: guests track by order number plus the email or WhatsApp number they used
 * (the pair is the credential — a number alone never is); a return can be requested on every
 * order line (UU 8/1999 allows no "all sales final", COMPLIANCE.md §6); institutions turn a bag
 * into a proforma and businesses ask for quotes (COMMERCE.md §7; EXPERIENCE-SHOP.md §9).
 */
import type { Money } from '../money/contract'
import type { OrderStatus } from '../order/machine'
import type { PaymentStatus } from '../payment/machine'
import type { SellerIdentity } from './checkout'
import type {
  ContactInput,
  InstitutionInput,
  LeadContactInput,
  LineInput,
  ProductPublicId,
  UploadId,
  VariantId,
} from './requests'
import type { IdempotencyKey, PricedTotals, PricingToken } from './results'
import type { IsoDate, IsoInstant } from './scalars'

/** A stored order's figures as the buyer reads them: no token, because nothing is committed. */
export type OrderTotalsView = Omit<PricedTotals, 'token'>

/** A courier's progress, normalised across carriers (C7 shipping events map onto it). */
export type ShipmentStatus =
  | 'label-created'
  | 'ready-for-pickup'
  | 'picked-up'
  | 'in-transit'
  | 'out-for-delivery'
  | 'delivered'
  | 'collected'
  | 'exception'
  | 'returned-to-sender'

export type ShipmentView = {
  readonly carrier: string | null
  readonly service: string | null
  readonly trackingNumber: string | null
  readonly trackingUrl: string | null
  readonly status: ShipmentStatus
  readonly events: readonly {
    readonly at: IsoInstant
    readonly status: ShipmentStatus
    readonly description: string
  }[]
  /** A pickup's collection code (also shown as a QR). */
  readonly pickupCode: string | null
}

/** A line as the order snapshotted it: title, image and price as sold, whatever changed since. */
export type OrderLineView = {
  readonly lineId: string
  readonly title: string
  readonly imageUrl: string | null
  readonly quantity: number
  readonly unitPrice: Money
  readonly total: Money
  readonly returnable: boolean
}

export type OrderSummaryView = {
  readonly number: string
  readonly placedAt: IsoInstant
  readonly status: OrderStatus
  readonly payment: PaymentStatus
  readonly seller: SellerIdentity
  readonly lines: readonly OrderLineView[]
  readonly totals: OrderTotalsView
  readonly shipments: readonly ShipmentView[]
}

/** Guest tracking. A wrong number and a wrong email answer the same `not-found`; rate-limited. */
export type OrderLookupRequest = { readonly orderNumber: string } & (
  | { readonly email: string; readonly whatsapp: null }
  | { readonly email: null; readonly whatsapp: string }
)

export type OrderLookupView = {
  /** Short-lived and scoped to this order: a return request uses it instead of re-sending the email. */
  readonly lookupToken: string
  readonly order: OrderSummaryView
}

/** How a caller proves the order is theirs: the customer session, or a fresh lookup. */
export type OrderAccess =
  | { readonly kind: 'account'; readonly orderNumber: string }
  | { readonly kind: 'lookup'; readonly lookupToken: string }

export type ReturnReason = 'damaged' | 'not-as-described' | 'wrong-item' | 'changed-mind' | 'other'

export type ReturnRequest = {
  readonly access: OrderAccess
  readonly lines: readonly {
    readonly orderLineId: string
    readonly quantity: number
    readonly reason: ReturnReason
    readonly note: string | null
  }[]
  readonly photos: readonly UploadId[]
  readonly idempotencyKey: IdempotencyKey
}

export type ReturnRequestView = {
  readonly returnToken: string
  readonly status: 'requested' | 'approved' | 'declined' | 'received' | 'refunded' | 'closed'
  /** Return shipping instructions once approved; an original returns to its seller's location. */
  readonly instructions: string | null
}

/**
 * A proforma for an institution, from one seller's group of the bag (module `purchase.invoices`):
 * `invoice` holds on every line until the due date, a PDF, and a "pay this proforma" page.
 */
export type ProformaRequest = {
  readonly sellerId: string
  readonly institution: InstitutionInput
  readonly contact: ContactInput
  readonly acceptedPricing: PricingToken
  readonly idempotencyKey: IdempotencyKey
}

/** A business quote (For Business, "Turn this into a quote"): prepared by staff, then issued. */
export type QuoteRequest = {
  readonly lines: readonly LineInput[]
  readonly message: string | null
  readonly neededBy: IsoDate | null
  readonly institution: InstitutionInput | null
  readonly contact: LeadContactInput
  readonly idempotencyKey: IdempotencyKey
}

export type QuoteGetRequest = { readonly token: string }

export type QuoteLineView = {
  readonly productId: ProductPublicId
  readonly variantId: VariantId | null
  readonly quantity: number
  readonly options: { readonly [axis: string]: string } | null
  readonly unitPrice: Money
  readonly total: Money
  /** A unique line's `invoice` hold, when the quote is a proforma. */
  readonly heldUntil: IsoInstant | null
}

export type QuoteView = {
  readonly token: string
  readonly kind: 'proforma' | 'quote'
  readonly status: 'requested' | 'issued' | 'accepted' | 'paid' | 'expired' | 'cancelled'
  readonly seller: SellerIdentity
  readonly lines: readonly QuoteLineView[]
  /** Null while staff prepare a requested quote. */
  readonly totals: PricedTotals | null
  readonly validUntil: IsoInstant | null
  /** Wire details live on this PDF only, never on a page (fraud). */
  readonly pdfUrl: string | null
  /** Once accepted: the payment link, whose methods routing allows. */
  readonly payLinkToken: string | null
}

/** Accept an issued quote as priced — a different figure than the token names is `price-changed`. */
export type QuoteAcceptRequest = {
  readonly token: string
  readonly acceptedPricing: PricingToken
  readonly idempotencyKey: IdempotencyKey
}
