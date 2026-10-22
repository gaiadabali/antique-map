/**
 * The one way the dashboard runs SQL: Payload has no grouping, so the panels that count events
 * write a statement with bound parameters (never a string built from a request) and read its rows.
 * Callers hold a `DashboardContext`, so the owner check has run; this file adds nothing to it.
 */
import { sql, type SQL } from '@payloadcms/db-postgres/drizzle'
import type { Payload } from 'payload'

import type { DashboardContext } from './context'
import type { Counted } from './compare'

export { sql }
export type { SQL }

type Db = Payload['db'] & { drizzle: unknown }
type Executed = { rows?: Array<Record<string, unknown>> }

/** The rows `statement` returns. */
export async function rowsOf<T extends Record<string, unknown>>(
  payload: Payload,
  statement: SQL,
): Promise<T[]> {
  const db = payload.db as Db
  const result = (await db.execute({ drizzle: db.drizzle as never, sql: statement })) as Executed
  return (result.rows ?? []) as T[]
}

/** A Postgres `count` arrives as a string (or a number, from a `filter` sum); both are a number here. */
export const num = (value: unknown): number => {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** `site = … AND name IN … AND day BETWEEN previous.from AND to` — the events both periods read. */
export function eventsFilter(ctx: DashboardContext, names: readonly string[]): SQL {
  const list = sql.join(
    names.map((name) => sql`${name}`),
    sql`, `,
  )
  return sql`site = ${ctx.site} AND name IN (${list}) AND day >= ${ctx.period.previous.from} AND day <= ${ctx.period.to}`
}

/** `count(*) FILTER (WHERE day in the period)` — the same for the period before. */
export const inPeriod = (ctx: DashboardContext): SQL =>
  sql`day >= ${ctx.period.from} AND day <= ${ctx.period.to}`
export const inPrevious = (ctx: DashboardContext): SQL =>
  sql`day >= ${ctx.period.previous.from} AND day <= ${ctx.period.previous.to}`

/**
 * The top `limit` values of `key` among the events named `names`, each with its count in both
 * periods, ranked by the current one. `key` is a SQL expression written in this package (a column
 * or a `props->>'…'`), never request text; rows where it is null are not counted.
 */
export async function topCounts(
  ctx: DashboardContext,
  names: readonly string[],
  key: SQL,
  options: { limit?: number; where?: SQL } = {},
): Promise<Counted[]> {
  const extra = options.where ? sql` AND ${options.where}` : sql``
  const rows = await rowsOf<{ key: string; current: unknown; previous: unknown }>(
    ctx.payload,
    sql`SELECT ${key} AS key,
          count(*) FILTER (WHERE ${inPeriod(ctx)}) AS current,
          count(*) FILTER (WHERE ${inPrevious(ctx)}) AS previous
        FROM events
        WHERE ${eventsFilter(ctx, names)} AND ${key} IS NOT NULL${extra}
        GROUP BY 1
        HAVING count(*) FILTER (WHERE ${inPeriod(ctx)}) > 0
        ORDER BY current DESC, key ASC
        LIMIT ${options.limit ?? 10}`,
  )
  return rows.map((row) => ({
    key: String(row.key),
    current: num(row.current),
    previous: num(row.previous),
  }))
}
