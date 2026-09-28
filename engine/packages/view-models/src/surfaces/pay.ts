/**
 * @contract C2 — view models: payment links and quotes · owner: ARC · consumers: WEB, UXG, UXE, DOM
 *
 * `Pay` is the landing page of a staff-sent payment link — an accepted offer, a hold, a
 * proforma, a sale agreed on WhatsApp (PAYMENTS.md §5): the item, the terms, the expiry, the
 * seller's identity and the methods routing allows, never a bare gateway screen; the hold it
 * pays for outlasts the method the buyer picks. It is C6's `PayLinkView` (`payLink.get`) as
 * the page reads it. `Quote` is a business or institutional
 * quote or proforma (COMMERCE.md §7, EXPERIENCE-SHOP.md §9), or an approved retailer's order
 * at its trade tier (D32): lines, validity, the PDF (the only place wire details appear),
 * accept → the payment link. The token in each URL is the capability; the figures are
 * display, and each intent sends back only the token naming them.
 */
import type {
  PayLinkStartRequest,
  PaymentStarted,
  PaymentStatusRequest,
  QuoteAcceptRequest,
  QuoteView,
} from '@engine/domain/api'

import type { IsoDateTime, LinkVM, MessageVM, Money, SellerIdentityVM, SeoVM } from '../common'
import type { ItemRefVM, OptionLabelVM, PaymentOptionVM, TotalsVM } from '../commerce'
import type { MinimumOrderVM, TradeTierVM } from './account-retailer'

/** A line of a link or a quote as issued — a requested quote's at list price until staff issue it. */
export type IssuedLineVM = {
  item: ItemRefVM
  options: readonly OptionLabelVM[]
  quantity: number
  unitPrice: Money
  total: Money
}

export type PayVM = {
  surface: 'pay'
  /** Why the link exists: it frames the page and decides its terms. */
  reason: 'offer' | 'hold' | 'invoice' | 'sale'
  status: 'open' | 'paid' | 'expired' | 'cancelled'
  seller: SellerIdentityVM
  lines: readonly IssuedLineVM[]
  totals: TotalsVM
  /** When the link stops taking payment — at the latest when the hold behind it ends. */
  expiresAt: IsoDateTime
  /** When the hold behind it ends; each method's session is sized to finish before it. */
  holdExpiresAt: IsoDateTime | null
  /** The staff member's note ("As agreed on WhatsApp…"), in their words. */
  note: string | null
  /** What the buyer accepts by paying: the offer's terms, returns, the guarantee. */
  terms: readonly LinkVM[]
  methods: readonly PaymentOptionVM[]
  /** A payment already under way: its stored session, replayed so the page picks it up again. */
  payment: PaymentStarted | null
  /** The order the link pays, once there is one; its page opens with the order-access cookie. */
  order: { number: string; href: string } | null
  /** `null` unless the link is open. */
  intents: {
    /** The component adds the method and an idempotency key. */
    start: Omit<PayLinkStartRequest, 'method' | 'idempotencyKey'>
    /** Once a payment is under way, polled until it settles; scoped to this link. */
    poll: PaymentStatusRequest | null
  } | null
  seo: SeoVM
}

/**
 * The terms a partner's quote was issued at (C6 `QuoteTradeView`), kept as issued whatever the
 * partner's tier becomes: paying the quote applies exactly these.
 */
export type QuoteTradeVM = {
  tier: TradeTierVM
  minimum: MinimumOrderVM
  /**
   * Issued below its minimum, for this one quote (C1 `commerce.trade.waiver`): when, and by
   * how much it fell short — never who waived it, or why. `null` when it met its minimum.
   */
  minimumWaiver: { at: IsoDateTime; shortfall: MinimumShortfallVM } | null
}

/** How far a quote fell short of its minimum (C5 `TradeMinimumShortfall`), kind for kind. */
export type MinimumShortfallVM =
  | { kind: 'amount'; total: Money; required: Money }
  | {
      kind: 'piecesPerDesign'
      short: readonly { design: ItemRefVM; pieces: number; required: number }[]
    }

export type QuoteVM = {
  surface: 'quote'
  kind: 'proforma' | 'quote'
  status: QuoteView['status']
  /** The seller's gapless proforma number (COMMERCE.md §12); `null` until issued. */
  number: string | null
  seller: SellerIdentityVM
  buyer: {
    name: string | null
    organisation: string | null
    taxId: string | null
    poNumber: string | null
  }
  /**
   * A unique line of a proforma is held (`invoice`) until `heldUntil`. On a retailer's quote
   * `unitPrice` is the trade price, beside the list price it started from (`retailUnitPrice`).
   */
  lines: readonly (IssuedLineVM & {
    heldUntil: IsoDateTime | null
    retailUnitPrice: Money | null
  })[]
  /** `null` while staff prepare a requested quote. */
  totals: TotalsVM | null
  validUntil: IsoDateTime | null
  pdf: string | null
  /** "Payment must be received and confirmed before an order is considered complete." */
  terms: readonly MessageVM[]
  /** An approved retailer's quote: the tier and minimum it was issued at; `null` otherwise. */
  trade: QuoteTradeVM | null
  /** Accepted: the payment link's page. */
  pay: { href: string } | null
  /** `null` unless issued and valid. The component adds an idempotency key. */
  intents: { accept: Omit<QuoteAcceptRequest, 'idempotencyKey'> } | null
  seo: SeoVM
}
