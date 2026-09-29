/**
 * @contract C8 State machines — domain event names and the outbox record · owner: ARC
 * Entry `@engine/domain/events`.
 *
 * Every transition emits one named domain event, written to the outbox (`domain_events`)
 * in the same transaction as the change and dispatched at least once afterwards — to email and
 * WhatsApp (NTF), analytics (SEO), sister sync (SIS) and cache invalidation (COMMERCE.md §6, §13;
 * ANALYTICS.md §1). A rolled-back transaction sends nothing; a crash after commit loses nothing.
 *
 * Names are `object.verb`, past tense, and — like C11 — are added to, never renamed. They never
 * reuse a C11 beacon name (`offer.submitted` is the browser's; the stored offer is
 * `offer.received`), so one fact is never counted twice; C11 asserts the two sets are disjoint.
 */
import type { AvailabilityDomainEvent } from '../availability/machine'
import type { OfferDomainEvent } from '../offer/machine'
import type { OrderDomainEvent } from '../order/machine'
import type { PaymentDomainEvent } from '../payment/machine'
import type { EXPIRING_NOTICE_EVENTS, ReservationDomainEvent } from '../reservations/machine'
import type { RetailerDomainEvent } from '../retailers/machine'
import type { RetailerShopType } from './retailers'
import type { JsonValue } from './scalars'
import type { Assert, Equals } from './type-assertions'

/** Domain events no transition emits: a refusal, a scheduled reminder, a request received. */
export type NoticeDomainEvent =
  /** reserve() returned a conflict: someone else was first (ANALYTICS.md §2). */
  | 'reservation.conflicted'
  /**
   * Revenue reversed (C11): emitted beside `payment.refunded` / `payment.partiallyRefunded` only
   * for the attempt that paid the order — a late or duplicate payment given back reverses nothing.
   */
  | 'order.refunded'
  | 'order.partiallyRefunded'
  /**
   * A refund issued at the provider, not asked for in the admin, on the attempt that paid the
   * order: the order stands and its item stays sold until staff cancel it or accept a return.
   */
  | 'order.refundedAtProvider'
  /**
   * Ahead of the end, once per reservation or counter (COMMERCE.md §6): `hold.expiring` from
   * ReservationService.noticeExpiring(), `offer.counterExpiring` from the offer sweep.
   */
  | 'hold.expiring'
  | 'offer.counterExpiring'
  /** C6 records, stored — never merely forwarded — and put on the staff desk. */
  | 'priceRequest.received'
  | 'holdRequest.received'
  | 'enquiry.received'
  | 'consignment.received'
  | 'appointment.booked'
  | 'appointment.rescheduled'
  | 'appointment.cancelled'
  | 'returnRequest.received'
  | 'quote.requested'
  | 'proforma.issued'
  /** Staff issued a retailer's quote below its minimum (C5 `TradeMinimumWaiver`): the audit. */
  | 'quote.minimumWaived'
  /**
   * An application from an address whose standing it does not change — waiting on staff, or
   * already a partner (C6 `RetailerApplicationReceipt`): NTF reads the standing at dispatch and
   * sends the status link again, a sign-in reminder, or a partner's unused set-password link
   * anew — within `RETAILER_APPLICATION_EMAIL_LIMIT`.
   */
  | 'retailer.applicationRepeated'
  /**
   * A want list's life (D39, C6 `./want-lists`): asked for — an address's, whose confirmation NTF
   * emails; asked for again by a holder already watching its subject (NTF sends what applies,
   * within `WANT_LIST_EMAIL_LIMIT`); started — confirmed, or saved to an account; stopped, and so
   * erased.
   */
  | 'wantList.requested'
  | 'wantList.repeated'
  | 'wantList.started'
  | 'wantList.stopped'

export type DomainEventName =
  | OrderDomainEvent
  | PaymentDomainEvent
  | ReservationDomainEvent
  | OfferDomainEvent
  | AvailabilityDomainEvent
  | RetailerDomainEvent
  | NoticeDomainEvent

export type AggregateType =
  | 'order'
  | 'payment-attempt'
  | 'reservation'
  | 'offer'
  | 'product'
  | 'price-request'
  | 'hold-request'
  | 'enquiry'
  | 'consignment'
  | 'appointment'
  | 'return'
  | 'quote'
  /** A retail partner: its customer record (D31). */
  | 'retailer'
  /** A saved search or an item alert (D39). */
  | 'want-list'

/** The records an event is about, by database id; a consumer loads what it needs. */
export type DomainEventRefs = {
  readonly orderId?: number
  readonly attemptId?: number
  readonly reservationId?: number
  readonly productId?: number
  readonly offerId?: number
  readonly customerId?: number
}

type OfShopType = { readonly shopType: RetailerShopType }

/**
 * The facts a `retailer.*` row carries, typed: the kind of business, the tiers, how long staff
 * took — never the application's answers (its name, NPWP, address or contact), which stay on the
 * customer record for a consumer to load by `aggregate.id` (NTF, to write the email).
 */
