/**
 * Visitors (ANALYTICS.md §8): sessions and page views a day, top pages, referrers and `utm`
 * sources, phone vs desktop, English vs Indonesian. Counted from `page.viewed` beacon events by
 * their collect-stamped `day` — the days are never re-derived from `at`.
 */
import { compared, type Compared, type Counted } from '../compare'
import type { DashboardContext } from '../context'
import { shiftDay } from '../period'
import { eventsFilter, num, rowsOf, sql, topCounts } from '../sql'

export type VisitorsDay = {
  readonly day: string
  readonly sessions: number
  readonly pageViews: number
}

export type VisitorsPanel = {
  readonly hasData: boolean
  readonly sessions: Compared
  readonly pageViews: Compared
  /** Every day of the period, a day without a visit as zeros. */
  readonly daily: readonly VisitorsDay[]
  readonly topPaths: readonly Counted[]
  readonly referrers: readonly Counted[]
  readonly utmSources: readonly Counted[]
  readonly devices: readonly Counted[]
  readonly locales: readonly Counted[]
}

const PAGE = ['page.viewed'] as const

export async function loadVisitors(ctx: DashboardContext): Promise<VisitorsPanel> {
  const rows = await rowsOf<{ day: string; sessions: unknown; page_views: unknown }>(
    ctx.payload,
    sql`SELECT day, count(DISTINCT session_id) AS sessions, count(*) AS page_views
        FROM events WHERE ${eventsFilter(ctx, PAGE)}
        GROUP BY day ORDER BY day`,
  )
  const byDay = new Map(rows.map((r) => [r.day, r]))
  const { from, to, days, previous } = ctx.period
  const sum = (range: { from: string; to: string }, field: 'sessions' | 'page_views') =>
    rows
      .filter((r) => r.day >= range.from && r.day <= range.to)
      .reduce((total, r) => total + num(r[field]), 0)
  const daily: VisitorsDay[] = []
  for (let i = 0; i < days; i += 1) {
    const day = shiftDay(from, i)
    const row = byDay.get(day)
    daily.push({ day, sessions: num(row?.sessions), pageViews: num(row?.page_views) })
  }
  const pageViews = compared(sum({ from, to }, 'page_views'), sum(previous, 'page_views'))
  const [topPaths, referrers, utmSources, devices, locales] = await Promise.all([
    topCounts(ctx, PAGE, sql`path`),
    topCounts(ctx, PAGE, sql`referrer_host`),
    topCounts(ctx, PAGE, sql`utm_source`),
    topCounts(ctx, PAGE, sql`device_class::text`, { limit: 5 }),
    topCounts(ctx, PAGE, sql`locale::text`, { limit: 5 }),
  ])
  return {
    hasData: pageViews.current > 0,
    sessions: compared(sum({ from, to }, 'sessions'), sum(previous, 'sessions')),
    pageViews,
    daily,
    topPaths,
    referrers,
    utmSources,
    devices,
    locales,
  }
}
