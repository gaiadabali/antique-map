/**
 * `idempotency_keys` — the first engine table, and the one that proves the DDL seam (TASKS.md
 * 3.2.e). Its shape is the one `@engine/domain/storage` (C5–C8) asks the database to enforce:
 *
 * - primary key `(operation, key)` — the caller is NOT in the key, so another caller's reuse meets
 *   the row instead of starting afresh;
 * - `caller_ref` (the session's customer, else the cart, else null), `request_sha256` (of the
 *   decoded request), the stored `response` and `created_at`;
 * - an index on `created_at` (the retention sweep, `IDEMPOTENCY_KEY_RETENTION`) and one on
 *   `caller_ref` (an erasure deletes a caller's rows at once, TASKS.md 28.4).
 *
 * The domain inserts it `ON CONFLICT DO NOTHING` inside the request's own transaction; nothing
 * here writes it. A stored response never keeps a token (C6 `links`). DOM may amend the shape
 * when it builds the writer — additively, through the SCH lead (PARALLEL-TRACKS.md §1).
 */
import { sql } from '@payloadcms/db-postgres/drizzle'
import {
  check,
  index,
  jsonb,
  primaryKey,
  text,
  timestamp,
  type PgTableFn,
} from '@payloadcms/db-postgres/drizzle/pg-core'

export const IDEMPOTENCY_KEYS_TABLE = 'idempotency_keys'

export function idempotencyKeysTable(table: PgTableFn) {
  return table(
    IDEMPOTENCY_KEYS_TABLE,
    {
      operation: text('operation').notNull(),
      key: text('key').notNull(),
      callerRef: text('caller_ref'),
      requestSha256: text('request_sha256').notNull(),
      response: jsonb('response').notNull(),
      createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
        .notNull()
        .defaultNow(),
    },
    (columns) => [
      primaryKey({ name: 'idempotency_keys_pkey', columns: [columns.operation, columns.key] }),
      index('idempotency_keys_created_at_idx').on(columns.createdAt),
      index('idempotency_keys_caller_ref_idx').on(columns.callerRef),
      // A hex sha-256 and nothing else: a key compared against the wrong digest never matches.
      check('idempotency_keys_request_sha256_hex', sql`"request_sha256" ~ '^[0-9a-f]{64}$'`),
      check('idempotency_keys_key_not_blank', sql`length("key") > 0`),
    ],
  )
}
