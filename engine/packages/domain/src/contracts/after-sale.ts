/**
 * @contract C6 Commerce API — order lookup, return requests and quotes · owner: ARC · via `@engine/domain/api`
 *
 * After the order: guests track by order number plus the email or WhatsApp number they used
 * (the pair is the credential — a number alone never is); a return can be requested on every
 * order line (UU 8/1999 allows no "all sales final", COMPLIANCE.md §6); institutions turn a bag
 * into a proforma, and a business asks for quotes — on the shop, as an approved partner (D36).
 */
import type {
  Money,
  TradeMinimum,
  TradeMinimumShortfall,
  TradeMinimumWaiver,
} from '../money/contract'
import type { SellerIdentity } from './checkout'
import type { OrderSummaryView } from './orders'
import type {
  InstitutionInput,
  LeadContactInput,
  LineInput,
  ProductPublicId,
  UploadId,
  VariantId,
} from './requests'
import type { IdempotencyKey, PricedTotals, PricingToken } from './results'
import type { IsoDate, IsoInstant } from './scalars'
import type { Accepts, Assert, Equals } from './type-assertions'

/**
 * Guest tracking. A wrong number and a wrong email answer the same `not-found`; rate-limited. A
 * form posts `orderNumber`, `email` and `whatsapp` — the fields are named for this request, and
 * C13's decoder reads the one left blank as `null`. Neither given is `invalid` on `email`
 * (`required`), and both given on `whatsapp` (`not-allowed`): a rule across fields reports on a
 * field the form has (`FieldError`).
 */
export type OrderLookupRequest = { readonly orderNumber: string } & (
  | { readonly email: string; readonly whatsapp: null }
  | { readonly email: null; readonly whatsapp: string }
)

export type OrderLookupView = {
  /**
   * Short-lived and scoped to this order. The handler also stores it in C13's `order_access`
   * cookie (HttpOnly), so a browser's later requests for this order say only `lookup-cookie`.
   */
  readonly lookupToken: string
  readonly order: OrderSummaryView
}

/**
 * How a caller proves the order is theirs: the customer session, or a lookup token. In a browser the
 * token lives in C13's `order_access` cookie — HttpOnly, set by `orderLookup.find`, by a checkout's
 * or pay link's confirmation, or by the one-hop link a message carries — and the request says only
 * `lookup-cookie`: the handler reads the cookie, so the token never enters a URL, a page's HTML or
 * its scripts. `lookup` carries the token in the body, for a caller with no cookie to send.
 */
export type OrderAccess =
  | { readonly kind: 'account'; readonly orderNumber: string }
  | { readonly kind: 'lookup-cookie' }
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
 * A proforma for an institution (module `purchase.invoices`), from its checkout — one seller's
 * group of the bag — instead of paying now: the payment step's "Proforma instead" (C2
 * `CheckoutVM.intents.proforma`). Its contact and institution are the checkout's own, as the
 * contact step stored them, never posted again; a checkout that named no institution is `invalid`.
 * Priced like `checkout.continue` (another figure than `acceptedPricing` names is
 * `price-changed`), it takes `invoice` holds on every unique line until the due date and issues the
 * proforma's number and PDF; paying it is the quote's page. It stays open to any buyer where
 * `accounts.retailers` is on: it prices at retail, and D36 is about trade terms, not proformas.
 */
export type ProformaRequest = {
  readonly checkoutId: string
  readonly acceptedPricing: PricingToken
  readonly idempotencyKey: IdempotencyKey
}

/**
 * What a quote request asks to have quoted: lines to price — a configured product ("Turn this into
 * a quote") — or, with no lines yet, a BRIEF in `message`: a partner's new order in its own words
 * ("40 framed prints for the lobby, by March"), whose lines staff build in the order builder
 * before issuing it (24.5). A form post with no `lines` is read as the empty list, so a brief
 * always has its message. A reorder is not a request with lines: it names its order
 * (`quote.reorder`), and the server copies the lines.
 */
type QuoteRequestSubject =
  | { readonly lines: readonly [LineInput, ...LineInput[]]; readonly message: string | null }
  | { readonly lines: readonly []; readonly message: string }

/**
 * A quote to prepare, which staff price when they issue it and then send: a signed-in partner's
 * order (D32), at its trade tier; or, where `accounts.retailers` is off, a guest's — an
 * institution's or a business's ("Turn this into a quote"). Where it is on, every business buyer
 * quotes as a partner (D36): a request from anyone but an approved partner is `not-offered`, and
 * the Partnership page is the way in. Its page is C10's `quote` form kind: an item's, or a brief.
 */
