/**
 * Sales (ANALYTICS.md §8): from `orders` — paid orders, revenue and the average order, by store, by
 * distance band, by product and by category, discount use and the free-delivery share. Never from
 * `order.paid` events (ANALYTICS.md §1): a replayed or rolled-back payment could contradict them. A
 * paid order is one with a `payment.paidAt` in the period whose status was never later cancelled or
 * expired (COMMERCE.md §12–§13). Money is the order's own `totals`, integer rupiah, as stored — no
 * re-pricing, no second rounding.
 *
 * The store, the line's name and SKU are the order's own snapshot (COMMERCE.md §1.4), never a fresh
 * read of `stores` or `products`: editing either later changes no past sale. Only the category is
 * not on the snapshot, so it is read from `products`/`terms` as they stand today — a reporting
 * dimension, not a transactional fact.
 */
import { compared, rankMoney, type Compared, type MoneyRanked } from '../compare'
import type { DashboardContext } from '../context'

import { findAll, idOf, periodOfInstant, spanWhere, type Row } from './records'

export const PAID_ORDER_EXCLUDED_STATUSES = [
  'awaiting_quote',
  'pending_payment',
  'cancelled',
  'expired',
] as const

/** The outer edge of each reporting band, in km; the last is open-ended. */
const DISTANCE_BAND_EDGES = [2, 5, 10, 20] as const

export function distanceBandOf(km: unknown): string | null {
  const value = Number(km)
  if (!Number.isFinite(value)) return null
  for (const edge of DISTANCE_BAND_EDGES) if (value <= edge) return `≤${edge} km`
  return `>${DISTANCE_BAND_EDGES[DISTANCE_BAND_EDGES.length - 1]} km`
}

export type SalesPanel = {
  readonly hasData: boolean
  readonly paidOrders: Compared
  readonly revenue: Compared
  readonly averageOrder: Compared
  readonly discountShare: Compared
  readonly freeDeliveryShare: Compared
  readonly byStore: readonly MoneyRanked[]
  readonly byDistanceBand: readonly MoneyRanked[]
  readonly byProduct: readonly MoneyRanked[]
  readonly byCategory: readonly MoneyRanked[]
}

type OrderRow = Row & {
  payment?: { paidAt?: unknown }
  totals?: { total?: unknown; deliveryFee?: unknown }
  discount?: { code?: unknown }
  distanceKm?: unknown
  storeSnapshot?: { code?: unknown; name?: unknown }
  lines?: ReadonlyArray<{ product?: unknown; sku?: unknown; name?: unknown; lineTotal?: unknown }>
}

const totalOf = (row: OrderRow): number => Number(row.totals?.total ?? 0)
const hasDiscount = (row: OrderRow): boolean =>
  typeof row.discount?.code === 'string' && row.discount.code.length > 0
const isFreeDelivery = (row: OrderRow): boolean => Number(row.totals?.deliveryFee ?? -1) === 0

async function categoryByProduct(
  ctx: DashboardContext,
  productIds: readonly number[],
): Promise<Map<number, string>> {
  if (productIds.length === 0) return new Map()
  const products = await findAll(ctx, 'products', {
    where: { id: { in: productIds } },
    select: { category: true },
  })
  const categoryOf = new Map<number, number | null>()
  const categoryIds = new Set<number>()
  for (const product of products) {
    const id = idOf((product as { category?: unknown }).category)
    const categoryId = id === null || id === undefined ? null : Number(id)
    categoryOf.set(Number(product.id), categoryId)
    if (categoryId !== null) categoryIds.add(categoryId)
  }
  const terms =
    categoryIds.size === 0
      ? []
      : await findAll(ctx, 'terms', {
          where: { id: { in: [...categoryIds] } },
          select: { label: true },
        })
  const labelOf = new Map(terms.map((t) => [Number(t.id), String((t as Row).label ?? '')]))
  const result = new Map<number, string>()
  for (const [productId, categoryId] of categoryOf) {
    const label = categoryId === null ? null : labelOf.get(categoryId)
    result.set(productId, label && label.length > 0 ? label : 'uncategorised')
  }
  return result
}

export async function loadSales(ctx: DashboardContext): Promise<SalesPanel | null> {
  if (ctx.site !== 'shop') return null
  const rows = (await findAll(ctx, 'orders', {
    where: {
      and: [
        { site: { equals: 'shop' } },
        { status: { not_in: PAID_ORDER_EXCLUDED_STATUSES } },
        spanWhere(ctx, 'payment.paidAt'),
      ],
    },
    select: {
      payment: { paidAt: true },
      totals: { total: true, deliveryFee: true },
      discount: { code: true },
      distanceKm: true,
      storeSnapshot: { code: true, name: true },
      lines: { product: true, sku: true, name: true, lineTotal: true },
    },
  })) as OrderRow[]

  const current = rows.filter((r) => periodOfInstant(ctx, r.payment?.paidAt) === 'current')
  const previous = rows.filter((r) => periodOfInstant(ctx, r.payment?.paidAt) === 'previous')

  const revenueOf = (list: OrderRow[]) => list.reduce((sum, r) => sum + totalOf(r), 0)
  const shareOf = (list: OrderRow[], test: (r: OrderRow) => boolean) =>
    list.length === 0 ? 0 : Math.round((list.filter(test).length / list.length) * 1000) / 10
  const averageOf = (list: OrderRow[]) =>
    list.length === 0 ? 0 : Math.round(revenueOf(list) / list.length)

  const paidOrders = compared(current.length, previous.length)
  const revenue = compared(revenueOf(current), revenueOf(previous))

  const productIds = [
    ...new Set(
      current.flatMap((r) =>
        (r.lines ?? [])
          .map((line) => idOf(line.product))
          .filter((id): id is number | string => id !== null && id !== undefined)
          .map(Number),
      ),
    ),
  ]
  const categories = await categoryByProduct(ctx, productIds)

  return {
    hasData: paidOrders.current > 0,
    paidOrders,
    revenue,
    averageOrder: compared(averageOf(current), averageOf(previous)),
    discountShare: compared(shareOf(current, hasDiscount), shareOf(previous, hasDiscount)),
    freeDeliveryShare: compared(
      shareOf(current, isFreeDelivery),
      shareOf(previous, isFreeDelivery),
    ),
    byStore: rankMoney(
      current.map((r) => ({
        key: typeof r.storeSnapshot?.code === 'string' ? r.storeSnapshot.code : null,
        amount: totalOf(r),
      })),
    ),
    byDistanceBand: rankMoney(
      current.map((r) => ({ key: distanceBandOf(r.distanceKm), amount: totalOf(r) })),
    ),
    byProduct: rankMoney(
      current.flatMap((r) =>
        (r.lines ?? []).map((line) => ({
          key: typeof line.name === 'string' && line.name.length > 0 ? line.name : null,
          amount: Number(line.lineTotal ?? 0),
        })),
      ),
    ),
    byCategory: rankMoney(
      current.flatMap((r) =>
        (r.lines ?? []).map((line) => {
          const id = idOf(line.product)
          const category = id === null || id === undefined ? null : categories.get(Number(id))
          return { key: category ?? 'uncategorised', amount: Number(line.lineTotal ?? 0) }
        }),
      ),
    ),
  }
}
