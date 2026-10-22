/**
 * The schema-constraint seam (CONVENTIONS.md §13; TASKS.md 3.3.d): a constraint that guards
 * correctness — a CHECK, a unique key Payload's field options cannot express — is declared in the
 * drizzle schema through the Postgres adapter's `afterSchemaInit`, so a dev push and a test's
 * pushed database carry it exactly as `migrate:create` writes it into the wave's migration. A
 * constraint added by hand-written SQL alone would exist only on a migrated database, and every
 * pushed-database test would pass without it.
 *
 * **Declared beside the collection it guards**, as data: a collection lists its constraints in
 * `custom.dbConstraints` (server-only — Payload strips `custom` from the client config), each set
 * naming the Postgres table it applies to — the collection's own (`stock_levels`), an array's
 * (`orders_lines`), or another's it depends on (`users`, for the store-deletion guard). This
 * module reads them from the sanitised config, so a task adds a constraint in its own folder and
 * never edits a shared list. A set naming a table the schema lacks, a constraint name two sets
 * share, or a column the table lacks fails the boot, never silently drops the constraint.
 *
 * What drizzle cannot hold — triggers, sequences — stays hand-written SQL in a migration, tested
 * on a migrated (or explicitly prepared) database.
 */
import type { PostgresAdapterArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres/drizzle'
import { check, unique } from '@payloadcms/db-postgres/drizzle/pg-core'

/** One table's constraints. Names are the Postgres constraint names, ≤ 63 bytes, unique schema-wide. */
export type ConstraintSet = {
  /** The Postgres table: `stock_levels`, `orders_lines`, `users`… */
  readonly table: string
  /** CHECK constraints: name → a boolean SQL expression over that table's columns. */
  readonly checks?: Readonly<Record<string, string>>
  /** Unique constraints over several columns (by their Postgres names). */
  readonly unique?: Readonly<
    Record<string, { readonly columns: readonly string[]; readonly nullsNotDistinct?: boolean }>
  >
}

/** Where a collection keeps its sets: `custom: { [DB_CONSTRAINTS]: [...] }`. */
export const DB_CONSTRAINTS = 'dbConstraints'

/** The `custom` block a collection spreads in, typed. */
export function dbConstraints(...sets: readonly ConstraintSet[]): {
  [DB_CONSTRAINTS]: readonly ConstraintSet[]
} {
  return { [DB_CONSTRAINTS]: sets }
}

type PostgresSchemaHook = NonNullable<PostgresAdapterArgs['afterSchemaInit']>[number]
type CollectionLike = { slug: string; custom?: Record<string, unknown> }
type ColumnLike = { name?: unknown }

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/
const MAX_IDENTIFIER_BYTES = 63

/** Every collection's sets, in config order, each tagged with the collection that declared it. */
export function collectConstraints(
  collections: readonly CollectionLike[],
): Array<{ owner: string; set: ConstraintSet }> {
  const found: Array<{ owner: string; set: ConstraintSet }> = []
  const names = new Map<string, string>()
  for (const collection of collections) {
    const sets = collection.custom?.[DB_CONSTRAINTS]
    if (sets === undefined) continue
    if (!Array.isArray(sets)) {
      throw new Error(`collection "${collection.slug}": custom.${DB_CONSTRAINTS} is not a list`)
    }
    for (const set of sets as ConstraintSet[]) {
      const declared = [...Object.keys(set.checks ?? {}), ...Object.keys(set.unique ?? {})]
      for (const name of declared) {
        if (!IDENTIFIER.test(name) || Buffer.byteLength(name) > MAX_IDENTIFIER_BYTES) {
          throw new Error(
            `constraint "${name}" (${collection.slug}) is not a lower-case Postgres identifier of at most ${MAX_IDENTIFIER_BYTES} bytes`,
          )
        }
        const previous = names.get(name)
        if (previous !== undefined) {
          throw new Error(
            `constraint "${name}" is declared by both "${previous}" and "${collection.slug}"`,
          )
        }
        names.set(name, collection.slug)
      }
      found.push({ owner: collection.slug, set })
    }
  }
  return found
}

/** The drizzle column object whose Postgres name is `name`, or a boot failure naming it. */
function columnNamed(columns: Record<string, unknown>, name: string, where: string): unknown {
  const column = Object.values(columns).find(
    (candidate) => (candidate as ColumnLike | null)?.name === name,
  )
  if (column === undefined) throw new Error(`${where}: table has no column "${name}"`)
  return column
}

/** Turns one set into the drizzle extra config `extendTable` merges into its table. */
export function extraConfigFor(
  set: ConstraintSet,
  owner: string,
): (columns: Record<string, unknown>) => Record<string, unknown> {
  return (columns) => {
    const config: Record<string, unknown> = {}
    for (const [name, expression] of Object.entries(set.checks ?? {})) {
      config[name] = check(name, sql.raw(expression))
    }
    for (const [name, key] of Object.entries(set.unique ?? {})) {
      const where = `constraint "${name}" on "${set.table}" (${owner})`
      const [first, ...rest] = key.columns.map((column) => columnNamed(columns, column, where))
      if (first === undefined) throw new Error(`${where}: names no column`)
      const built = unique(name).on(first as never, ...(rest as never[]))
      config[name] = key.nullsNotDistinct ? built.nullsNotDistinct() : built
    }
    return config
  }
}

/** The `afterSchemaInit` hook: every collection's declared constraints, onto their tables. */
export const declareConstraints: PostgresSchemaHook = ({ adapter, extendTable, schema }) => {
  const collections = (adapter.payload.config.collections ?? []) as readonly CollectionLike[]
  for (const { owner, set } of collectConstraints(collections)) {
    const table = schema.tables[set.table]
    if (table === undefined) {
      throw new Error(
        `collection "${owner}" declares constraints on table "${set.table}", which the schema lacks`,
      )
    }
    extendTable({ table, extraConfig: extraConfigFor(set, owner) })
  }
  return schema
}
