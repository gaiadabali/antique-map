/**
 * The DDL seam (PARALLEL-TRACKS.md §1, ARCHITECTURE.md §6, TASKS.md 3.2.e, 3.2.g): engine tables
 * that are not Payload collections, and indexes Payload cannot express, declared as drizzle schema
 * in the adapter's `afterSchemaInit` hook. Because they are part of the schema drizzle-kit diffs,
 * `migrate:create` writes them into the wave's one migration and a dev push carries them too — a
 * raw-SQL table or index would be invisible to both.
 *
 * Each area keeps its tables in its own `db/<area>.ts` (9.2's `db/inventory.ts`, 17.1's
 * `db/{reservations,payments,outbox,fx,documents}.ts`), exporting a record by table name; this
 * file imports each area once, so a task edits only its area. An index on a Payload collection's
 * own table goes through `extendTable` in the area's file.
 *
 * Engine tables live in the adapter's schema (`public`) under the names the docs give them (3.4.g):
 * drizzle-kit's push introspects only the adapter's schema and `migrate:fresh` drops only `public`.
 * No composite primary key: drizzle-kit 0.31.7's push introspection of one fails (`42P02`) —
 * declare a unique constraint over NOT NULL columns instead (senior-db review of 3.2, S1).
 */
import type { PostgresAdapterArgs } from '@payloadcms/db-postgres'
import {
  getTableConfig,
  type PgTable,
  type PgTableFn,
} from '@payloadcms/db-postgres/drizzle/pg-core'

import { IDEMPOTENCY_TABLES } from './idempotency'

type TableBuilder = (table: PgTableFn) => PgTable
type Area = Readonly<Record<string, TableBuilder>>

/** Every area, once. Owner lane in a comment. */
const AREAS: ReadonlyArray<readonly [string, Area]> = [
  ['idempotency', IDEMPOTENCY_TABLES], // DOM — C6 idempotency (domain/src/contracts/storage.ts)
]

type PostgresSchemaHook = NonNullable<PostgresAdapterArgs['afterSchemaInit']>[number]
type PostgresSchema = Awaited<ReturnType<PostgresSchemaHook>>

/** Every engine table's builder by table name, refusing a name two areas both declare. */
export function engineTables(areas: ReadonlyArray<readonly [string, Area]> = AREAS) {
  const all = new Map<string, TableBuilder>()
  const owner = new Map<string, string>()
  for (const [area, tables] of areas) {
    for (const [name, build] of Object.entries(tables)) {
      if (all.has(name)) {
        throw new Error(
          `engine table "${name}" is declared by both db/${owner.get(name)}.ts and db/${area}.ts`,
        )
      }
      all.set(name, build)
      owner.set(name, area)
    }
  }
  return all
}

export function declareEngineTablesFrom(
  areas: ReadonlyArray<readonly [string, Area]>,
): PostgresSchemaHook {
  return ({ adapter, schema }) => {
    // The adapter's own table builder, so a schemaName (never set here) would be honoured.
    const table = (adapter as unknown as { pgSchema: { table: PgTableFn } }).pgSchema.table
    const tables: PostgresSchema['tables'] = { ...schema.tables }
    for (const [name, build] of engineTables(areas)) {
      if (name in tables) {
        // A collection whose table name equals an engine table's would lose one of the two.
        throw new Error(
          `engine table "${name}" collides with a Payload table of the same name (engine/packages/cms/src/db/engine-tables.ts)`,
        )
      }
      const built = build(table)
      if (getTableConfig(built).primaryKeys.length > 0) {
        throw new Error(
          `engine table "${name}" declares a composite primary key: use unique(...) over NOT NULL columns — drizzle-kit's push cannot introspect one (db/engine-tables.ts)`,
        )
      }
      tables[name] = built as PostgresSchema['tables'][string]
    }
    return { ...schema, tables }
  }
}

export const declareEngineTables: PostgresSchemaHook = declareEngineTablesFrom(AREAS)
