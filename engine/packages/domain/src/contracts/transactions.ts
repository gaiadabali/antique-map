/**
 * @contract C8 State machines — the domain's write transactions · owner: ARC
 * Entry `@engine/domain/transactions`; its types are re-exported by `@engine/domain/reservations`.
 *
 * Every domain write — reserve() and its operations, applyPaymentEvent(), the checkout steps that
 * commit, the sweeps — runs in a transaction shaped by this file, so a reservation, a payment and
 * an order commit together or not at all, and no two writers deadlock or abort one another by
 * accident (senior-db review of 1.2, tested on PostgreSQL 18.6). DOM implements the rules; SCH
 * declares the tables and indexes they stand on (./storage.ts).
 */
import type { Duration } from './scalars'
import type { Assert } from './type-assertions'

/**
 * The caller's open transaction, in the two forms one Payload transaction has. `req` is Payload's
 * request with `transactionID` set, so every Local API call made with it joins the transaction;
 * `db` is the drizzle transaction bound to that same id (`payload.db.sessions[id].db`), for what
 * the Local API cannot say — `INSERT … ON CONFLICT … DO NOTHING RETURNING`, `SELECT … FOR UPDATE
 * [SKIP LOCKED]`, a guarded `UPDATE`. A write through anything else — a `payload.*` call without
 * this `req`, a pool query — runs on another connection and is not atomic with the rest. DOM
 * instantiates `Req` with `PayloadRequest` and `Db` with the Postgres adapter's transaction; the
 * contract fixes the pairing, not the library types.
 */
export type DomainTx<Req = unknown, Db = unknown> = {
  readonly req: Req & { readonly transactionID: string | number }
  readonly db: Db
}

/**
 * Pinned. Under READ COMMITTED a second insert of a live exclusive target waits for the first,
 * then gets `INSERT 0 0` from `ON CONFLICT … DO NOTHING`; under REPEATABLE READ or SERIALIZABLE
 * the same race raises `could not serialize access` and aborts the caller's transaction, its
 * payment and its order with it. So SCH never sets Payload's `transactionOptions.isolationLevel`,
 * no environment changes `default_transaction_isolation`, and DOM's concurrency suite asserts
 * `current_setting('transaction_isolation')` from inside a domain transaction.
 */
export const DOMAIN_TX_ISOLATION = 'read committed'

/**
 * Set with `SET LOCAL` as a domain transaction begins, so the domain's own limits govern it and no
 * server default can (every one is user-settable; tested on PostgreSQL 18.6):
 * - `lock` — `lock_timeout`, a wait on a row another writer holds; `statement` — `statement_timeout`.
 * - `port` — each provider call made inside a transaction (applyPaymentEvent()'s ports). A port is
 *   called only while every reservation row the transaction holds is one it has NOT written and
 *   that stays live beyond the call: a row it wrote makes another buyer's reserve() of that target
 *   wait for its commit, and a row lapsing mid-call makes their lazy expiry wait on its lock — a
 *   wait that outlasts `lock` whenever the call does, and aborts THEIR transaction. What a call
 *   needs is secured first, in a transaction of its own (applyPaymentEvent(), step 0).
 * - `idleInTransaction` — `idle_in_transaction_session_timeout`. During a provider call the session
 *   sits idle in its transaction, so this outlasts `port` with a margin; a lower server default
 *   would terminate the connection in the middle of every capture.
 * - `transaction` — `transaction_timeout` (PostgreSQL 17+), the whole transaction, ports included.
 *   Like the idle limit it terminates the connection, which the pool replaces.
 *
 * What "reserve() never aborts the caller's transaction" means, exactly: no unique violation, no
 * serialization failure and — the lock order kept — no deadlock is ever raised into it; a conflict
 * is a value. What no code can promise: one of these limits firing, a lost connection, a server
 * restart. Those abort the whole transaction like any infrastructure failure — a webhook answers
 * 5xx and the provider retries; a C6 request answers 503 with `Retry-After`, and its idempotency
 * key, rolled back with the rest, makes the retry safe.
 */
export const DOMAIN_TX_TIMEOUTS = {
  lock: { seconds: 5 },
  statement: { seconds: 15 },
  port: { seconds: 10 },
  idleInTransaction: { seconds: 15 },
  transaction: { seconds: 45 },
} as const satisfies { readonly [limit: string]: Duration }

