/**
 * Search (ANALYTICS.md §8): the top queries, and the **zero-result** ones — the buying list, what
 * collectors want that is not in the drawers. From `search.submitted` events; the query was
 * redacted before it was stored (§5), and a query that was nothing but `[removed]` is left out of
 * the lists, which would otherwise be topped by it.
 */
import { compared, type Compared, type Counted } from '../compare'
import type { DashboardContext } from '../context'
import { inPeriod, inPrevious, num, rowsOf, sql, eventsFilter, topCounts } from '../sql'

export type SearchPanel = {
  readonly hasData: boolean
  readonly searches: Compared
  readonly zeroResults: Compared
  readonly topQueries: readonly Counted[]
  /** The queries that found nothing, most asked first, each with its count. */
  readonly zeroResultQueries: readonly Counted[]
}

const NAMES = ['search.submitted'] as const
const QUERY = sql`lower(props->>'query')`

export async function loadSearch(ctx: DashboardContext): Promise<SearchPanel> {
  const [totals] = await rowsOf<{
    current: unknown
    previous: unknown
    zero_current: unknown
    zero_previous: unknown
  }>(
    ctx.payload,
    sql`SELECT count(*) FILTER (WHERE ${inPeriod(ctx)}) AS current,
          count(*) FILTER (WHERE ${inPrevious(ctx)}) AS previous,
          count(*) FILTER (WHERE ${inPeriod(ctx)} AND props->>'zeroResults' = 'true') AS zero_current,
          count(*) FILTER (WHERE ${inPrevious(ctx)} AND props->>'zeroResults' = 'true') AS zero_previous
        FROM events WHERE ${eventsFilter(ctx, NAMES)}`,
  )
  const readable = sql`props->>'query' <> '[removed]' AND props->>'query' <> ''`
  const [topQueries, zeroResultQueries] = await Promise.all([
    topCounts(ctx, NAMES, QUERY, { where: readable }),
    topCounts(ctx, NAMES, QUERY, {
      where: sql`${readable} AND props->>'zeroResults' = 'true'`,
      limit: 20,
    }),
  ])
  const searches = compared(num(totals?.current), num(totals?.previous))
  return {
    hasData: searches.current > 0,
    searches,
    zeroResults: compared(num(totals?.zero_current), num(totals?.zero_previous)),
    topQueries,
    zeroResultQueries,
  }
}
