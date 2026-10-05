/**
 * The dashboard's access and Visitors panel on a real Postgres (TASKS.md 9.2.b): events seeded
 * through the real `collect`, read back by `loadDashboard` as each role. The panels' own tests sit
 * beside this one (`panels.db.test.ts`); they share `dashboard.test-support`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { DashboardForbidden } from '../../../../../../packages/cms/src/admin/dashboard/context'
import { compared } from '../../../../../../packages/cms/src/admin/dashboard/compare'
import { loadDashboard } from '../../../../../../packages/cms/src/admin/dashboard/loaders'
import { resolvePeriod } from '../../../../../../packages/cms/src/admin/dashboard/period'

import { server, shiftDay, startDashboardStack, type Dashboardish } from './dashboard.test-support'

const page = (at: string, extra: object = {}) => ({
  name: 'page.viewed',
  at,
  props: { pageType: 'home' },
  ...extra,
})

describe.skipIf(!server)('the dashboard: access and visitors, on a real database', () => {
  let t: Dashboardish
  const period = () => resolvePeriod({ period: '7' }, t.now)
  const gallery = () =>
    loadDashboard(t.payload, t.as('owner'), { site: 'gallery', period: period(), now: t.now })

  beforeAll(async () => {
    t = await startDashboardStack('web_dash_visitors')
    // Yesterday: two visitors (one on a phone, in Indonesian, from a search engine), 3 page views.
    await t.send(
      'gallery',
      [
        page(t.noon(1), {
          referrer: 'https://www.google.com/',
          locale: 'id',
          utmSource: 'newsletter',
        }),
        page(t.noon(1), { path: '/maps' }),
      ],
      { phone: true },
    )
    await t.send('gallery', [page(t.noon(1), { path: '/maps' })])
    await t.send('gallery', [page(t.noon(3))])
    // 23:30 UTC on the day before day(5) is 07:30 on day(5) in UTC+8: the stamped day is day(5).
    await t.send('gallery', [page(`${shiftDay(t.day(5), -1)}T23:30:00.000Z`)])
    // The period before: one visit, nine days ago.
    await t.send('gallery', [page(t.noon(9))])
  }, 240_000)
  afterAll(() => t?.stop(), 60_000)

  it('the dashboard answers only an owner', async () => {
    for (const role of ['editor', 'store', null] as const) {
      await expect(
        loadDashboard(t.payload, t.as(role), { site: 'gallery', period: period(), now: t.now }),
      ).rejects.toBeInstanceOf(DashboardForbidden)
    }
    await expect(gallery()).resolves.toMatchObject({ site: 'gallery' })
  })

  it('days are the collect-stamped `day`, not a JS bucket', async () => {
    const { visitors } = await gallery()
    const views = Object.fromEntries(visitors.daily.map((d) => [d.day, d.pageViews]))
    // The 23:30 UTC event is on day(5), the next WITA day — not on the UTC day it happened on.
    expect(views[t.day(5)]).toBe(1)
    expect(views[shiftDay(t.day(5), -1)]).toBe(0)
    expect(views[t.day(1)]).toBe(3)
    expect(visitors.daily).toHaveLength(7)
    expect(visitors.daily.at(-1)!.day).toBe(t.day(0))
  })

  it('the period compare returns the delta against the previous period', async () => {
    const { visitors } = await gallery()
    expect(visitors.pageViews).toEqual(compared(5, 1))
    expect(visitors.pageViews).toMatchObject({ current: 5, previous: 1, change: 4, pct: 400 })
    // Sessions a day: two on day(1), one each on day(3) and day(5); one in the period before.
    expect(visitors.sessions).toMatchObject({ current: 4, previous: 1, change: 3 })
    expect(period().previous).toEqual({ from: t.day(13), to: t.day(7) })
  })

  it('ranks pages, referrers, utm sources, devices and languages', async () => {
    const { visitors } = await gallery()
    expect(visitors.hasData).toBe(true)
    expect(visitors.topPaths[0]).toEqual({ key: '/', current: 3, previous: 1 })
    expect(visitors.topPaths[1]).toEqual({ key: '/maps', current: 2, previous: 0 })
    expect(visitors.referrers).toEqual([{ key: 'www.google.com', current: 1, previous: 0 }])
    expect(visitors.utmSources).toEqual([{ key: 'newsletter', current: 1, previous: 0 }])
    expect(visitors.devices.find((d) => d.key === 'mobile')?.current).toBe(2)
    expect(visitors.locales.find((d) => d.key === 'id')?.current).toBe(1)
  })

  it('a site with no events says so rather than showing zeros with deltas', async () => {
    const shop = await loadDashboard(t.payload, t.as('owner'), {
      site: 'shop',
      period: period(),
      now: t.now,
    })
    expect(shop.visitors.hasData).toBe(false)
    expect(shop.search).toBeNull()
    expect(shop.antiques).toBeNull()
  })
})
