/**
 * Chat (ANALYTICS.md §8; AI.md §6–§7): from `chat-sessions` — sessions, hand-offs, leads
 * captured, hand-off rate, refusals and blocks, and what the AI cost — and the hand-offs by
 * channel from the server's own `chat.handedOff` events (written with the hand-off, in its
 * transaction; the session record does not keep the channel). A lead flagged spam is not a lead
 * captured.
 */
import { compared, type Compared, type Counted } from '../compare'
import type { DashboardContext } from '../context'
import { sql, topCounts } from '../sql'

import { findAll, periodOfInstant, spanWhere, type Row } from './records'

export type ChatPanel = {
  readonly hasData: boolean
  readonly sessions: Compared
  readonly handoffs: Compared
  /** Hand-offs per session in percent; 0 in a period with no session. */
  readonly handoffRate: Compared
  readonly leadsCaptured: Compared
  readonly refused: Compared
  readonly blocked: Compared
  /** What the AI cost in USD, summed from the sessions' usage. */
  readonly costUsd: Compared
  readonly handoffsByChannel: readonly Counted[]
}

const idOf = (value: unknown): unknown =>
  value !== null && typeof value === 'object' ? (value as { id?: unknown }).id : value

const costOf = (row: Row): number => {
  const cost = Number((row.usage as { costUsd?: unknown } | null | undefined)?.costUsd ?? 0)
  return Number.isFinite(cost) ? cost : 0
}

export async function loadChat(ctx: DashboardContext): Promise<ChatPanel> {
  const [rows, spam, handoffsByChannel] = await Promise.all([
    findAll(ctx, 'chat-sessions', {
      where: { and: [{ site: { equals: ctx.site } }, spanWhere(ctx, 'startedAt')] },
      select: { startedAt: true, outcome: true, lead: true, usage: true },
    }),
    findAll(ctx, 'leads', {
      where: { and: [{ site: { equals: ctx.site } }, { status: { equals: 'spam' } }] },
      select: { id: true },
    }),
    topCounts(ctx, ['chat.handedOff'], sql`props->>'channel'`, { limit: 5 }),
  ])
  const spamIds = new Set(spam.map((lead) => String(lead.id)))
  const measure = (which: 'current' | 'previous') => {
    const list = rows.filter((r) => periodOfInstant(ctx, r.startedAt) === which)
    const outcomes = (name: string) => list.filter((r) => r.outcome === name).length
    const captured = list.filter((r) => {
      const lead = idOf(r.lead)
      return lead !== null && lead !== undefined && !spamIds.has(String(lead))
    }).length
    const cost = list.reduce((sum, r) => sum + costOf(r), 0)
    return {
      sessions: list.length,
      handoffs: outcomes('handoff'),
      refused: outcomes('refused'),
      blocked: outcomes('blocked'),
      captured,
      cost: Math.round(cost * 10_000) / 10_000,
    }
  }
  const now = measure('current')
  const before = measure('previous')
  const rate = (m: { handoffs: number; sessions: number }) =>
    m.sessions === 0 ? 0 : Math.round((m.handoffs / m.sessions) * 1000) / 10
  return {
    hasData: now.sessions > 0,
    sessions: compared(now.sessions, before.sessions),
    handoffs: compared(now.handoffs, before.handoffs),
    handoffRate: compared(rate(now), rate(before)),
    leadsCaptured: compared(now.captured, before.captured),
    refused: compared(now.refused, before.refused),
    blocked: compared(now.blocked, before.blocked),
    costUsd: compared(now.cost, before.cost),
    handoffsByChannel,
  }
}
