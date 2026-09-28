/**
 * @contract C2 — view models: the retailer's account · owner: ARC · consumers: WEB, UXE, DOM
 *
 * Where partners are the only accounts (D31, D36, `accounts.retailers`): an application staff
 * approve, then a partner area with the trade terms as data (D32) — a trade price tier and a
 * minimum order — and orders by quote, built in the order builder and paid by bank transfer
 * or a pay link. There is no wholesale cart. A retailer's standing is C1's `RetailerStatus`,
 * and only `approved` signs in: an applicant has no password yet, a declined one never gets
 * one, and an ended partnership is deactivated, its orders staying with the owner (D34). So
 * the area is always an approved partner's; an applicant's standing shows only on the
 * Partnership page, with no field a trade price could sit in, and `ended` shows nowhere
 * (`retailer-check.ts`).
 */
import type { QuoteView } from '@engine/domain/api'

import type { IsoDateTime, LinkVM, MessageVM, Money } from '../common'
import type { DocumentVM } from '../commerce'
import type { FormPostVM } from './form-fields'

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

/**
 * A retailer's standing, as a page shows it (C1 `RETAILER_STATUSES` but `ended`, which no page
 * shows: the partner can no longer sign in, and a new application starts again at `applied`).
 * `approved` is a signed-in partner's, with its terms; the others show on the Partnership page
 * and carry none.
 */
export type RetailerStandingVM =
  /** Waiting on staff: "Most applications are answered within two working days". */
  | { status: 'applied'; appliedAt: IsoDateTime; reply: MessageVM | null }
  /** Refused: said plainly, with a way to talk to someone. */
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

/**
 * A partner's new quote request: a brief — `message` (what it needs, in its words, required)
 * and `neededBy` — posted as C6 `quote.request` with no lines and `contact: null`, its session
 * the contact. Staff build the lines in the order builder (TASKS.md 24.5) and issue the quote
 * at the partner's tier.
 */
export type QuoteBriefVM = FormPostVM

/** The sections only an approved partner has (C10 `ACCOUNT_SECTIONS` `quotes`, `terms`). */
export type RetailerSectionVM =
  | { section: 'terms' }
  | { section: 'quotes'; quotes: readonly QuoteSummaryVM[]; request: QuoteBriefVM }
