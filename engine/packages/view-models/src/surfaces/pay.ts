/**
 * @contract C2 — view models: payment links and quotes · owner: ARC · consumers: WEB, UXG, UXE, DOM
 *
 * `Pay` is the landing page of a staff-sent payment link — an accepted offer, a hold, a
 * proforma, a sale agreed on WhatsApp (PAYMENTS.md §5): the item, the terms, the expiry, the
 * seller's identity and the methods routing allows, never a bare gateway screen; the hold it
 * pays for outlasts the method the buyer picks. `Quote` is a business or institutional
 * quote or proforma (COMMERCE.md §7, EXPERIENCE-SHOP.md §9): lines, validity, the PDF (the
 * only place wire details appear), accept → the payment link. The token in each URL is the
 * capability; the figures are display, and each intent sends back only the token naming them.
 */
import type {
  PayLinkStartRequest,
  QuoteAcceptRequest,
  QuoteView,
  WireSessionResult,
} from '@engine/domain/api'

import type { IsoDateTime, LinkVM, MessageVM, Money, SellerIdentityVM, SeoVM } from '../common'
import type { ItemRefVM, OptionLabelVM, PaymentOptionVM, TotalsVM } from '../commerce'

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
  state: 'open' | 'paid' | 'expired' | 'cancelled'
  seller: SellerIdentityVM
  lines: readonly IssuedLineVM[]
  totals: TotalsVM
  /** When the hold this link pays for ends; a session is never made to outlive it. */
  expiresAt: IsoDateTime
  /** The staff member's note ("As agreed on WhatsApp…"), in their words. */
  note: string | null
  /** What the buyer accepts by paying: the offer's terms, returns, the guarantee. */
  terms: readonly LinkVM[]
  methods: readonly PaymentOptionVM[]
  session: WireSessionResult | null
  order: { number: string; href: string } | null
  /** `null` unless the link is open. The component adds the method and an idempotency key. */
  intents: { start: Omit<PayLinkStartRequest, 'method' | 'idempotencyKey'> } | null
  seo: SeoVM
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
  /** A unique line of a proforma is held (`invoice`) until `heldUntil`. */
  lines: readonly (IssuedLineVM & { heldUntil: IsoDateTime | null })[]
  /** `null` while staff prepare a requested quote. */
  totals: TotalsVM | null
  validUntil: IsoDateTime | null
  pdf: string | null
  /** "Payment must be received and confirmed before an order is considered complete." */
  terms: readonly MessageVM[]
  /** Accepted: the payment link's page. */
  pay: { href: string } | null
  /** `null` unless issued and valid. The component adds an idempotency key. */
  intents: { accept: Omit<QuoteAcceptRequest, 'idempotencyKey'> } | null
  seo: SeoVM
}
