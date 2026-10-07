/**
 * Web vitals (ANALYTICS.md §8): LCP, INP and CLS at the 75th percentile, by page type and device,
 * from the beacon's `vitals.reported` (ANALYTICS.md §4). The current period only: a percentile is
 * not a count, so "compared with the period before" would need two populations large enough to
 * mean something — left for the owner to read two periods and compare by eye.
 */
import type { DashboardContext } from '../context'
import { inPeriod, num, rowsOf, sql } from '../sql'

export type VitalsRow = {
  readonly pageType: string
  readonly device: string
  readonly samples: number
  readonly lcp: number | null
  readonly inp: number | null
  readonly cls: number | null
}

export type VitalsPanel = {
  readonly hasData: boolean
  readonly rows: readonly VitalsRow[]
}

type Raw = {
  page_type: string
  device: string
  samples: unknown
  lcp: unknown
  inp: unknown
  cls: unknown
}

const round = (value: unknown, decimals: number): number | null => {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const factor = 10 ** decimals
  return Math.round(n * factor) / factor
}

export async function loadVitals(ctx: DashboardContext): Promise<VitalsPanel | null> {
  if (ctx.site !== 'shop') return null
  const rows = await rowsOf<Raw>(
    ctx.payload,
    sql`SELECT props->>'pageType' AS page_type, device_class::text AS device, count(*) AS samples,
          percentile_cont(0.75) WITHIN GROUP (ORDER BY (props->>'lcp')::numeric) AS lcp,
          percentile_cont(0.75) WITHIN GROUP (ORDER BY (props->>'inp')::numeric) AS inp,
          percentile_cont(0.75) WITHIN GROUP (ORDER BY (props->>'cls')::numeric) AS cls
        FROM events
        WHERE site = ${ctx.site} AND name = 'vitals.reported' AND ${inPeriod(ctx)}
          AND props->>'pageType' IS NOT NULL
        GROUP BY 1, 2
        ORDER BY samples DESC, 1, 2`,
  )
  return {
    hasData: rows.length > 0,
    rows: rows.map((r) => ({
      pageType: r.page_type,
      device: r.device,
      samples: num(r.samples),
      // LCP and INP are in whole milliseconds; CLS is a small fraction (commonly 0–0.25).
      lcp: round(r.lcp, 0),
      inp: round(r.inp, 0),
      cls: round(r.cls, 4),
    })),
  }
}
