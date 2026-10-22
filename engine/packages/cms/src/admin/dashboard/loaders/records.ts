/**
 * Reads of the business records the panels count (leads, chat sessions, orders) — through the
 * Local API as the acting user with `overrideAccess: false`, so the collections' access functions
 * decide what comes back (ANALYTICS.md §1: business numbers come from records, never from beacon
 * events). One read spans both periods; `inSpan` then splits the rows by their instant.
 */
import type { Counted } from '../compare'
import type { DashboardContext } from '../context'
import { instantBounds, spanBounds } from '../period'

export type Row = Record<string, unknown>

type Finder = { find: (args: object) => Promise<{ docs: Row[] }> }

/** Every row of `collection` matching `where`, with only the fields in `select`. */
export async function findAll(
  ctx: DashboardContext,
  collection: string,
  options: { where: object; select: object },
): Promise<Row[]> {
  const { docs } = await (ctx.payload as unknown as Finder).find({
    collection,
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: false,
    user: ctx.user,
    where: options.where,
    select: options.select,
  })
  return docs
}

/** The `where` of a date field over both periods. */
export function spanWhere(ctx: DashboardContext, field: string): object {
  const { start, end } = spanBounds(ctx.period)
  return {
    and: [
      { [field]: { greater_than_equal: start.toISOString() } },
      { [field]: { less_than: end.toISOString() } },
    ],
  }
}

/** Which period an instant belongs to, by the same bounds the query used. */
export function periodOfInstant(
  ctx: DashboardContext,
  value: unknown,
): 'current' | 'previous' | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null
  const at = new Date(value).getTime()
  if (Number.isNaN(at)) return null
  const now = instantBounds(ctx.period)
  if (at >= now.start.getTime() && at < now.end.getTime()) return 'current'
  const before = instantBounds(ctx.period.previous)
  return at >= before.start.getTime() && at < before.end.getTime() ? 'previous' : null
}

/** A relationship value's id, whether the Local API gave back a number or a populated doc. */
export function idOf(value: unknown): unknown {
  return value !== null && typeof value === 'object' ? (value as { id?: unknown }).id : value
}

/** `current` and `previous` rows tallied by `key`, ranked by the current count, highest first. */
export function rankCounted(
  current: readonly Row[],
  previous: readonly Row[],
  key: (row: Row) => string | null | undefined,
): Counted[] {
  const tally = (rows: readonly Row[]): Map<string, number> => {
    const counts = new Map<string, number>()
    for (const row of rows) {
      const value = key(row)
      if (value === null || value === undefined || value === '') continue
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    return counts
  }
  const now = tally(current)
  const before = tally(previous)
  return [...new Set([...now.keys(), ...before.keys()])]
    .map((k) => ({ key: k, current: now.get(k) ?? 0, previous: before.get(k) ?? 0 }))
    .sort((a, b) => b.current - a.current || a.key.localeCompare(b.key))
}
