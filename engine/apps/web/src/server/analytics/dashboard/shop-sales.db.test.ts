/**
 * The shop's record-based panels on a real Postgres (TASKS.md 9.2.b, run 2): Sales, Fulfilment and
 * Payments, all from `orders`/`payment-events` through the Local API — never from events
 * (ANALYTICS.md §1), so a replayed or rolled-back payment cannot skew them.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { loadDashboard } from '../../../../../../packages/cms/src/admin/dashboard/loaders'
import { DashboardForbidden } from '../../../../../../packages/cms/src/admin/dashboard/context'
import { resolvePeriod } from '../../../../../../packages/cms/src/admin/dashboard/period'

import {
  makePaymentEvent,
  makeProduct,
  makeShopOrder,
  server,
  startDashboardStack,
  type Dashboardish,
} from './dashboard.test-support'

describe.skipIf(!server)('the shop sales, fulfilment and payments panels, on a real database', () => {
  let t: Dashboardish
  const owner = () => t.as('owner')
  const load = (period = '7') =>
    loadDashboard(t.payload, owner(), {
      site: 'shop',
      period: resolvePeriod({ period }, t.now),
      now: t.now,
    })

  beforeAll(async () => {
    t = await startDashboardStack('web_dash_shop_sales')
    const p = t.payload
    const storeUbd = t.stack.stores[0].id
    const storeSnr = t.stack.stores[1].id
    const productId = (await makeProduct(p, 'OEI-MUG')).id
    const at = (ago: number, hhmm: string) => `${t.day(ago)}T${hhmm}:00.000Z`
    const order = (input: Parameters<typeof makeShopOrder>[2]) => makeShopOrder(t, productId, input)

    // Sales: two paid orders this period (store UBD at a short distance, store SNR further out),
    // one from the period before, one cancelled despite a paidAt, one expired and never paid.
    await order({
      store: storeUbd,
      storeCode: 'UBD-01',
      status: 'paid',
      subtotal: 100_000,
      distanceKm: 1.5,
      paidAt: at(2, '03:00'),
      method: 'qris',
      createdAt: at(2, '03:00'),
    })
    // Store SNR's order doubles as the fulfilment-timing order: paid → processing (4h) →
    // on the way (+24h) → delivered (+6h), all its moves landing in the current period.
    await order({
      store: storeSnr,
      storeCode: 'SNR-01',
      status: 'delivered',
      subtotal: 35_000,
      distanceKm: 7,
      paidAt: at(3, '00:00'),
      method: 'gopay',
      createdAt: at(3, '00:00'),
      history: [
        { to: 'paid', at: at(3, '00:00') },
        { from: 'paid', to: 'processing', at: at(3, '04:00') },
        { from: 'processing', to: 'on_the_way', at: at(2, '04:00') },
        { from: 'on_the_way', to: 'delivered', at: at(2, '10:00') },
      ],
    })
    await order({
      store: storeUbd,
      storeCode: 'UBD-01',
      status: 'paid',
      subtotal: 55_000,
      paidAt: at(10, '02:00'),
      method: 'qris',
      createdAt: at(10, '02:00'),
    })
    await order({
      store: storeUbd,
      storeCode: 'UBD-01',
      status: 'cancelled',
      subtotal: 85_000,
      paidAt: at(2, '01:00'),
      method: 'qris',
      createdAt: at(2, '01:00'),
    })
    await order({
      store: storeUbd,
      storeCode: 'UBD-01',
      status: 'expired',
      subtotal: 40_000,
      createdAt: at(1, '01:00'),
    })

    // Orders waiting now, one of each in-flight status, so the snapshot has something to count.
    for (const status of ['processing', 'waiting_driver', 'on_the_way']) {
      await order({
        store: storeUbd,
        storeCode: 'UBD-01',
        status,
        subtotal: 20_000,
        createdAt: at(1, '05:00'),
      })
    }

    // Payments: a flagged amount mismatch and a flagged double payment; a clean one that is not.
    await makePaymentEvent(t, 'amount-mismatch', at(2, '06:00'))
    await makePaymentEvent(t, 'double-payment', at(3, '06:00'))
    await makePaymentEvent(t, 'recorded', at(2, '06:30'))
  }, 240_000)
  afterAll(() => t?.stop(), 60_000)

  it('a store user sees no panel', async () => {
    await expect(load('7')).resolves.toBeTruthy()
    await expect(
      loadDashboard(t.payload, t.as('store'), {
        site: 'shop',
        period: resolvePeriod({ period: '7' }, t.now),
        now: t.now,
      }),
    ).rejects.toThrow(DashboardForbidden)
  })

  it('sales count only paid orders and sum the order totals in rupiah', async () => {
    const { sales } = (await load('7'))!
    // UBD's order: 100 000 + 15 000 delivery = 115 000. SNR's: 35 000 + 15 000 = 50 000.
    expect(sales!.paidOrders).toMatchObject({ current: 2, previous: 1 })
    expect(sales!.revenue).toMatchObject({ current: 165_000, previous: 70_000 })
  })

  it('a cancelled or expired order is not revenue', async () => {
    const { sales } = (await load('7'))!
    // The cancelled order (100 000) and the expired, never-paid one (40 000) are not in 165 000.
    expect(sales!.revenue.current).toBe(165_000)
  })

  it('sales by store and by distance band', async () => {
    const { sales } = (await load('7'))!
    expect(sales!.byStore).toEqual([
      { key: 'UBD-01', orders: 1, revenue: 115_000 },
      { key: 'SNR-01', orders: 1, revenue: 50_000 },
    ])
    expect(sales!.byDistanceBand).toEqual([
      { key: '≤2 km', orders: 1, revenue: 115_000 },
      { key: '≤10 km', orders: 1, revenue: 50_000 },
    ])
  })

  it('fulfilment times come from the status moves, per store', async () => {
    const { fulfilment } = (await load('7'))!
    expect(fulfilment!.paidToProcessing).toEqual([{ store: 'SNR-01', medianHours: 4, orders: 1 }])
    expect(fulfilment!.processingToOnTheWay).toEqual([
      { store: 'SNR-01', medianHours: 24, orders: 1 },
    ])
    expect(fulfilment!.onTheWayToDelivered).toEqual([
      { store: 'SNR-01', medianHours: 6, orders: 1 },
    ])
  })

  it('orders waiting now by status', async () => {
    const { fulfilment } = (await load('7'))!
    const byStatus = Object.fromEntries(fulfilment!.waitingNow.map((w) => [w.status, w.count]))
    expect(byStatus).toMatchObject({ paid: 2, processing: 1, waiting_driver: 1, on_the_way: 1 })
  })

  it('payments method mix and expired-unpaid rate', async () => {
    const { payments } = (await load('7'))!
    // Both methods tied at one order this period; ties break alphabetically.
    expect(payments!.methodMix.map((m) => [m.key, m.current])).toEqual([
      ['gopay', 1],
      ['qris', 1],
    ])
    expect(payments!.flagged.map((f) => f.key).sort()).toEqual([
      'amount-mismatch',
      'double-payment',
    ])
    // One expired order (created this period) out of the orders created in it.
    expect(payments!.expiredUnpaidRate.current).toBeGreaterThan(0)
  })
})
