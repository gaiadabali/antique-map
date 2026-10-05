/**
 * Paid orders and revenue (ANALYTICS.md §1, §8): counted from `orders` — the record — and never
 * from `order.paid` events, which a replayed or rolled-back payment could contradict. A paid order
 * is one with a `payment.paidAt` in the period that has not since been cancelled or expired.
 * Revenue is the order's own `totals.total`, integer rupiah, as stored. The shop's Sales panel
 * (run 2 of the dashboard) grows from this loader; the gallery has no orders.
 */
import { compared, type Compared } from '../compare'
import type { DashboardContext } from '../context'

import { findAll, periodOfInstant, spanWhere } from './records'

export type BusinessPanel = {
  readonly hasData: boolean
  readonly paidOrders: Compared
  /** Integer rupiah. */
  readonly revenue: Compared
}

export async function loadBusiness(ctx: DashboardContext): Promise<BusinessPanel | null> {
  if (ctx.site !== 'shop') return null
  const rows = await findAll(ctx, 'orders', {
    where: {
      and: [
        { site: { equals: 'shop' } },
        { status: { not_in: ['pending_payment', 'cancelled', 'expired'] } },
        spanWhere(ctx, 'payment.paidAt'),
      ],
    },
    select: { payment: { paidAt: true }, totals: { total: true } },
  })
  const tally = (which: 'current' | 'previous') => {
    const list = rows.filter(
      (r) =>
        periodOfInstant(ctx, (r.payment as { paidAt?: unknown } | undefined)?.paidAt) === which,
    )
    return {
      orders: list.length,
      revenue: list.reduce(
        (sum, r) => sum + Number((r.totals as { total?: unknown } | undefined)?.total ?? 0),
        0,
      ),
    }
  }
  const now = tally('current')
  const before = tally('previous')
  return {
    hasData: now.orders > 0,
    paidOrders: compared(now.orders, before.orders),
    revenue: compared(now.revenue, before.revenue),
  }
}
