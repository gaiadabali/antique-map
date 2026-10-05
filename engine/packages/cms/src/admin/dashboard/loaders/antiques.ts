/**
 * Antiques (ANALYTICS.md §8): the most viewed and most zoomed items, the rate of views that went
 * on to an ask, and the same by object type, maker and place. From `item.viewed`, `item.zoomed`
 * and `ask.clicked` events by their stamped `day`; an ask counts for an antique only when its
 * `workId` says so (an ask from the footer is no antique's). The maker and place of an item are
 * read from the works' records, not from the event — the beacon never carried them.
 * No price, no price band: the events hold none (§4).
 */
import { compared, type Compared } from '../compare'
import type { DashboardContext } from '../context'
import { inPeriod, inPrevious, num, rowsOf, sql, eventsFilter, type SQL } from '../sql'

export type AntiqueRow = {
  readonly workId: number
  readonly title: string | null
  readonly stockNumber: string | null
  readonly views: Compared
  readonly zooms: number
  readonly asks: number
  /** Asks per view in the period, 0–1; null with no views. */
  readonly askRate: number | null
}

export type DimensionRow = {
  readonly key: string
  readonly views: Compared
  readonly asks: number
  readonly askRate: number | null
}

export type AntiquesPanel = {
  readonly hasData: boolean
  readonly views: Compared
  readonly asks: Compared
  readonly mostViewed: readonly AntiqueRow[]
  readonly mostZoomed: readonly AntiqueRow[]
  readonly byType: readonly DimensionRow[]
  readonly byMaker: readonly DimensionRow[]
  readonly byPlace: readonly DimensionRow[]
}

const NAMES = ['item.viewed', 'item.zoomed', 'ask.clicked'] as const
const TOP = 10
/** The most works one request tallies, a safety bound for a very busy period. */
const WORK_LIMIT = 5000

const rate = (asks: number, views: number): number | null => (views > 0 ? asks / views : null)

/** One row per work with its counts in both periods; shared by every query below. */
function perWork(ctx: DashboardContext): SQL {
  const count = (name: string, range: SQL) =>
    sql`count(*) FILTER (WHERE name = ${name} AND ${range})`
  return sql`per_work AS (
    SELECT CASE WHEN props->>'workId' ~ '^[0-9]{1,9}$' THEN (props->>'workId')::int END AS work_id,
      ${count('item.viewed', inPeriod(ctx))} AS views,
      ${count('item.viewed', inPrevious(ctx))} AS views_previous,
      ${count('item.zoomed', inPeriod(ctx))} AS zooms,
      ${count('ask.clicked', inPeriod(ctx))} AS asks,
      ${count('ask.clicked', inPrevious(ctx))} AS asks_previous
    FROM events WHERE ${eventsFilter(ctx, NAMES)}
    GROUP BY 1)`
}

type WorkRow = {
  work_id: unknown
  views: unknown
  views_previous: unknown
  zooms: unknown
  asks: unknown
  asks_previous: unknown
}

async function dimension(ctx: DashboardContext, join: SQL, key: SQL): Promise<DimensionRow[]> {
  const rows = await rowsOf<{
    key: string
    views: unknown
    views_previous: unknown
    asks: unknown
  }>(
    ctx.payload,
    sql`WITH ${perWork(ctx)}
        SELECT ${key} AS key, sum(pw.views) AS views, sum(pw.views_previous) AS views_previous,
          sum(pw.asks) AS asks
        FROM per_work pw ${join}
        WHERE pw.work_id IS NOT NULL AND ${key} IS NOT NULL
        GROUP BY 1 HAVING sum(pw.views) > 0
        ORDER BY views DESC, key ASC LIMIT ${TOP}`,
  )
  return rows.map((r) => ({
    key: String(r.key),
    views: compared(num(r.views), num(r.views_previous)),
    asks: num(r.asks),
    askRate: rate(num(r.asks), num(r.views)),
  }))
}

async function describe(
  ctx: DashboardContext,
  ids: readonly number[],
): Promise<Map<number, { title: string | null; stockNumber: string | null }>> {
  if (ids.length === 0) return new Map()
  const list = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )
  const rows = await rowsOf<{ id: number; stock_number: string | null; title: string | null }>(
    ctx.payload,
    sql`SELECT w.id, w.stock_number, wl.title
        FROM works w LEFT JOIN works_locales wl ON wl._parent_id = w.id AND wl._locale = 'en'
        WHERE w.id IN (${list})`,
  )
  return new Map(rows.map((r) => [Number(r.id), { title: r.title, stockNumber: r.stock_number }]))
}

export async function loadAntiques(ctx: DashboardContext): Promise<AntiquesPanel> {
  const rows = (
    await rowsOf<WorkRow>(
      ctx.payload,
      sql`WITH ${perWork(ctx)}
          SELECT * FROM per_work WHERE work_id IS NOT NULL
          ORDER BY views DESC, work_id ASC LIMIT ${WORK_LIMIT}`,
    )
  ).map((r) => ({
    workId: num(r.work_id),
    views: num(r.views),
    viewsPrevious: num(r.views_previous),
    zooms: num(r.zooms),
    asks: num(r.asks),
    asksPrevious: num(r.asks_previous),
  }))
  const mostViewed = rows.filter((r) => r.views > 0).slice(0, TOP)
  const mostZoomed = rows
    .filter((r) => r.zooms > 0)
    .sort((a, b) => b.zooms - a.zooms || a.workId - b.workId)
    .slice(0, TOP)
  const named = await describe(ctx, [
    ...new Set([...mostViewed, ...mostZoomed].map((r) => r.workId)),
  ])
  const row = (r: (typeof rows)[number]): AntiqueRow => ({
    workId: r.workId,
    title: named.get(r.workId)?.title ?? null,
    stockNumber: named.get(r.workId)?.stockNumber ?? null,
    views: compared(r.views, r.viewsPrevious),
    zooms: r.zooms,
    asks: r.asks,
    askRate: rate(r.asks, r.views),
  })
  const total = (field: 'views' | 'viewsPrevious' | 'asks' | 'asksPrevious') =>
    rows.reduce((sum, r) => sum + r[field], 0)
  const [byType, byMaker, byPlace] = await Promise.all([
    dimension(ctx, sql`JOIN works w ON w.id = pw.work_id`, sql`w.object_type::text`),
    dimension(
      ctx,
      sql`JOIN (SELECT DISTINCT _parent_id, maker_id FROM works_makers) wm ON wm._parent_id = pw.work_id
          JOIN makers m ON m.id = wm.maker_id`,
      sql`m.name`,
    ),
    dimension(
      ctx,
      sql`JOIN (SELECT DISTINCT _parent_id, place_id FROM works_places) wp ON wp._parent_id = pw.work_id
          JOIN places_locales pl ON pl._parent_id = wp.place_id AND pl._locale = 'en'`,
      sql`pl.name`,
    ),
  ])
  const views = compared(total('views'), total('viewsPrevious'))
  return {
    hasData: views.current > 0 || rows.some((r) => r.zooms > 0),
    views,
    asks: compared(total('asks'), total('asksPrevious')),
    mostViewed: mostViewed.map(row),
    mostZoomed: mostZoomed.map(row),
    byType,
    byMaker,
    byPlace,
  }
}
