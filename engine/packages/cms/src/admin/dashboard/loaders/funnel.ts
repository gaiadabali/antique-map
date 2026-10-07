/**
 * The shop's funnel (ANALYTICS.md §8): product viewed → added to cart → checkout started →
 * delivery step → paid, with the drop at each step, by device; `checkout.blocked` by reason. From
 * the beacon and server events (ANALYTICS.md §4): `product.viewed`, `cart.added`,
 * `checkout.started`, `checkout.stepCompleted` (`step: 'delivery'`) and `order.paid`.
 */
import { compared, type Compared, type Counted } from '../compare'
import type { DashboardContext } from '../context'
import { eventsFilter, inPeriod, inPrevious, num, rowsOf, sql, topCounts } from '../sql'

export type FunnelStep = { readonly key: string; readonly label: string; readonly count: Compared }

export type DeviceSteps = {
  readonly device: string
  readonly steps: Readonly<Record<string, number>>
}

export type FunnelPanel = {
  readonly hasData: boolean
  readonly steps: readonly FunnelStep[]
  readonly byDevice: readonly DeviceSteps[]
  readonly blockedByReason: readonly Counted[]
}

const STEPS = [
  { key: 'viewed', label: 'funnelViewed', match: sql`name = 'product.viewed'` },
  { key: 'addedToCart', label: 'funnelAdded', match: sql`name = 'cart.added'` },
  { key: 'checkoutStarted', label: 'funnelCheckout', match: sql`name = 'checkout.started'` },
  {
    key: 'deliveryStep',
    label: 'funnelDelivery',
    match: sql`name = 'checkout.stepCompleted' AND props->>'step' = 'delivery'`,
  },
  { key: 'paid', label: 'funnelPaid', match: sql`name = 'order.paid'` },
] as const

const ALL_NAMES = [
  'product.viewed',
  'cart.added',
  'checkout.started',
  'checkout.stepCompleted',
  'order.paid',
] as const

export async function loadFunnel(ctx: DashboardContext): Promise<FunnelPanel | null> {
  if (ctx.site !== 'shop') return null

  const totalsSelect = sql.join(
    STEPS.flatMap(({ key, match }) => [
      sql`count(*) FILTER (WHERE (${match}) AND ${inPeriod(ctx)}) AS ${sql.raw(`${key}_current`)}`,
      sql`count(*) FILTER (WHERE (${match}) AND ${inPrevious(ctx)}) AS ${sql.raw(`${key}_previous`)}`,
    ]),
    sql`, `,
  )
  const [totals] = await rowsOf<Record<string, unknown>>(
    ctx.payload,
    sql`SELECT ${totalsSelect} FROM events WHERE ${eventsFilter(ctx, ALL_NAMES)}`,
  )
  const steps: FunnelStep[] = STEPS.map(({ key, label }) => ({
    key,
    label,
    count: compared(num(totals?.[`${key}_current`]), num(totals?.[`${key}_previous`])),
  }))

  const deviceSelect = sql.join(
    STEPS.map(({ key, match }) => sql`count(*) FILTER (WHERE ${match}) AS ${sql.raw(key)}`),
    sql`, `,
  )
  const deviceRows = await rowsOf<{ device: string } & Record<string, unknown>>(
    ctx.payload,
    sql`SELECT device_class::text AS device, ${deviceSelect}
        FROM events
        WHERE site = ${ctx.site} AND name IN (${sql.join(
          ALL_NAMES.map((name) => sql`${name}`),
          sql`, `,
        )}) AND ${inPeriod(ctx)}
        GROUP BY 1
        ORDER BY 1`,
  )
  const byDevice: DeviceSteps[] = deviceRows.map((row) => ({
    device: row.device,
    steps: Object.fromEntries(STEPS.map(({ key }) => [key, num(row[key])])),
  }))

  const blockedByReason = await topCounts(ctx, ['checkout.blocked'], sql`props->>'reason'`, {
    limit: 10,
  })

  return {
    hasData: steps.some((s) => s.count.current > 0) || blockedByReason.length > 0,
    steps,
    byDevice,
    blockedByReason,
  }
}
