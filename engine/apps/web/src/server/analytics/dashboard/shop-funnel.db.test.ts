/**
 * The shop's event-based panels on a real Postgres (TASKS.md 9.2.b, run 2): Funnel and Web vitals,
 * from the beacon's own events (ANALYTICS.md §4), seeded through the real `collect` write path.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { loadDashboard } from '../../../../../../packages/cms/src/admin/dashboard/loaders'
import { resolvePeriod } from '../../../../../../packages/cms/src/admin/dashboard/period'

import { server, startDashboardStack, type Dashboardish } from './dashboard.test-support'

const viewed = (at: string) => ({
  name: 'product.viewed',
  at,
  props: { productId: 1, categorySlug: 'mugs', inStock: true },
})
const added = (at: string) => ({
  name: 'cart.added',
  at,
  props: { productId: 1, variantSku: 'MUG', qty: 1, value: 95000 },
})
const started = (at: string) => ({
  name: 'checkout.started',
  at,
  props: { lines: 1, subtotal: 95000 },
})
const delivery = (at: string) => ({
  name: 'checkout.stepCompleted',
  at,
  props: { step: 'delivery' },
})
const paidEvent = (at: string) => ({
  name: 'order.paid',
  at,
  props: { orderId: 1, total: 95000, method: 'qris' },
})
const blocked = (at: string, reason: string) => ({
  name: 'checkout.blocked',
  at,
  props: { reason },
})
const vitals = (at: string, pageType: string, lcp: number, inp: number, cls: number) => ({
  name: 'vitals.reported',
  at,
  props: { pageType, lcp, inp, cls },
})

describe.skipIf(!server)('the shop funnel and web vitals panels, on a real database', () => {
  let t: Dashboardish
  const owner = () => t.as('owner')
  const load = (period = '7') =>
    loadDashboard(t.payload, owner(), {
      site: 'shop',
      period: resolvePeriod({ period }, t.now),
      now: t.now,
    })

  beforeAll(async () => {
    t = await startDashboardStack('web_dash_shop_funnel')

    // Funnel: a clear drop at every step, plus one blocked checkout.
    // `collect` takes at most MAX_EVENTS (20) per request, so the 26 events go in two requests.
    await t.send('shop', [
      ...Array.from({ length: 10 }, () => viewed(t.noon(2))),
      ...Array.from({ length: 6 }, () => added(t.noon(2))),
      ...Array.from({ length: 4 }, () => started(t.noon(2))),
    ])
    await t.send('shop', [
      ...Array.from({ length: 3 }, () => delivery(t.noon(2))),
      ...Array.from({ length: 2 }, () => paidEvent(t.noon(2))),
      blocked(t.noon(2), 'out-of-stock'),
    ])

    // Web vitals: four samples of one page type/device, a clean p75 by construction.
    await t.send('shop', [
      vitals(t.noon(1), 'product', 1000, 50, 0),
      vitals(t.noon(1), 'product', 2000, 100, 1),
      vitals(t.noon(1), 'product', 3000, 150, 2),
      vitals(t.noon(1), 'product', 4000, 200, 3),
    ])
  }, 240_000)
  afterAll(() => t?.stop(), 60_000)

  it('the funnel shows no events yet with no events', async () => {
    // A period far enough back to hold none of this file's seeded funnel events.
    const dashboard = await loadDashboard(t.payload, owner(), {
      site: 'shop',
      period: resolvePeriod({ from: t.day(380), to: t.day(370) }, t.now),
      now: t.now,
    })
    expect(dashboard.funnel!.hasData).toBe(false)
  })

  it('the funnel counts each step from seeded events and the drop between them', async () => {
    const { funnel } = (await load('7'))!
    expect(funnel!.steps.map((s) => s.count.current)).toEqual([10, 6, 4, 3, 2])
    expect(funnel!.blockedByReason).toEqual([{ key: 'out-of-stock', current: 1, previous: 0 }])
  })

  it('web vitals p75 by page type', async () => {
    const { vitals: panel } = (await load('7'))!
    const row = panel!.rows.find((r) => r.pageType === 'product' && r.device === 'desktop')
    expect(row).toBeTruthy()
    expect(row!.samples).toBe(4)
    // percentile_cont(0.75), linearly interpolated: index 0.75×(4−1) = 2.25 into the sorted list.
    expect(row!.lcp).toBe(3250) // [1000,2000,3000,4000] → 3000 + 0.25×(4000−3000)
    expect(row!.inp).toBe(163) // [50,100,150,200] → round(150 + 0.25×(200−150))
    expect(row!.cls).toBeCloseTo(2.25) // [0,1,2,3] → 2 + 0.25×(3−2)
  })
})
