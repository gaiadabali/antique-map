/**
 * @contract C5–C8 shared — what the database must enforce · owner: ARC · for SCH (Phase 2) and DOM
 * Entry `@engine/domain/storage`.
 *
 * The constraints and indexes the domain's guarantees stand on (senior-db review of 1.2), for the
 * SCH lead to declare through the Postgres adapter's `afterSchemaInit` / `extendTable`, so that
 * the wave's migration AND a schema author's dev push carry them — a raw-SQL index would be
 * missing from a pushed database and let the concurrency tests pass without it
 * (ARCHITECTURE.md §6, PARALLEL-TRACKS.md §3.2). This file is not DDL: SCH writes that, in the
 * wave's one migration (PARALLEL-TRACKS.md §3). Its constants are shared so the index SCH declares
 * and the `ON CONFLICT` DOM writes cannot drift apart.
 *
 * Every table below lives in `public`, the adapter's schema, under the plain name it is given
 * here — a collection's (`reservations`, `payment_attempts`) and an engine table's
 * (`payment_events`, `domain_events`, `idempotency_keys`) alike; never an `engine` schema, so
 * the domain's SQL names them unqualified (PARALLEL-TRACKS.md §1). **No engine table declares a
 * composite primary key**: drizzle-kit 0.31.7 cannot introspect one (`42P02`, which fails a push
 * onto a database that has tables — senior-db, 3.2 S1), so a key of several columns is a UNIQUE
 * constraint over NOT NULL columns, which an `ON CONFLICT` infers just the same.
 */
import type { INDEXED_RESERVATION_STATUSES } from '../reservations/machine'
import type { NormalizedPaymentEvent } from './payment-vocabulary'
import type { Assert, Equals } from './type-assertions'

// ─── Money, everywhere ───────────────────────────────────────────────────────────────────────
//
// Every amount column: `bigint` with `CHECK (amount BETWEEN 0 AND MONEY_AMOUNT_MAX)`, its currency
// `char(3)`; read through drizzle's `bigint({ mode: 'number' })` and asserted with
// `Number.isSafeInteger` (C5) — never a float column, never a string. SCH to confirm what Payload
// 3.90's Postgres adapter makes of a `number` field (suspected `numeric`, which reads back as a
// string); if so, money fields get their column type through `afterSchemaInit`. FX rates and
// buffers: `numeric`, read as text (`DecimalString`). An `ExactRatio`: text. Rounding records:
// rows, or `jsonb` beside the figure each produced.

/** The largest amount a money column admits: the largest safe integer, so every read is exact. */
export const MONEY_AMOUNT_MAX = 9007199254740991

/** How long an idempotency key and its stored response are kept (see `idempotency_keys` below). */
export const IDEMPOTENCY_KEY_RETENTION = { days: 7 } as const

// ─── reservations ────────────────────────────────────────────────────────────────────────────
//
// A collection with drafts and versions off and create / update / delete access `false`: only
// reserve()'s SQL writes it, and staff act through the service's endpoints.
// - Scalar foreign keys, never a polymorphic `_rels` table: `product_id`, `unit_id`, `variant_id`,
//   `location_id`, `cart_id`, `order_id`, `customer_id`, `hold_request_id`, `offer_id`,
//   `invoice_id`, `granted_by`.
// - `target_key text COLLATE "C" NOT NULL` (byte order: the lock order sorts on it) and
//   `exclusive boolean NOT NULL`, with a CHECK tying both to the foreign keys — `product:<id>` and
//   `unit:<id>` exclusive, `stock:<variant_id>@<location_id>` not.
// - `kind` and `status` CHECKed against RESERVATION_KINDS and RESERVATION_STATUSES;
//   `quantity int CHECK (quantity > 0)`; `CHECK (NOT exclusive OR quantity = 1)`.
// - `expires_at timestamptz NOT NULL`, `created_at timestamptz NOT NULL` (extend()'s cap is
//   measured from it), `expiring_notified_at timestamptz` (a notice is sent once).
// - UNIQUE INDEX on `target_key` WHERE `RESERVATION_ARBITER.where`, not deferrable; INDEX on
//   `expires_at` WHERE `status = 'active'` (the sweep); INDEX on `target_key` WHERE `NOT exclusive
//   AND status = 'active'` (a counted target's lazy expiry); INDEX on `order_id`.

