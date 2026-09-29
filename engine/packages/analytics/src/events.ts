/**
 * @contract C11 Analytics events · owner: ARC · entry `@engine/analytics/events`
 *
 * The event taxonomy (ANALYTICS.md §2). Names are `object.verb`, past tense: add to the list,
 * never rename one — dashboards depend on the string. Two sources, never mixed:
 * - beacon events, sent by the page to `POST /api/x/collect` (cookieless until consent), with
 *   props the page's own view model holds, stamped by collect with what only the server knows
 *   (`./events/beacon`);
 * - domain events, forwarded only by the outbox dispatcher after commit, so revenue that rolled
 *   back never reaches a dashboard or an ad platform (ANALYTICS.md §1), and what the business
 *   counts — revenue and leads — is counted from them (`./events/domain`).
 * The consented GA4 and Meta tags map both (`./events/platforms`). No PII in any event — ids and
 * categories only; each part proves no prop is named for an email, a phone number, a name, an
 * address or a tax number.
 */
import type { DomainEventName } from '@engine/domain/events'

import type { BeaconEventName } from './events/beacon'
import type { DomainAnalyticsEvent } from './events/domain'

/** C1's catalogue vocabularies, imported: each list has one home (`schema/catalogue`). */
export type { InventoryModel, ProductKind } from '@engine/config/schema'

export * from './events/beacon'
export * from './events/domain'
export * from './events/platforms'

export type AnalyticsEventName = BeaconEventName | DomainAnalyticsEvent

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type Assert<T extends true> = T
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

// One fact is never counted twice: no beacon event shares a name with a domain event.
type _BeaconAndDomainDisjoint = Assert<Equals<Extract<BeaconEventName, DomainEventName>, never>>
