/**
 * @contract C8 State machines — domain event names and the outbox record · owner: ARC
 * Entry `@engine/domain/events`.
 *
 * Every transition emits one named domain event, written to the outbox (`engine.domain_events`)
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
import type { ReservationDomainEvent } from '../reservations/machine'
import type { JsonValue } from './scalars'
import type { Assert, Equals } from './type-assertions'

/** Domain events no transition emits: a refusal, a scheduled reminder, a request received. */
export type NoticeDomainEvent =
  /** reserve() returned a conflict: someone else was first (ANALYTICS.md §2). */
  | 'reservation.conflicted'
  /** From the sweeper, ahead of the end (COMMERCE.md §6). */
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

export type DomainEventName =
  | OrderDomainEvent
  | PaymentDomainEvent
  | ReservationDomainEvent
  | OfferDomainEvent
  | AvailabilityDomainEvent
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

/** The records an event is about, by database id; a consumer loads what it needs. */
export type DomainEventRefs = {
  readonly orderId?: number
  readonly attemptId?: number
  readonly reservationId?: number
  readonly productId?: number
  readonly offerId?: number
  readonly customerId?: number
}

/** One outbox row. Consumers dedupe on `id`: dispatch is at least once. */
export type DomainEvent<N extends DomainEventName = DomainEventName> = {
  readonly id: string
  readonly name: N
  readonly occurredAt: Date
  readonly aggregate: { readonly type: AggregateType; readonly id: number }
  readonly refs: DomainEventRefs
  /** Event-specific facts. Ids and categories only — no email, phone or address (no PII). */
  readonly data: { readonly [key: string]: JsonValue }
}

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
