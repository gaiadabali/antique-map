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