/**
 * reserve()'s arbiter: the partial unique index's predicate, which `INSERT … ON CONFLICT
 * (target_key) WHERE …` repeats verbatim so that Postgres infers that index — for an exclusive
 * target, a second live or sold reservation becomes a no-op insert, never a unique violation.
 */
export const RESERVATION_ARBITER = {
  table: 'reservations',
  column: 'target_key',
  where: "exclusive AND status IN ('active', 'converted')",
} as const

// ─── stock_levels ────────────────────────────────────────────────────────────────────────────
//
// UNIQUE `(variant_id, location_id)`; `CHECK (on_hand >= 0)`; `CHECK (reserved >= 0)`. `reserved`
// moves only through the reservation service; `on_hand` moves on a sale (convert) or with an
// `inventory_movements` row written in the same transaction (count, transfer, restock, damage).

// ─── payment_attempts ────────────────────────────────────────────────────────────────────────
//
// UNIQUE `attempt_ref` — our reference, sent to the provider and echoed back, committed before the
// provider hears of it; `seller_id NOT NULL`; UNIQUE `(provider, seller_id, provider_ref)`, the
// ref null until the provider names it;
// INDEX on `order_id`; INDEX on `(status, expected_by)` WHERE `status IN ('created', 'pending',
// 'requires_action', 'authorised')` — the reconciler's and the stale-attempt sweep's.
// Immutable once inserted: ATTEMPT_IMMUTABLE_COLUMNS, and `provider_ref` is written once (null →
// a value, never changed after). applyPaymentEvent() reads an attempt's order and seller WITHOUT a
// lock and takes the lock order from them, which is sound only because they cannot change.
// Enforced twice: no update access to those fields in the collection, and a `BEFORE UPDATE`
// trigger that raises on any change to them. The trigger is raw SQL in the wave's migration —
// drizzle's schema cannot declare one — so a dev-pushed database lacks it, and the invariant's test
// runs against a migrated database.

/**
 * The `payment_attempts` columns no UPDATE may change — the trigger's list and its test's. SCH
 * keeps it in step with the collection's column names.
 */
export const ATTEMPT_IMMUTABLE_COLUMNS = [
  'order_id',
  'seller_id',
  'provider',
  'attempt_ref',
  'charge_amount',
  'charge_currency',
] as const

/** Written once: null until the provider names the payment, never changed after. */
export const ATTEMPT_WRITE_ONCE_COLUMNS = ['provider_ref'] as const

// ─── payment_events, payment_events_unmatched, refunds ───────────────────────────────────────
//
// `payment_events` (engine table): UNIQUE `(provider, seller_id, provider_event_id)` — secrets, and
// so webhook routes, are per seller (C13 `/api/x/webhooks/payments/[provider]/[seller]`), and two
// sellers on one provider never share a key space; `attempt_id`, `source`, `outcome`
// (ApplyPaymentEventOutcome), a hash of the redacted payload.
// `payment_events_unmatched` (engine table): events for no known attempt, kept apart so they never
// consume a dedupe key — UNIQUE `(provider, seller_id, provider_event_id)`; the normalised event
// itself (`jsonb`, a NormalizedPaymentEvent: ids, states and amounts, no PII — the type test below
// holds it to that), so once its attempt is known it can be re-driven through applyPaymentEvent();
// the raw payload's hash, first and last seen, a count, `resolved_at` (set when it applies).
// `refunds` (collection): UNIQUE `(attempt_id, refund_ref)` — the provider's refund id, or
// `retrieve:<cumulative>` for one learnt from retrieve(); UNIQUE `idempotency_key`
// (RefundIdempotencyKey) for a refund the domain owes; its status (`requested` · `pending` ·
// `refunded` · `manual-required`).

