/**
 * Whether the row's data would change the record: the record's values, read into the same shape
 * the row carries, against what the row would write. Only what differs goes into the update — an
 * empty cell never clears a field, because only the cells the row carries are in the data at all
 * (DATA.md §3). `null` and a missing key mean the same: the field is empty.
 */
import { shown } from './cells'
import { pairAs } from './bilingual'

/** Normalises for comparison: null→undefined, order-insensitive object keys, strings kept. */
function norm(value: unknown): unknown {
  if (value === null) return undefined
  if (Array.isArray(value)) return value.map(norm)
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, each]) => [key, norm(each)] as const)
      .filter(([, each]) => each !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
    return entries
  }
  return value
}

/** Whether two field values would write the same stored thing. */
export function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b))
}

/**
 * The fields `data` would change on `doc`, as the report shows them. A relationship id arrives as
 * the id itself (rows are read with `depth: 0`), so both sides are ids or arrays of ids.
 */
export function changes(
  doc: Record<string, unknown>,
  data: Record<string, unknown>,
): Array<{ column: string; was: string; now: string }> {
  const out: Array<{ column: string; was: string; now: string }> = []
  for (const [key, now] of Object.entries(data)) {
    const was = valueOf(doc[key])
    const incoming = valueOf(now)
    if (!same(pairAs(now as Record<string, unknown>, was), incoming))
      out.push({ column: key, was: shown(was), now: shown(incoming) })
  }
  return out
}

/** A doc value as it is compared and shown: a localized read may answer a plain string. */
function valueOf(value: unknown): unknown {
  if (value === null || value === undefined) return undefined
  return value
}
