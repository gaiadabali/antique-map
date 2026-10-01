/**
 * @contract C2 — view models: the order and guest order lookup · owner: ARC · consumers: WEB, UXG, UXE, NTF
 *
 * One `OrderVM` for the confirmation and the account's order detail (DESIGN-SYSTEM.md §2).
 * An order number is never a credential (C6): the page opens only for the signed-in buyer or
 * with the order-access cookie a lookup, the confirmation or an emailed access link sets (C13
 * `ORDER_ACCESS`) — never with a token in its URL (C10 `order` is `sensitive`) — and `access`
 * says which; the number alone reveals nothing, and a wrong token answers like no order. Lines
 * are the order's snapshots (C6 `OrderedLineView`): title, image, options and price as sold,
 * whatever changed since; the status is the buyer's (C6 `BuyerOrderStatus`), never a dispute.
 * The payment-pending state is the most important page in an Indonesian
 * checkout: the exact amount, the VA number to copy, per-bank steps (the app's message keys
 * for the method), the true countdown, the daily-cap warning, where the "paid" news will
 * arrive, and a poll that switches the page to Paid by itself.
 */
import type {
  BuyerOrderStatus,
  FieldError,
  OrderAccess,
  PaymentStatusRequest,
  WireSessionResult,
} from '@engine/domain/api'
import type { PaymentFailureClass, PaymentMethodId } from '@engine/domain/machines/payment'

import type {
  IsoDate,
  IsoDateTime,
  MessageVM,
  Money,
  ProductPublicId,
  SellerIdentityVM,
  SeoVM,
  VariantId,
} from '../common'
import type {
  DocumentVM,
  ItemRefVM,
  OptionLabelVM,
  OrderSummaryVM,
  ShipmentVM,
  TotalsVM,
} from '../commerce'
import type { LocationSummaryVM } from './editorial'
import type { FormPostVM } from './form-fields'

/**
 * C6's `OrderedLineView` as the page reads it: `item` from the snapshot — the image rebuilt from
 * its asset id, the link only while the product is published — and `options` the labels as sold.
 */
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

/**
 * The payment poll the order page posts (C6 `payment.status`): scoped to the checkout it came
 * from, or to the order by the session or this browser's order-access cookie — never by a
 * lookupToken, which stays in its cookie and so never enters the page's HTML (C6 `OrderAccess`),
 * and never by a pay link's token, which is the pay page's own: the order page opens by the
 * session or that cookie (C13 `ORDER_ACCESS`), so it needs neither.
 */
export type PaymentPollVM = {
  attemptId: string
  scope:
    | Extract<PaymentStatusRequest['scope'], { kind: 'checkout' }>
    | { kind: 'order'; access: Exclude<OrderAccess, { kind: 'lookup' }> }
}

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
      /** Polled (a POST) until the page switches to Paid, scoped to how the page was opened. */
      poll: PaymentPollVM
    }
  | { state: 'paid'; method: PaymentMethodId; amount: Money; paidAt: IsoDateTime }
  /**
   * Declined, unavailable, failed, expired or a cancelled redirect: another method, the bag kept.
   * `reason` is C7's class, which the page words and `payment.failed` reports (C11).
   */
  | { state: 'retry'; method: PaymentMethodId; reason: PaymentFailureClass; retryHref: string }
  /** Settled off-platform — on WhatsApp, in the showroom — in the editor's own words (KOI). */
  | { state: 'manual'; note: string }
  /**
   * A staff-issued invoice not paid yet (v1.5, D50): the order exists from issue, held for this
   * buyer until `dueAt` (D45), and is paid on its own pay page (`payHref`, C13's capability
   * address) — this page polls nothing until a payment starts there.
   */
  | { state: 'invoice'; payHref: string; dueAt: IsoDateTime }
  | { state: 'refunded'; refunded: Money; partial: boolean }

/**
 * What the consented GA4 `purchase` and Meta `Purchase` tags send (ANALYTICS.md §2): the order's
 * charge-currency figures — `value` its grand total, as `order.paid` reports it — never an
 * estimate. The tag converts minor units by the currency's exponent (C11).
 */
export type ConversionVM = {
  transactionId: string
  value: Money
  tax: Money
  shipping: Money | null
  items: readonly {
    productId: ProductPublicId
    variantId: VariantId | null
    quantity: number
    unitPrice: Money
  }[]
}

export type OrderVM = {
  surface: 'order'
  number: string
  placedAt: IsoDateTime
  /** How the viewer proved the order is theirs (C6 `OrderAccess`). */
  access: 'account' | 'lookup'
  /** Straight after checkout or a payment link, or later from the account or a lookup. */
  context: 'confirmation' | 'detail'
  status: BuyerOrderStatus
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
  /**
   * Set only on a paid order's confirmation (`context: 'confirmation'`) — so a pending or a lapsed
   * order never reports revenue, and one reopened later never reports it again; `null` otherwise.
   * A payment that lands while the page polls: the poll's answer carries no conversion, so on its
   * `next: 'paid'` the page renders again from its loader (`router.refresh()`), which sets it.
   * `transactionId` is GA4's `transaction_id` and Meta's `eventID`, so each dedupes a reload.
   */
  conversion: ConversionVM | null
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
  /**
   * C6 `orderLookup.find` as a form: `orderNumber`, `email` and `whatsapp`, named for the request
   * (either contact field is enough), refilled after an attempt.
   */
  form: FormPostVM
  result:
    | { kind: 'found'; order: OrderSummaryVM<null>; shipments: readonly ShipmentVM[] }
    | { kind: 'notFound' }
    | { kind: 'rateLimited'; retryAfterSeconds: number }
    /** No contact given (reported on `email`), or one malformed: every failing field at once. */
    | { kind: 'invalid'; fields: readonly FieldError[] }
    | null
  seo: SeoVM
}
