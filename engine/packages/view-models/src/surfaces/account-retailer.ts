/**
 * @contract C2 — view models: the retailer's account · owner: ARC · consumers: WEB, UXE, DOM
 *
 * Where retailers are the only accounts (D31, `accounts.retailers`): an application staff
 * approve, then a retailer area with the trade terms as data (D32) — a trade price tier and
 * a minimum order — and orders by quote through the order builder, paid by bank transfer or
 * a pay link. There is no wholesale cart. A retailer's standing is C1's `RetailerStatus`, and
 * only `approved` carries terms: a pending or declined applicant's view model has no field a
 * trade price could sit in (`retailer-check.ts`), and its loader reads retail prices alone.
 * The password comes with approval, so a signed-in retailer who is not approved is a former
 * partner — its partnership ended (`declined`), or it has applied again (`applied`).
 */
import type { QuoteView } from '@engine/domain/api'

import type { IsoDateTime, LinkVM, MessageVM, Money } from '../common'
import type { DocumentVM } from '../commerce'

/** The smallest order a tier accepts — C5's `TradeMinimum`, as the programme states it. */
export type MinimumOrderVM =
  /** Goods at the prices paid, before shipping and tax, in the currency quoted to retailers. */
  | { kind: 'amount'; amount: Money }
  /** "20 pieces per design, mixed sizes allowed". */
  | { kind: 'piecesPerDesign'; pieces: number; mixedSizes: boolean }

/**
 * A trade price tier (C1 `commerce.trade`, C5 `TradeTerms`): `id` is its `tierId`, `label`
 * what the page calls it, `discountBps` the discount off the market list (4000 is 40 %), which
 * the page formats as a percentage. The prices themselves are on the quotes.
 */
export type TradeTierVM = { id: string; label: string; discountBps: number }

/** The terms an approved retailer works to, assigned by staff: data, never copy. */
export type TradeTermsVM = {
  tier: TradeTierVM
  minimum: MinimumOrderVM
  /** Orders are quote requests (C6 `quote.request`), paid by transfer or a staff-sent pay link. */
  ordering: { request: { href: string }; payment: readonly ('bankTransfer' | 'payLink')[] }
  /** "Counter stands and signage, on request" — the programme's extras, as content. */
  extras: readonly { label: string; value: string }[]
  /** The signed terms or the price list as a document, when there is one. */
  document: DocumentVM | null
}

/** A retailer's standing (C1 `RETAILER_STATUSES`); only `approved` carries terms. */
export type RetailerStandingVM =
  /** Waiting on staff: "Most applications are answered within two working days". */
  | { status: 'applied'; appliedAt: IsoDateTime; reply: MessageVM | null }
  /** Refused, or the partnership ended: said plainly, with a way to talk to someone. */
  | { status: 'declined'; decidedAt: IsoDateTime; note: string | null; contact: LinkVM | null }
  | { status: 'approved'; approvedAt: IsoDateTime; terms: TradeTermsVM }
export type ApprovedRetailerVM = Extract<RetailerStandingVM, { status: 'approved' }>
export type PendingRetailerVM = Exclude<RetailerStandingVM, { status: 'approved' }>

/** A quote in the retailer's list, at their trade prices — opened on the Quote surface. */
export type QuoteSummaryVM = {
  /** The seller's gapless number once issued; `null` while staff prepare it. */
  number: string | null
  status: QuoteView['status']
  requestedAt: IsoDateTime
  validUntil: IsoDateTime | null
  /** `null` until issued. */
  total: Money | null
  href: string
}

/** The sections only an approved retailer has (C10 `ACCOUNT_SECTIONS` `quotes`, `terms`). */
export type RetailerSectionVM =
  | { section: 'terms' }
  | { section: 'quotes'; quotes: readonly QuoteSummaryVM[]; request: { href: string } }