/**
 * The one order in which every writer takes rows, so no two writers can deadlock. A transaction
 * may skip a step, never return to an earlier one, and within a step takes rows in the key order.
 * It governs every statement that can WAIT: `SELECT … FOR UPDATE`, `UPDATE`, `DELETE`, and an
 * insert that can meet a unique key another transaction is inserting (a dedupe row, a live
 * exclusive reservation). A plain insert of a fresh row waits on nothing and may come anywhere; a
 * plain read takes no lock.
 *
 * - `dedupe` — `idempotency_keys` (a C6 request), `payment_events` or `payment_events_unmatched`
 *   (a provider event): the first statement that can wait, so a transaction blocked there holds
 *   nothing.
 * - `request` — the record an action answers: a checkout or cart, an offer, a hold request, a
 *   quote — by id.
 * - `orders` — by id. The order is the mutex of one sale: what belongs to it comes after it.
 * - `payment_attempts` — by id. An attempt's order and seller cannot change (./storage.ts makes
 *   them immutable in the database), so applyPaymentEvent() reads them without a lock, locks the
 *   order, then the attempt.
 * - `refunds` — by id: money an attempt owes back, written only under its attempt's lock —
 *   applyPaymentEvent(), a staff refund, the reconciler's recordOwed().
 * - `reservations` — by `target_key`, then id. The column is `COLLATE "C"`, so the database's
 *   order is byte order — the order JavaScript's default comparison gives these ASCII keys.
 * - `stock_levels` — by `(variant_id, location_id)`.
 * - `counters` — discount usage, then gift-card balances (each by id), then the seller's document
 *   sequence, last of all because it is the hottest row.
 * A sweep takes its first rows with `FOR UPDATE SKIP LOCKED`, so housekeeping never waits behind a
 * buyer, then follows the same order.
 */
export const LOCK_ORDER = [
  'dedupe',
  'request',
  'orders',
  'payment_attempts',
  'refunds',
  'reservations',
  'stock_levels',
  'counters',
] as const
export type LockStep = (typeof LOCK_ORDER)[number]

// ─── Sweeps ──────────────────────────────────────────────────────────────────────────────────

/** What one sweep run did; `more` asks the cron route to run it again straight away. */
export type SweepResult = { readonly processed: number; readonly more: boolean }

/**
 * The domain's housekeeping, run by DOM's cron route (C13 `/api/x/cron/sweeps`), each call
 * in its own transaction, at most `limit` rows at a time. Correctness never waits for a sweep —
 * reserve() expires what lapsed before it inserts, applyPaymentEvent() handles money that comes
 * late — but sweeps keep what people and pages see honest. The payment reconciler is PAY's
 * (`/api/x/cron/reconcile`, ../contracts/apply-payment-event.ts `Reconciliation`).
 */
export type DomainSweeps<Tx extends DomainTx = DomainTx> = {
  /** `active` reservations past their end → `expired`: ReservationService.expireDue(). */
  readonly reservations: (tx: Tx, limit: number) => Promise<SweepResult>
  /** Holds near their end → `hold.expiring`, once each: ReservationService.noticeExpiring(). */
  readonly holdNotices: (tx: Tx, limit: number) => Promise<SweepResult>
  /**
   * Attempts no provider will ever close — `manual` and `bank-transfer`, past `expected_by` with no
   * staff entry — → `expired` (system). It locks attempts only (`FOR UPDATE SKIP LOCKED`), never an
   * attempt's order: that would take the lock order backwards. Whatever the order needs follows in
   * `abandonedOrders`. A gateway's attempts close on what the reconciler's `retrieve()` reports,
   * never on our clock alone.
   */
  readonly staleAttempts: (tx: Tx, limit: number) => Promise<SweepResult>
  /**
   * `pending_payment` orders whose reservations have all ended and whose attempts are all closed
   * (`failed`, `expired`, `voided`), or that never had one → `abandoned` (`payment-lapsed`).
   */
  readonly abandonedOrders: (tx: Tx, limit: number) => Promise<SweepResult>
  /** Open offers past `expiresAt` → `expired`; a counter near its end → `offer.counterExpiring`, once. */
  readonly offers: (tx: Tx, limit: number) => Promise<SweepResult>
}

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type Tuple<N extends number, T extends unknown[] = []> = T['length'] extends N
  ? T
  : Tuple<N, [...T, unknown]>
type Seconds<D extends Duration> = Tuple<D['seconds']>
type Limits = typeof DOMAIN_TX_TIMEOUTS
// The session must survive the longest provider call it waits on, with a margin.
type _IdleOutlastsThePort = Assert<
  Seconds<Limits['idleInTransaction']> extends [...Seconds<Limits['port']>, unknown, ...unknown[]]
    ? true
    : false
>
// The whole transaction outlasts a lock wait, a statement and a provider call together.
type _TransactionOutlastsItsParts = Assert<
  Seconds<Limits['transaction']> extends [
    ...Seconds<Limits['lock']>,
    ...Seconds<Limits['statement']>,
    ...Seconds<Limits['port']>,
    unknown,
    ...unknown[],
  ]
    ? true
    : false
>
