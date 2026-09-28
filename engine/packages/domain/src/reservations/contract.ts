/**
 * @contract C8 State machines — reserve(), the one writer of reservations · owner: ARC
 * Entry `@engine/domain/reservations`.
 *
 * Every channel — web checkout, accepted offer, staff hold, institutional invoice, a manual
 * showroom sale — reserves through this one service, and nothing else writes a reservation
 * (ARCHITECTURE.md §6; COMMERCE.md §4): not an admin form, not a hook, not a sweep of its own. DOM
 * implements it in `reservations/reserve.ts` (TASKS.md 18.1) under the transaction rules of
 * ../contracts/transactions.ts; SCH declares the table, its partial unique index and its checks
 * (../contracts/storage.ts).
 */
import type {
  ConvertResult,
  ExtendResult,
  PerReservation,
  ReleaseOutcome,
  ReleaseReason,
  ReservationIds,
  ReserveAllResult,
  ReserveInput,
  ReserveResult,
  ReverseOutcome,
  ReverseReason,
} from '../contracts/reservation-types'
import type { Duration } from '../contracts/scalars'
import type { DomainTx, SweepResult } from '../contracts/transactions'

export type * from './machine'
export type * from '../contracts/reservation-types'
export type * from '../contracts/transactions'

/** How often reserve() inserts again when the row that blocked it vanished before it was read. */
export const RESERVE_CONFLICT_RETRIES = 3

/**
 * The operations. `tx` is the caller's open transaction (DomainTx): no method opens or commits one
 * of its own, so a reservation, a payment and an order commit together or not at all. Expiry is
 * judged by the database clock, `statement_timestamp()` — never an app server's, and never
 * `now()`, which is the transaction's start and goes stale inside a long one.
 */
export type ReservationService<Tx extends DomainTx = DomainTx> = {
  /**
   * One target. First moves the target's lapsed `active` rows to `expired`, returning their counted
   * quantity to `stock_levels.reserved` and emitting what the sweep would (`*.expired`,
   * `availability.changed`) — so an expired-but-unswept lock never blocks a buyer. Then:
   * - `supersedes`, when it names a live reservation of this target: released as `superseded`.
   * - the same owner already holding the target with the same kind: that row, `reused: true`.
   * - an exclusive target: `INSERT … ON CONFLICT (target_key) WHERE <RESERVATION_ARBITER.where>
   *   DO NOTHING RETURNING id`. No row: read the blocker to say why (held until, or sold); if it
   *   is gone by then, insert again, up to RESERVE_CONFLICT_RETRIES times, then answer `held`
   *   with `heldUntil: null`.
   * - counted stock: `UPDATE stock_levels SET reserved = reserved + $q WHERE variant_id = $v AND
   *   location_id = $l AND on_hand - reserved >= $q` — the row count is the answer — then the row.
   * Never raises a unique violation, a serialization failure or a deadlock into the caller's
   * transaction (READ COMMITTED and the lock order make sure): an aborted transaction would take
   * the caller's payment and order with it. A transaction reserves in ONE call — one target
   * through reserve(), several through reserveAll() — never two, whose order would be the
   * caller's to get wrong.
   */
  reserve(tx: Tx, input: ReserveInput): Promise<ReserveResult>
  /**
   * Several targets, all or nothing: a bag at "Continue to payment", a proforma's lines, a late
   * payment re-reserving its order. Takes rows in the lock order whatever the input order — every
   * reservation row by `target_key`, then every stock row by `(variant_id, location_id)` — so two
   * bags holding the same items in opposite orders cannot deadlock. Runs under a savepoint: on any
   * conflict, `ROLLBACK TO SAVEPOINT` undoes what it took and releases those locks, the caller's
   * transaction stays open, and every conflict is returned. Two inputs for one exclusive target
   * are a programming error (it throws before writing); inputs for one counted target are summed.
   */
  reserveAll(tx: Tx, inputs: readonly [ReserveInput, ...ReserveInput[]]): Promise<ReserveAllResult>
  /**
   * `active → active`, all or nothing: an order's checkout locks stretched to the chosen method's
   * `sessionTtl` plus `lockMarginMinutes`, a hold within `holdMaxHours`. Only ever later: an
   * `until` at or before a row's current end leaves that row as it is. Capped at the row's
   * `created_at` plus `maxLifetime` — measured from creation, so switching method after method
   * cannot keep an item locked for ever. A lapsed row is moved to `expired` (and emits), never
   * brought back: the late path re-reserves instead.
   */
  extend(
    tx: Tx,
    input: {
      readonly reservationIds: ReservationIds
      readonly until: Date
      readonly maxLifetime: Duration
    },
  ): Promise<ExtendResult>
  /** `active → released`, counted quantity back to stock, rows taken in the lock order. */
  release(
    tx: Tx,
    input: { readonly reservationIds: ReservationIds; readonly reason: ReleaseReason },
  ): Promise<PerReservation<ReleaseOutcome>>
  /**
   * `active → converted`, all or nothing, and only while every row is live — the payment-in-time
   * check, made under the rows' locks before any capture (applyPaymentEvent()). Counted stock
   * leaves the building here: `on_hand` and `reserved` both drop by the quantity in one guarded
   * UPDATE (`reserved >= $q AND on_hand >= $q`, exactly one row). A lapsed row means nothing
   * converts, and the caller takes the late path for the whole order: re-reserve and sell, or give
   * the money back — never half an order.
   */
  convert(
    tx: Tx,
    input: { readonly orderId: number; readonly reservationIds: ReservationIds },
  ): Promise<ConvertResult>
  /**
   * `converted → reversed`: an order cancelled after payment, or an accepted return — the item is
   * for sale again. Exclusive targets only, and never for a refund alone (ReverseReason). Counted
   * stock answers `counted-stock`: a returned postcard is a stock adjustment (restock or
   * write-off, an `inventory_movements` row), not a reservation brought back to life.
   */
  reverse(
    tx: Tx,
    input: { readonly reservationIds: ReservationIds; readonly reason: ReverseReason },
  ): Promise<PerReservation<ReverseOutcome>>
  /**
   * The sweep: up to `limit` `active` rows past their end, taken `FOR UPDATE SKIP LOCKED` in
   * `target_key` order, → `expired`; counted quantities back to stock in `(variant_id,
   * location_id)` order; emits exactly what reserve()'s lazy expiry emits. Housekeeping, not
   * correctness: the next reserve() of a target would expire the row anyway.
   */
  expireDue(tx: Tx, limit: number): Promise<SweepResult>
  /**
   * Live reservations whose end is within `lead` → their kind's notice (`EXPIRING_NOTICE_EVENTS`:
   * `hold.expiring`), once each: `expiring_notified_at` is set in the same statement (`WHERE
   * expiring_notified_at IS NULL`), so a rerun sends nothing twice. Kinds with no notice are
   * skipped; the checkout lock's countdown is on the buyer's screen.
   */
  noticeExpiring(
    tx: Tx,
    input: { readonly lead: Duration; readonly limit: number },
  ): Promise<SweepResult>
}
