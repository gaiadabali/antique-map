/**
 * Payments (ANALYTICS.md §8): method mix and the expired-unpaid rate from `orders`; flagged
 * payments from `payment-events` — the outcomes `shop/payments/decide.ts` raises a flag for
 * (an amount mismatch, a payment after expiry or cancellation, a second settled payment, a card
 * under fraud challenge). Counts only, by outcome: no order id, no amount, no buyer detail.
 */
import { compared, type Compared, type Counted } from '../compare'
import type { DashboardContext } from '../context'

import { findAll, periodOfInstant, rankCounted, spanWhere, type Row } from './records'
import { PAID_ORDER_EXCLUDED_STATUSES } from './sales'

/** The outcomes `decide.ts` raises a flag for — money that needs a staff decision. */
export const FLAGGED_OUTCOMES = [
  'amount-mismatch',
  'late-payment',
  'double-payment',
  'fraud-challenge',
] as const

export type PaymentsPanel = {
  readonly hasData: boolean
  readonly methodMix: readonly Counted[]
  readonly expiredUnpaidRate: Compared
  readonly flagged: readonly Counted[]
}

type OrderRow = Row & {
  payment?: { paidAt?: unknown; method?: unknown }
  status?: unknown
  createdAt?: unknown
}

export async function loadPayments(ctx: DashboardContext): Promise<PaymentsPanel | null> {
  if (ctx.site !== 'shop') return null
  const [paidRows, createdRows, eventRows] = await Promise.all([
    findAll(ctx, 'orders', {
      where: {
        and: [
          { site: { equals: 'shop' } },
          { status: { not_in: PAID_ORDER_EXCLUDED_STATUSES } },
          spanWhere(ctx, 'payment.paidAt'),
        ],
      },
      select: { payment: { paidAt: true, method: true } },
    }) as Promise<OrderRow[]>,
    findAll(ctx, 'orders', {
      where: { and: [{ site: { equals: 'shop' } }, spanWhere(ctx, 'createdAt')] },
      select: { createdAt: true, status: true },
    }) as Promise<OrderRow[]>,
    findAll(ctx, 'payment-events', {
      where: spanWhere(ctx, 'receivedAt'),
      select: { outcome: true, receivedAt: true },
    }),
  ])

  const paidCurrent = paidRows.filter((r) => periodOfInstant(ctx, r.payment?.paidAt) === 'current')
  const paidPrevious = paidRows.filter(
    (r) => periodOfInstant(ctx, r.payment?.paidAt) === 'previous',
  )
  const methodMix = rankCounted(
    paidCurrent,
    paidPrevious,
    (r) => (r as OrderRow).payment?.method as string | undefined,
  )

  const createdCurrent = createdRows.filter((r) => periodOfInstant(ctx, r.createdAt) === 'current')
  const createdPrevious = createdRows.filter(
    (r) => periodOfInstant(ctx, r.createdAt) === 'previous',
  )
  const expiredShare = (list: OrderRow[]) =>
    list.length === 0
      ? 0
      : Math.round((list.filter((r) => r.status === 'expired').length / list.length) * 1000) / 10
  const expiredUnpaidRate = compared(expiredShare(createdCurrent), expiredShare(createdPrevious))

  const eventCurrent = eventRows.filter((r) => periodOfInstant(ctx, r.receivedAt) === 'current')
  const eventPrevious = eventRows.filter((r) => periodOfInstant(ctx, r.receivedAt) === 'previous')
  const flagged = rankCounted(
    eventCurrent.filter((r) =>
      (FLAGGED_OUTCOMES as readonly string[]).includes(r.outcome as string),
    ),
    eventPrevious.filter((r) =>
      (FLAGGED_OUTCOMES as readonly string[]).includes(r.outcome as string),
    ),
    (r) => r.outcome as string | undefined,
  )

  return {
    hasData: paidCurrent.length > 0 || flagged.some((f) => f.current > 0 || f.previous > 0),
    methodMix,
    expiredUnpaidRate,
    flagged,
  }
}