export type QuoteRequest = QuoteRequestSubject & {
  readonly neededBy: IsoDate | null
  /**
   * A partner's form prefills it from its record — the business name, and the NPWP (or tax
   * number) as `taxId`, for the tax-invoice export; null from a partner takes the record's as is.
   */
  readonly institution: InstitutionInput | null
  /**
   * Null only for a signed-in, approved partner: the session is the contact. From anyone else a
   * null contact is `invalid`.
   */
  readonly contact: LeadContactInput | null
  readonly idempotencyKey: IdempotencyKey
}

export type QuoteGetRequest = { readonly token: string }

export type QuoteLineView = {
  readonly productId: ProductPublicId
  readonly variantId: VariantId | null
  readonly quantity: number
  readonly options: { readonly [axis: string]: string } | null
  /** What the buyer pays per piece: on a retailer's quote, the trade price (C5 `buyerUnitPrice`). */
  readonly unitPrice: Money
  /** The market list's price the trade tier started from, for reference; null without a tier. */
  readonly retailUnitPrice: Money | null
  readonly total: Money
  /** A unique line's `invoice` hold, when the quote is a proforma. */
  readonly heldUntil: IsoInstant | null
}

/**
 * The trade terms a retailer's quote was issued at (D32) — kept as issued, whatever changes to the
 * retailer's tier later; paying the quote applies exactly these (C5 `AgreedPrice.trade`).
 */
export type QuoteTradeView = {
  readonly tierId: string
  readonly discountBps: number
  readonly minimum: TradeMinimum
  /**
   * Staff issued the quote below its minimum (C5 `TradeMinimumWaiver`): when, and by how much it
   * fell short. Who waived it and why stay in the admin. Null when the quote met its minimum.
   */
  readonly minimumWaiver: QuoteWaiverView | null
}
export type QuoteWaiverView = Pick<TradeMinimumWaiver, 'at' | 'shortfall'>

/**
 * Who a quote is for, as issued — printed on its PDF, and shown on its page only to whoever opens
 * it (its token, or the partner's session: C10 `quote` is `sensitive`). A partner's comes from its
 * record (`taxId` its NPWP or tax number, for the tax-invoice export); a field not given is null.
 */
export type QuoteBuyerView = {
  readonly name: string | null
  readonly organisation: string | null
  readonly taxId: string | null
  readonly poNumber: string | null
}

export type QuoteView = {
  readonly token: string
  readonly kind: 'proforma' | 'quote'
  readonly status: 'requested' | 'issued' | 'accepted' | 'paid' | 'expired' | 'cancelled'
  /**
   * The document number from the seller's gapless sequence, with its prefix (COMMERCE.md §12) —
   * a proforma's the moment it is issued; null while staff prepare a requested quote.
   */
  readonly number: string | null
  readonly seller: SellerIdentity
  readonly buyer: QuoteBuyerView
  readonly lines: readonly QuoteLineView[]
  /** Null while staff prepare a requested quote. */
  readonly totals: PricedTotals | null
  readonly validUntil: IsoInstant | null
  /** Wire details live on this PDF only, never on a page (fraud). */
  readonly pdfUrl: string | null
  /** Once accepted: the payment link, whose methods routing allows. */
  readonly payLinkToken: string | null
  /** An approved retailer's quote: the terms it was issued at. Null for every other quote. */
  readonly trade: QuoteTradeView | null
}

/** Accept an issued quote as priced — a different figure than the token names is `price-changed`. */
export type QuoteAcceptRequest = {
  readonly token: string
  readonly acceptedPricing: PricingToken
  readonly idempotencyKey: IdempotencyKey
}

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

// A brief with no lines says what it needs; a request with lines may leave the message out.
type _BriefWithoutMessage = Accepts<
  QuoteRequestSubject,
  // @ts-expect-error — no lines and no message leaves staff nothing to quote
  { lines: []; message: null }
>
type _LinesWithoutMessage = Accepts<QuoteRequestSubject, { lines: [LineInput]; message: null }>
// The partner reads that its minimum was waived, and by how much — never who waived it, or why.
type _WaiverViewNamesNoStaff = Assert<
  Equals<Extract<keyof QuoteWaiverView, 'by' | 'reason'>, never>
>
type _WaiverViewShortfall = Assert<Equals<QuoteWaiverView['shortfall'], TradeMinimumShortfall>>
