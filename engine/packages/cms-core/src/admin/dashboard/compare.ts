/**
 * A number with the same number for the period before it (ANALYTICS.md §8: "compared with the
 * period before"). The delta is the dashboard's, not the view's, so every panel computes it the
 * one way: `change` is the plain difference, `pct` the relative change — `null` when the period
 * before was zero, where a percentage would mean nothing.
 */
export type Compared = {
  readonly current: number
  readonly previous: number
  readonly change: number
  readonly pct: number | null
}

export function compared(current: number, previous: number): Compared {
  return {
    current,
    previous,
    change: current - previous,
    pct: previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10,
  }
}

/** One row of a ranked list, with its count in both periods. */
export type Counted = {
  readonly key: string
  readonly current: number
  readonly previous: number
}

/** The middle value, averaging the two middle ones for an even count; `null` with none. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/** One row of a ranked list of money (orders and their summed amount), the current period only. */
export type MoneyRanked = {
  readonly key: string
  readonly orders: number
  /** Integer rupiah. */
  readonly revenue: number
}

/** `entries` (one per order or order line) tallied by `key` and ranked by revenue, highest first. */
export function rankMoney(
  entries: readonly { readonly key: string | null; readonly amount: number }[],
  limit = 10,
): MoneyRanked[] {
  const totals = new Map<string, { orders: number; revenue: number }>()
  for (const entry of entries) {
    if (entry.key === null) continue
    const row = totals.get(entry.key) ?? { orders: 0, revenue: 0 }
    row.orders += 1
    row.revenue += entry.amount
    totals.set(entry.key, row)
  }
  return [...totals.entries()]
    .map(([key, row]) => ({ key, orders: row.orders, revenue: row.revenue }))
    .sort((a, b) => b.revenue - a.revenue || a.key.localeCompare(b.key))
    .slice(0, limit)
}
