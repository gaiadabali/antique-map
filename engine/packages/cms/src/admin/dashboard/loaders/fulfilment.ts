/**
 * Fulfilment (ANALYTICS.md §8): from `orders.history` (COMMERCE.md §7–§8) — the time from paid to
 * processing, to on the way, to delivered, per store; orders waiting now, by their current status;
 * the expired and cancelled share of orders created in the period. The store is the order's own
 * `storeSnapshot.code` (COMMERCE.md §1.4), never a fresh read of `stores`.
 *
 * A duration counts in the period of the move that completes it (when the order reached the later
 * status), not of order creation: a paid-to-processing time recorded this week is this week's
 * fulfilment, whenever the order itself was placed.
 */
import { compared, median, type Compared } from '../compare'
import type { DashboardContext } from '../context'
import type { OrderStatus } from '../../../collections/orders/statuses'

import { findAll, periodOfInstant, type Row } from './records'

export type StoreDuration = {
  readonly store: string
  readonly medianHours: number | null
  readonly orders: number
}

export type WaitingNow = { readonly status: OrderStatus; readonly count: number }

export type FulfilmentPanel = {
  readonly hasData: boolean
  readonly paidToProcessing: readonly StoreDuration[]
  readonly processingToOnTheWay: readonly StoreDuration[]
  readonly onTheWayToDelivered: readonly StoreDuration[]
  readonly waitingNow: readonly WaitingNow[]
  readonly expiredCancelledShare: Compared
}

const WAITING_STATUSES = ['paid', 'processing', 'waiting_driver', 'on_the_way'] as const

type HistoryEntry = { to?: unknown; at?: unknown }
type OrderRow = Row & {
  status?: unknown
  createdAt?: unknown
  storeSnapshot?: { code?: unknown }
  history?: readonly HistoryEntry[]
}

/** The instant `order` first reached `status`, or `null` if it never did. */
function reachedAt(order: OrderRow, status: string): Date | null {
  for (const entry of order.history ?? []) {
    if (entry.to === status && typeof entry.at === 'string') return new Date(entry.at)
  }
  return null
}

function durationsByStore(
  ctx: DashboardContext,
  rows: readonly OrderRow[],
  from: string,
  to: string,
): StoreDuration[] {
  const byStore = new Map<string, number[]>()
  for (const row of rows) {
    const start = reachedAt(row, from)
    const end = reachedAt(row, to)
    if (start === null || end === null || end.getTime() < start.getTime()) continue
    if (periodOfInstant(ctx, end) !== 'current') continue
    const code = typeof row.storeSnapshot?.code === 'string' ? row.storeSnapshot.code : 'unknown'
    const hours = (end.getTime() - start.getTime()) / 3_600_000
    const list = byStore.get(code) ?? []
    list.push(hours)
    byStore.set(code, list)
  }
  return [...byStore.entries()]
    .map(([store, hours]) => ({ store, medianHours: median(hours), orders: hours.length }))
    .sort((a, b) => a.store.localeCompare(b.store))
}

export async function loadFulfilment(ctx: DashboardContext): Promise<FulfilmentPanel | null> {
  if (ctx.site !== 'shop') return null
  const rows = (await findAll(ctx, 'orders', {
    where: { site: { equals: 'shop' } },
    select: {
      status: true,
      createdAt: true,
      storeSnapshot: { code: true },
      history: { to: true, at: true },
    },
  })) as OrderRow[]

  const waitingNow: WaitingNow[] = WAITING_STATUSES.map((status) => ({
    status,
    count: rows.filter((r) => r.status === status).length,
  }))

  const createdIn = (which: 'current' | 'previous') =>
    rows.filter((r) => periodOfInstant(ctx, r.createdAt) === which)
  const share = (list: OrderRow[]) =>
    list.length === 0
      ? 0
      : Math.round(
          (list.filter((r) => r.status === 'expired' || r.status === 'cancelled').length /
            list.length) *
            1000,
        ) / 10
  const expiredCancelledShare = compared(share(createdIn('current')), share(createdIn('previous')))

  return {
    hasData: rows.length > 0,
    paidToProcessing: durationsByStore(ctx, rows, 'paid', 'processing'),
    processingToOnTheWay: durationsByStore(ctx, rows, 'processing', 'on_the_way'),
    onTheWayToDelivered: durationsByStore(ctx, rows, 'on_the_way', 'delivered'),
    waitingNow,
    expiredCancelledShare,
  }
}
