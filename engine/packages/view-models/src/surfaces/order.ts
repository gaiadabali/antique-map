/**
 * @contract C2 — view models: the order and guest order lookup · owner: ARC · consumers: WEB, UXG, UXE, NTF
 *
 * One `OrderVM` for the confirmation and the account's order detail (DESIGN-SYSTEM.md §2).
 * An order number is never a credential (C6): the page opens only for the signed-in buyer or
 * with the order-access cookie a lookup, the confirmation or an emailed access link sets (C13
 * `ORDER_ACCESS`) — never with a token in its URL (C10 `order` is `sensitive`) — and `access`
 * says which; the number alone reveals nothing, and a wrong token answers like no order. Lines are the order's snapshots: title, image and price as sold, whatever
 * changed since. The payment-pending state is the most important page in an Indonesian
 * checkout: the exact amount, the VA number to copy, per-bank steps (the app's message keys
 * for the method), the true countdown, the daily-cap warning, where the "paid" news will
 * arrive, and a poll that switches the page to Paid by itself.
 */
import type { PaymentStatusRequest, WireSessionResult } from '@engine/domain/api'
import type { OrderStatus } from '@engine/domain/machines/order'
import type { PaymentMethodId } from '@engine/domain/machines/payment'

import type { IsoDate, IsoDateTime, MessageVM, Money, SellerIdentityVM, SeoVM } from '../common'
import type {
  DocumentVM,
  ItemRefVM,
  OptionLabelVM,
  OrderSummaryVM,
  ShipmentVM,
  TotalsVM,
} from '../commerce'
import type { LocationSummaryVM } from './editorial'

export type OrderLineVM = {
  lineId: string
  item: ItemRefVM
  options: readonly OptionLabelVM[]
  quantity: number
  unitPrice: Money
  total: Money
  /** A return can be requested on every line within the seller's policy (COMPLIANCE.md §6). */
  returnable: boolean
}

export type OrderDeliveryVM =
  | { kind: 'ship'; recipient: string; address: readonly string[]; deliverBefore: IsoDate | null }
  /** A code (also shown as a QR), the "ready" notice, hours, a map and who may collect. */
  | {
      kind: 'pickup'
      location: LocationSummaryVM
      code: string | null
      ready: boolean
      collector: string | null
    }
  /** Nothing ships: a digital gift card. */
  | { kind: 'none' }

export type OrderPaymentVM =
  /** Waiting for the money: a VA or a transfer to make, a QR to scan, a redirect not finished. */
  | {
      state: 'pending'
      method: PaymentMethodId
      amount: Money
      session: WireSessionResult
      expiresAt: IsoDateTime | null
      /** A large VA transfer can exceed the buyer's own bank's daily cap: say so before it fails. */
      dailyCapWarning: boolean
      /**
       * Polled (a POST) until the page switches to Paid, scoped to how the page was opened: the
       * checkout it came from, or the order by the session or this browser's order-access
       * cookie — a lookupToken here came from that cookie, never from a URL.
       */
      poll: PaymentStatusRequest
    }
  | { state: 'paid'; method: PaymentMethodId; amount: Money; paidAt: IsoDateTime }
  /** Failed, expired or a cancelled redirect: another method, the bag kept. */
  | { state: 'retry'; reason: 'failed' | 'expired' | 'cancelled'; retryHref: string }
  /** Settled off-platform — on WhatsApp, in the showroom — in the editor's own words (KOI). */
  | { state: 'manual'; note: string }
  | { state: 'refunded'; refunded: Money; partial: boolean }

export type OrderVM = {
  surface: 'order'
  number: string
  placedAt: IsoDateTime
  /** How the viewer proved the order is theirs (C6 `OrderAccess`). */
  access: 'account' | 'lookup'
  /** Straight after checkout or a payment link, or later from the account or a lookup. */
  context: 'confirmation' | 'detail'
  status: OrderStatus
  seller: SellerIdentityVM
  lines: readonly OrderLineVM[]
  totals: TotalsVM
  delivery: OrderDeliveryVM
  shipments: readonly ShipmentVM[]
  payment: OrderPaymentVM
  documents: readonly DocumentVM[]
  /** What happens next, in order; a transfer's instructions are the editor's words in `payment`. */
  nextSteps: readonly MessageVM[]
  /** Where updates arrive: "we'll WhatsApp you when it's paid". */
  updates: 'whatsapp' | 'email'
  /** `null` once no line is returnable. */
  returns: { href: string } | null
  seo: SeoVM
}

/**
 * Guest tracking by order number plus the email or WhatsApp number the buyer used — the pair
 * is the credential, and it is rate-limited. The form is prefilled after an attempt so
 * nothing is typed twice. A wrong number and a wrong contact answer the same `notFound`
 * (C6), so nothing can be enumerated; a found order links to its page, which the order-access
 * cookie `orderLookup.find` set opens (C13 `ORDER_ACCESS`). A guest never reorders.
 */
export type OrderLookupVM = {
  surface: 'orderLookup'
  form: { orderNumber: string | null; channel: 'email' | 'whatsapp'; contact: string | null }
  result:
    | { kind: 'found'; order: OrderSummaryVM<null>; shipments: readonly ShipmentVM[] }
    | { kind: 'notFound' }
    | { kind: 'rateLimited'; retryAfterSeconds: number }
    | null
  seo: SeoVM
}
