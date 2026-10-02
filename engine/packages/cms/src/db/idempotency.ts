/**
 * The idempotency area's engine tables (TASKS.md 3.2.e, 3.2.g; 17.1.b amends additively).
 * `idempotency_keys` proves the DDL seam. Its shape is the one the old C5–C8 contracts (archived in
 * `docs/archive/2026-10-replan/`) asked the database to enforce:
 *
 * - `(operation, key)` unique — the caller is NOT in the key, so another caller's reuse meets the
 *   row instead of starting afresh. A unique constraint over NOT NULL columns, not a composite
 *   primary key: drizzle-kit 0.31.7's push introspection of a composite key sends a parameterised
 *   query without its parameters (`42P02`), so a dev push fails on its second boot
 *   (senior-db review of 3.2, S1). `ON CONFLICT (operation, key) DO NOTHING` infers it the same.
 * - `caller_ref` (the session's customer, else the cart, else null), `request_sha256` (of the
 *   decoded request), `response` and `created_at`.
 * - `response` is nullable: the dedupe row is the first row a request's transaction takes
 *   (C8 `LOCK_ORDER`), before there is an answer to store (to confirm with DOM, 17.1).
 * - Byte-order collation (`COLLATE "C"`) on the keys: compared and locked in byte order, never by
 *   a locale's rules. A key is a per-render UUID; the bound only stops garbage.
 * - An index on `created_at` (the retention sweep, `IDEMPOTENCY_KEY_RETENTION`) and a partial one
 *   on `caller_ref` (an erasure deletes one caller's rows, TASKS.md 28.4; most rows have none).
 *
 * The domain inserts it `ON CONFLICT DO NOTHING` inside the request's own transaction; nothing
 * here writes it. A stored response never keeps a token (C6 `links`).
 */
import { sql } from '@payloadcms/db-postgres/drizzle'
import {
  check,
  customType,
  index,
  jsonb,
  text,
  timestamp,
  unique,
  type PgTableFn,
} from '@payloadcms/db-postgres/drizzle/pg-core'

/**
 * `text COLLATE "C"`: drizzle 0.45 has no collation on its own text columns. The collation does
 * not round-trip through drizzle-kit's introspection (it reads the column back as plain `text`),
 * so a dev push re-emits `SET DATA TYPE text COLLATE "C"` on every boot — and on a pushed database
 * re-adds the unique constraint — harmlessly (senior-db re-review of 3.2, R3). Migrations diff
 * snapshot against snapshot, never against the database, so `migrate:create` is unaffected.
 */
const byteOrderText = customType<{ data: string }>({ dataType: () => 'text COLLATE "C"' })

export const IDEMPOTENCY_KEYS_TABLE = 'idempotency_keys'

export function idempotencyKeysTable(table: PgTableFn) {
  return table(
    IDEMPOTENCY_KEYS_TABLE,
    {
      operation: byteOrderText('operation').notNull(),
      key: byteOrderText('key').notNull(),
      callerRef: byteOrderText('caller_ref'),
      requestSha256: text('request_sha256').notNull(),
      response: jsonb('response'),
      createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
        .notNull()
        .defaultNow(),
    },
    (columns) => [
      unique('idempotency_keys_operation_key_unique').on(columns.operation, columns.key),
      index('idempotency_keys_created_at_idx').on(columns.createdAt),
      index('idempotency_keys_caller_ref_idx')
        .on(columns.callerRef)
        .where(sql`"caller_ref" IS NOT NULL`),
      // A hex sha-256 and nothing else: a key compared against the wrong digest never matches.
      check('idempotency_keys_request_sha256_hex', sql`"request_sha256" ~ '^[0-9a-f]{64}$'`),
      check('idempotency_keys_key_length', sql`length("key") BETWEEN 1 AND 128`),
      check('idempotency_keys_operation_length', sql`length("operation") BETWEEN 1 AND 64`),
    ],
  )
}

/** This area's engine tables, by table name. Owner: DOM (C6 idempotency), built by SCH. */
export const IDEMPOTENCY_TABLES = {
  idempotency_keys: idempotencyKeysTable,
} as const
