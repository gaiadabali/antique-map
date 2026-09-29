/**
 * @contract C11 Analytics events — from the domain · owner: ARC · via `@engine/analytics/events`
 *
 * The domain events analytics consumes, from the outbox only (ANALYTICS.md §2, "from the domain"),
 * forwarded by the dispatcher after commit, so a fact that rolled back never reaches a dashboard
 * or an ad platform. What the business counts — revenue, and the leads a gallery lives on — is
 * counted here: a record is stored or it is not, which a blocked script, a failed post or a
 * reload never changes. The page's own lead events (`./beacon`) feed GA4's `generate_lead`, Meta's
 * `Lead` and the funnel's steps; never the Leads dashboard's counts.
 */
import type { EnquiryTopic, RetailerShopType } from '@engine/domain/api'
import type { DomainEventName, IsPiiFree } from '@engine/domain/events'
import type { Money } from '@engine/domain/money'

/**
 * `order.refunded` and `order.partiallyRefunded` come only for the attempt that paid the order: a
 * late or duplicate payment given back reverses no revenue, so it never reaches a dashboard.
 */
export const DOMAIN_ANALYTICS_EVENTS = [
  'order.paid',
  'order.refunded',
  // GA4's refund takes a partial value too.
  'order.partiallyRefunded',
  'offer.accepted',
  'hold.granted',
  'hold.expired',
  'reservation.conflicted',
  // The Leads dashboard's counts (ANALYTICS.md §3): every request as it is stored and put on the
  // staff desk, the time to staff's first reply measured from it.
  'offer.received',
  'holdRequest.received',
  'priceRequest.received',
  'enquiry.received',
  'consignment.received',
  'appointment.booked',
  // A quote asked for — a partner's brief or reorder on the shop, an institution's on the gallery:
  // the B2B lead the Leads dashboard counts beside the gallery's.
  'quote.requested',
  // Demand the stock does not meet (ANALYTICS.md §3): the want lists kept — an address's once it
  // confirmed, an account's once saved (D39).
  'wantList.started',
  // The shop's partner funnel (D31): applications — first and again, the Leads dashboard's count
  // (never the beacon) — and staff's decisions, with how long they took.
  'retailer.applied',
  'retailer.reapplied',
  'retailer.approved',
  'retailer.declined',
] as const satisfies readonly DomainEventName[]
export type DomainAnalyticsEvent = (typeof DOMAIN_ANALYTICS_EVENTS)[number]

type NoProps = Record<never, never>
/** A product by its public id — the number in its URL. */
type OnItem = { readonly productId: number }
type RetailerApplication = { readonly retailerId: number; readonly shopType: RetailerShopType }
/** Staff's answer to an application, with the hours it took — the Leads dashboard's reply time. */
type RetailerDecision = {
  readonly retailerId: number
  readonly shopType: RetailerShopType
  readonly decisionHours: number
}

/** Values in the charge currency, with the order's FX snapshot kept server-side (never recomputed). */
export type DomainAnalyticsProps = {
  readonly 'order.paid': {
    readonly orderId: number
    readonly value: Money
    readonly lineCount: number
  }
  readonly 'order.refunded': { readonly orderId: number; readonly value: Money }
  readonly 'order.partiallyRefunded': { readonly orderId: number; readonly value: Money }
  readonly 'offer.accepted': OnItem
  readonly 'hold.granted': OnItem
  readonly 'hold.expired': OnItem
  readonly 'reservation.conflicted': OnItem & { readonly state: 'held' | 'sold' }
  readonly 'offer.received': OnItem
  readonly 'holdRequest.received': OnItem
  readonly 'priceRequest.received': OnItem
  readonly 'enquiry.received': { readonly topic: EnquiryTopic; readonly productId: number | null }
  readonly 'consignment.received': NoProps
  readonly 'appointment.booked': { readonly locationId: string }
  /** Who asked — an approved partner or a guest — and whether it came as lines or a brief. */
  readonly 'quote.requested': {
    readonly from: 'partner' | 'guest'
    readonly as: 'lines' | 'brief' | 'reorder'
  }
  /**
   * A saved search or an item alert, and who keeps it — never the query or the address. `kind` is
   * C8's `subject` in C11's words, as `alert.created` has them: `listing` is `want-list`, `like` is
   * `item-alert`.
   */
  readonly 'wantList.started': {
    readonly kind: 'want-list' | 'item-alert'
    readonly holder: 'account' | 'email'
  }
  /** A retail partner by its customer id and kind of shop — never its name, NPWP or contact. */
  readonly 'retailer.applied': RetailerApplication
  readonly 'retailer.reapplied': RetailerApplication
  readonly 'retailer.approved': RetailerDecision
  readonly 'retailer.declined': RetailerDecision
}

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type Assert<T extends true> = T
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

// Every domain event analytics consumes has its props, and nothing else has.
type _DomainPropsCoverTheList = Assert<Equals<keyof DomainAnalyticsProps, DomainAnalyticsEvent>>
type _DomainPropsArePiiFree = Assert<IsPiiFree<DomainAnalyticsProps>>
