/**
 * @contract C2 — view models: the bag · owner: ARC · consumers: WEB, UXG, UXE, DOM
 *
 * The cart page and the drawer share one VM (DESIGN-SYSTEM.md §2). A cart never reserves —
 * only checkout does (COMMERCE.md §5) — and it is priced again for the ship-to market on
 * every read. A line that cannot be sold as it stands says why (C6 `LineProblem`) and
 * offers a way out; it never vanishes. One group per seller of record: a bag mixing
 * Singapore and Jakarta stock shows two checkouts rather than one cross-entity order. The
 * edge cases of EXPERIENCE-SHOP.md §7 are states of this VM, each with a fixture. Every
 * figure is display; the intents carry line ids, seller ids and lines of ids only.
 */
import type {
  CartRemoveLineRequest,
  CartUpdateLineRequest,
  CheckoutStartRequest,
  GiftCardDelivery,
  GiftWrapTarget,
  LineProblem,
  Notice,
  ProblemOf,
} from '@engine/domain/api'

import type { CardVM, RailVM } from '../cards'
import type {
  LineIntent,
  LinkVM,
  MessageVM,
  Money,
  PriceVM,
  SellerIdentityVM,
  SeoVM,
  Streamed,
} from '../common'
import type { AppliedCodeVM, ItemRefVM, MarketVM, OptionLabelVM, TotalsVM } from '../commerce'

/** What a line is: a product, a gift wrap (for the order or one line — and it says which), a gift card. */
export type CartLineRoleVM =
  | { kind: 'product' }
  | { kind: 'giftWrap'; wraps: GiftWrapTarget }
  | { kind: 'giftCard'; delivery: GiftCardDelivery }

/** The designed way out of a line's problem. */
export type LineRemedyVM =
  /** Acrylic instead of glass (glass is Bali-only): add this line, remove the old one. */
  | { kind: 'swap'; label: string; line: LineIntent; price: PriceVM | null }
  /** A unique item someone else is buying: "check back in 15 minutes", or be told (C10 `wantList`). */
  | { kind: 'wantList'; href: string }
  /** Not sellable here at all (export, price on request): ask instead. */
  | { kind: 'enquire'; href: string }

export type CartLineVM = {
  lineId: string
  role: CartLineRoleVM
  item: ItemRefVM
  options: readonly OptionLabelVM[]
  quantity: number
  /** 1 for a unique item or an edition unit; what is on hand for counted stock; `null` unbounded. */
  maxQuantity: number | null
  /** `null` when the line cannot be priced for this market — `problems` says why. */
  unitPrice: PriceVM | null
  subtotal: Money | null
  /** This line's promise for the destination: "Made to order, ships in 3–5 days". */
  delivery: readonly MessageVM[]
  problems: readonly LineProblem[]
  remedy: LineRemedyVM | null
  intents: {
    /** Plus the quantity the visitor picks. */
    update: Omit<CartUpdateLineRequest, 'quantity'>
    remove: CartRemoveLineRequest
  }
}

/** One seller's share of the bag — the unit a checkout starts from. */
export type CartCheckoutVM = {
  seller: SellerIdentityVM
  lineIds: readonly string[]
  totals: TotalsVM
  /** Mixed fulfilment (stocked, made to order, pickup) promises each shipment separately. */
  shipments: readonly { lineIds: readonly string[]; promise: readonly MessageVM[] }[]
  start: CheckoutStartRequest
}

export type CartVM = {
  surface: 'cart'
  market: MarketVM
  lines: readonly CartLineVM[]
  checkouts: readonly CartCheckoutVM[]
  codes: readonly AppliedCodeVM[]
  /**
   * The voucher field Indonesian shoppers expect; `null` when neither `commerce.discounts`
   * nor `commerce.giftCards` is on. The last failure is kept for the no-JavaScript
   * post-back, each reason worded to instruct (minimum spend says by how much).
   */
  codeEntry: {
    accepts: readonly ('discount' | 'gift-card')[]
    error: ProblemOf<'code-invalid'> | null
  } | null
  /** `commerce.giftWrap`: a note, prices hidden on the slip, and wrap as a priced line. */
  giftOptions: {
    note: string | null
    hidePrices: boolean
    wrap: { line: LineIntent; price: PriceVM } | null
  } | null
  /** The free-shipping bar, recomputed in the market's currency after a ship-to change. */
  freeShipping: { threshold: Money; remaining: Money; percent: number } | null
  /** What the buyer must see: the bag re-priced into rupiah, a line that changed, a code removed. */
  notices: readonly Notice[]
  /** A frame for an unframed print, postcard add-ons; `null` when there is nothing to suggest. */
  upsells: Streamed<readonly CardVM[]> | null
  /** An empty bag is never a dead end. */
  empty: { links: readonly LinkVM[]; rail: Streamed<RailVM> | null } | null
  seo: SeoVM
}
