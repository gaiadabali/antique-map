/**
 * The DDL seam (PARALLEL-TRACKS.md §1, ARCHITECTURE.md §6, TASKS.md 3.2.e): engine tables that
 * are not Payload collections, and indexes Payload cannot express, declared as drizzle schema in
 * the adapter's `afterSchemaInit` hook. Because they are part of the schema drizzle-kit diffs,
 * `payload migrate:create` writes them into the wave's one migration and a dev push carries them
 * too — a raw-SQL table or index would be invisible to both, and a dev push would silently drop
 * an index the concurrency tests then pass without (ARCHITECTURE.md §6).
 *
 * The lane that uses a table specifies it in its task; the SCH lead adds it here. An index on a
 * Payload collection's own table goes through `extendTable` in the same hook.
 *
 * Engine tables live in the adapter's schema (`public`), beside Payload's, under the names the
 * docs give them (`payment_events`, `domain_events`, …). Not a separate `engine` Postgres schema:
 * with Payload's `schemaName` unset, drizzle-kit's push introspects `public` alone, so a table in
 * another schema would be re-created — and fail — on every dev push, and `migrate:fresh` drops
 * `public` only.
 */
import type { PostgresAdapterArgs } from '@payloadcms/db-postgres'
import { pgTable, type PgTableFn } from '@payloadcms/db-postgres/drizzle/pg-core'

import { idempotencyKeysTable } from './tables/idempotency-keys'

/** Every engine table, by its table name. Owner lane of each in a comment. */
export const ENGINE_TABLES = {
  // DOM — C6 idempotency (domain/src/contracts/storage.ts)
  idempotency_keys: idempotencyKeysTable,
} as const satisfies Record<string, (table: PgTableFn) => unknown>

export type EngineTableName = keyof typeof ENGINE_TABLES

type PostgresSchemaHook = NonNullable<PostgresAdapterArgs['afterSchemaInit']>[number]

export const declareEngineTables: PostgresSchemaHook = ({ schema }) => {
  const tables = { ...schema.tables }
  for (const [name, build] of Object.entries(ENGINE_TABLES)) {
    if (name in tables) {
      // A collection whose table name equals an engine table's would lose one of the two.
      throw new Error(
        `engine table "${name}" collides with a Payload table of the same name (engine/packages/cms/src/db/engine-tables.ts)`,
      )
    }
    tables[name] = build(pgTable) as (typeof tables)[string]
  }
  return { ...schema, tables }
}