export type RetailerEventData = {
  readonly 'retailer.applied': OfShopType
  readonly 'retailer.reapplied': OfShopType
  readonly 'retailer.applicationRepeated': Record<never, never>
  readonly 'retailer.approved': OfShopType & {
    readonly tierId: string
    readonly decisionHours: number
  }
  readonly 'retailer.declined': OfShopType & { readonly decisionHours: number }
  readonly 'retailer.tierChanged': { readonly fromTierId: string; readonly toTierId: string }
  readonly 'retailer.partnershipEnded': OfShopType
}

type OfWantList = { readonly subject: 'listing' | 'like'; readonly holder: 'account' | 'email' }

/**
 * The facts a `wantList.*` row carries: what kind of subject and who holds it — never the address
 * or the query, which stay on the list for a consumer to load by `aggregate.id` (NTF, to write the
 * email) until the list is erased.
 */
export type WantListEventData = {
  readonly 'wantList.requested': OfWantList
  readonly 'wantList.repeated': OfWantList
  readonly 'wantList.started': OfWantList
  readonly 'wantList.stopped': OfWantList
}

/** Event-specific facts. Ids and categories only — no email, phone or address (no PII). */
type EventData<N extends DomainEventName> = N extends keyof RetailerEventData
  ? RetailerEventData[N]
  : N extends keyof WantListEventData
    ? WantListEventData[N]
    : { readonly [key: string]: JsonValue }

/** One outbox row, one per name. Consumers dedupe on `id`: dispatch is at least once. */
export type DomainEvent<N extends DomainEventName = DomainEventName> = N extends unknown
  ? {
      readonly id: string
      readonly name: N
      readonly occurredAt: Date
      readonly aggregate: { readonly type: AggregateType; readonly id: number }
      readonly refs: DomainEventRefs
      readonly data: EventData<N>
    }
  : never

/**
 * The names no event may carry, in the outbox or in C11's beacons: a person's contact, their
 * name, a business's name, or a tax number (a sole trader's NPWP can be their NIK).
 */
export type PiiKey =
  | 'email'
  | 'phone'
  | 'whatsapp'
  | 'name'
  | 'fullName'
  | 'businessName'
  | 'address'
  | 'ip'
  | 'npwp'
  | 'nik'
  | 'taxNumber'
  | 'taxId'
/**
 * Nor a credential: a row is kept and replayed, so a token in it would be a link anyone reading
 * the outbox could open. A consumer derives the token it needs from the row's ids (C6 `links`).
 */
export type CredentialKey = 'token' | `${string}Token` | 'secret' | `${string}Secret` | 'nonce'
type AllTrue<R> = false extends R[keyof R] ? false : true
/** `true` when no key of `T`, at any depth, is a `PiiKey` or a `CredentialKey`. */
export type IsPiiFree<T> = T extends readonly (infer E)[]
  ? IsPiiFree<E>
  : T extends object
    ? [Extract<keyof T, PiiKey | CredentialKey>] extends [never]
      ? AllTrue<{ [K in keyof T]-?: IsPiiFree<T[K]> }>
      : false
    : true

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

// The events ANALYTICS.md §2 says come from the domain all exist here.
type FromTheDomain =
  | 'order.paid'
  | 'order.refunded'
  | 'offer.accepted'
  | 'hold.granted'
  | 'hold.expired'
  | 'reservation.conflicted'
type _AnalyticsNamesExist = Assert<Equals<Exclude<FromTheDomain, DomainEventName>, never>>
type ExpiringNotice = (typeof EXPIRING_NOTICE_EVENTS)[keyof typeof EXPIRING_NOTICE_EVENTS]
type _ExpiringNoticesAreNamed = Assert<Equals<Exclude<ExpiringNotice, DomainEventName>, never>>
// Every `retailer.*` event has its typed facts, and they name no one.
type _RetailerDataCoversTheEvents = Assert<
  Equals<keyof RetailerEventData, Extract<DomainEventName, `retailer.${string}`>>
>
type _RetailerDataIsPiiFree = Assert<IsPiiFree<RetailerEventData>>
type _WantListDataCoversTheEvents = Assert<
  Equals<keyof WantListEventData, Extract<DomainEventName, `wantList.${string}`>>
>
type _WantListDataIsPiiFree = Assert<IsPiiFree<WantListEventData>>
type _TokenRejected = Assert<
  // @ts-expect-error — a link's token is a credential: NTF derives it, the row never carries it
  IsPiiFree<WantListEventData['wantList.requested'] & { readonly accessToken: string }>
>
type _NpwpRejected = Assert<
  // @ts-expect-error — a tax number is personal data: it never enters the outbox
  IsPiiFree<RetailerEventData['retailer.applied'] & { readonly npwp: string }>
>
// A row's facts follow its name.
type _DataFollowsTheName = Assert<
  Equals<DomainEvent<'retailer.tierChanged'>['data'], RetailerEventData['retailer.tierChanged']>
>