// ─── domain_events, idempotency_keys (engine tables) ─────────────────────────────────────────
//
// `domain_events`: `uuid` primary key; INDEX on `(occurred_at, id)` WHERE `dispatched_at IS NULL`;
// the dispatcher takes rows `FOR UPDATE SKIP LOCKED`; each consumer dedupes in its own table, keyed
// `(consumer, event_id)`.
// `idempotency_keys`: UNIQUE `(operation, key)` over NOT NULL columns — a constraint, never a
// composite primary key (above) — and the caller is NOT in the key, so another caller's reuse
// meets the row instead of starting afresh. Beside it `caller_ref` (the session's customer, else
// the cart, else null), `request_sha256` (of the decoded request), `response` and `created_at`;
// an INDEX on `created_at` (the sweep) and one on `caller_ref` (an erasure). `response` is
// NULLABLE: the dedupe row is the first taken in its transaction (`LOCK_ORDER`), so it is
// inserted before the operation runs and its response is written by the same transaction before
// it commits — a committed row always has one, and a concurrent insert of the same key waits on
// the row until it does. Inserted `ON CONFLICT DO NOTHING` inside the request's own
// transaction, so a rolled-back request leaves no key behind; on a conflict both are compared with
// this request's: equal answers the stored response, either different is `invalid`
// (`idempotencyKey`, `mismatch`) and never it. So a guest who signs in mid-flow (cart → customer)
// meets `mismatch` on a retry, and the page, re-rendered, mints a new key; a guest with no cart
// binds by the request's hash alone — enough only because a key is a per-render UUID that never
// leaves its page (C6 `IdempotencyKey`). A stored response keeps no token (the domain derives
// each again when it replays one, C6 `links`), and a row is swept `IDEMPOTENCY_KEY_RETENTION`
// after `created_at` (DEPLOYMENT.md §5) — longer than any retry, far shorter than the entries it
// holds (a contact, a tax id) could justify — and an erasure (28.4) deletes its caller's at once.
//
// ─── Capability links (C6 `links`) ────────────────────────────────────────────────────────────
//
// Every record a derived link names — a want list, a subscriber, a retailer's customer record, an
// order, a pay link, a quote, an offer, a hold request, an appointment, a return, an enquiry, a
// consignment — has `ref uuid NOT NULL UNIQUE` (random, never sequential; Postgres prints it in
// the lowercase form a token carries) and `token_version int NOT NULL DEFAULT 1 CHECK
// (token_version > 0)`, and no column holding a token or a hash of one. Each whose purpose has a
// window (C6 `LINK_WINDOW_DAYS`: all but want lists and subscribers) also has `links_anchor_at
// timestamptz NOT NULL`, moved only by the domain as it issues a link, after bumping the version
// if the window had already run out (C6 `links`, "a lapse is final"). The customer record alone
// also keeps a pending password link's nonce hash and expiry (C13 `PASSWORD_LINK`), cleared on use.

// ─── Type-level tests ────────────────────────────────────────────────────────────────────────

type Quoted<T extends readonly string[]> = T extends readonly [
  infer Head extends string,
  ...infer Rest extends readonly string[],
]
  ? Rest extends readonly []
    ? `'${Head}'`
    : `'${Head}', ${Quoted<Rest>}`
  : never

// A stored unmatched event carries no one's email, phone, name or address.
type KeysOf<T> = T extends unknown ? keyof T : never
type PiiKey = 'email' | 'phone' | 'whatsapp' | 'name' | 'fullName' | 'address' | 'customer'
type _UnmatchedEventsHoldNoPii = Assert<
  Equals<Extract<KeysOf<NormalizedPaymentEvent>, PiiKey>, never>
>

// The index covers exactly the statuses the machine says a sold-once target is taken in.
type _ArbiterCoversTheIndexedStatuses = Assert<
  Equals<
    (typeof RESERVATION_ARBITER)['where'],
    `exclusive AND status IN (${Quoted<typeof INDEXED_RESERVATION_STATUSES>})`
  >
>
