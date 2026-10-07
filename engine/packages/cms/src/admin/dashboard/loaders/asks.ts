/**
 * Asks and sells (ANALYTICS.md §8): taps by channel and context from the beacon, and — from
 * `leads`, the records — leads by kind (a lead flagged spam is not counted) and the time to a
 * first reply against the same-working-day promise (G9). A WhatsApp or email tap leaves no record
 * on the site, so it is a tap here, never a lead (§1): the two are shown side by side, never added.
 *
 * The promise is read as: a lead made on a working day (Monday to Friday, Singapore time) is
 * answered in time when its first reply lands before that day ends; one made at a weekend, by the
 * end of Monday. The calendar of working days is the dashboard's assumption until the owner's
 * hours (a localised text in the site settings) become something a machine can read.
 */
import { compared, median, type Compared, type Counted } from '../compare'
import type { DashboardContext } from '../context'
import { instantBounds, shiftDay, witaDay } from '../period'
import { eventsFilter, inPeriod, inPrevious, num, rowsOf, sql, topCounts } from '../sql'

import { findAll, periodOfInstant, spanWhere, type Row } from './records'

export const LEAD_KINDS = ['ask', 'sell', 'partnership', 'contact', 'chat'] as const

export type ReplyStats = {
  /** Leads in the period with a first reply. */
  readonly answered: number
  readonly inTime: number
  readonly late: number
  /** No reply yet and the promise already broken. */
  readonly overdue: number
  /** No reply yet and still inside the promise. */
  readonly open: number
  readonly medianHours: number | null
  /** Share of leads answered in time, in percent; null with no lead. */
  readonly inTimePct: Compared | null
}

export type AsksPanel = {
  readonly hasData: boolean
  readonly taps: Compared
  readonly byChannel: readonly Counted[]
  readonly byContext: readonly Counted[]
  readonly leads: Compared
  readonly leadsByKind: readonly { readonly kind: string; readonly leads: Compared }[]
  readonly replies: ReplyStats
}

/** The instant a lead made at `createdAt` must be answered by (see the file's header). */
export function replyDeadline(createdAt: Date): Date {
  const day = witaDay(createdAt)
  const weekday = new Date(`${day}T00:00:00.000Z`).getUTCDay()
  const toMonday = weekday === 6 ? 2 : weekday === 0 ? 1 : 0
  return instantBounds({ from: shiftDay(day, toMonday), to: shiftDay(day, toMonday) }).end
}

function replyStats(ctx: DashboardContext, leads: Row[]): Omit<ReplyStats, 'inTimePct'> {
  const stats = { answered: 0, inTime: 0, late: 0, overdue: 0, open: 0 }
  const hours: number[] = []
  for (const lead of leads) {
    const created = new Date(String(lead.createdAt))
    const deadline = replyDeadline(created)
    if (typeof lead.firstReplyAt === 'string') {
      const replied = new Date(lead.firstReplyAt)
      stats.answered += 1
      hours.push(Math.max(0, (replied.getTime() - created.getTime()) / 3_600_000))
      if (replied.getTime() < deadline.getTime()) stats.inTime += 1
      else stats.late += 1
    } else if (ctx.now.getTime() >= deadline.getTime()) stats.overdue += 1
    else stats.open += 1
  }
  return { ...stats, medianHours: median(hours) }
}

export async function loadAsks(ctx: DashboardContext): Promise<AsksPanel> {
  const tapNames =
    ctx.site === 'gallery'
      ? ['ask.clicked', 'sell.clicked']
      : ['ask.clicked', 'partnership.clicked']
  const [tapTotals] = await rowsOf<{ current: unknown; previous: unknown }>(
    ctx.payload,
    sql`SELECT count(*) FILTER (WHERE ${inPeriod(ctx)}) AS current,
          count(*) FILTER (WHERE ${inPrevious(ctx)}) AS previous
        FROM events WHERE ${eventsFilter(ctx, tapNames)}`,
  )
  const [byChannel, byContext, rows] = await Promise.all([
    topCounts(ctx, tapNames, sql`props->>'channel'`, { limit: 5 }),
    topCounts(ctx, ['ask.clicked'], sql`props->>'context'`, { limit: 5 }),
    findAll(ctx, 'leads', {
      where: {
        and: [
          { site: { equals: ctx.site } },
          { status: { not_equals: 'spam' } },
          spanWhere(ctx, 'createdAt'),
        ],
      },
      select: { kind: true, createdAt: true, firstReplyAt: true },
    }),
  ])
  const current = rows.filter((r) => periodOfInstant(ctx, r.createdAt) === 'current')
  const previous = rows.filter((r) => periodOfInstant(ctx, r.createdAt) === 'previous')
  const count = (list: Row[], kind: string) => list.filter((r) => r.kind === kind).length
  const stats = replyStats(ctx, current)
  const before = replyStats(ctx, previous)
  const pct = (s: { inTime: number }, n: number) =>
    n === 0 ? 0 : Math.round((s.inTime / n) * 1000) / 10
  const taps = compared(num(tapTotals?.current), num(tapTotals?.previous))
  return {
    hasData: taps.current > 0 || current.length > 0,
    taps,
    byChannel,
    byContext,
    leads: compared(current.length, previous.length),
    leadsByKind: LEAD_KINDS.map((kind) => ({
      kind,
      leads: compared(count(current, kind), count(previous, kind)),
    })).filter((k) => k.leads.current > 0 || k.leads.previous > 0),
    replies: {
      ...stats,
      inTimePct:
        current.length === 0
          ? null
          : compared(pct(stats, current.length), pct(before, previous.length)),
    },
  }
}
