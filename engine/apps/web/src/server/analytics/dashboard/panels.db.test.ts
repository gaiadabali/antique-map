/**
 * The dashboard's Search, Antiques, Asks and sells, Chat and revenue panels on a real Postgres
 * (TASKS.md 9.2.b): events seeded through the real `collect`, the records (works, leads, chat
 * sessions, orders) through the Local API, everything read back by `loadDashboard` as the owner.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  loadDashboard,
  type Dashboard,
} from '../../../../../../packages/cms/src/admin/dashboard/loaders'
import { resolvePeriod } from '../../../../../../packages/cms/src/admin/dashboard/period'

import {
  makeOrder,
  makeProduct,
  makeWork,
  server,
  startDashboardStack,
  type Dashboardish,
} from './dashboard.test-support'

const search = (at: string, query: string, results: number) => ({
  name: 'search.submitted',
  at,
  props: { query, resultCount: results, zeroResults: results === 0 },
})
const viewed = (at: string, workId: number, objectType: string) => ({
  name: 'item.viewed',
  at,
  props: { workId, objectType, status: 'available' },
})
const zoomed = (at: string, workId: number) => ({
  name: 'item.zoomed',
  at,
  props: { workId, imageRole: 'recto', maxZoom: 4 },
})
const ask = (at: string, channel: string, context: string, workId?: number) => ({
  name: 'ask.clicked',
  at,
  props: { channel, context, ...(workId === undefined ? {} : { workId }) },
})

describe.skipIf(!server)('the dashboard panels, on a real database', () => {
  let t: Dashboardish
  let gallery: Dashboard
  let shop: Dashboard
  let works: number[]
  const owner = () => t.as('owner')
  const load = (site: 'gallery' | 'shop') =>
    loadDashboard(t.payload, owner(), {
      site,
      period: resolvePeriod({ period: '7' }, t.now),
      now: t.now,
    })

  /** The most recent day (1–6 days ago) that is a weekday in Singapore. */
  const weekday = () => {
    for (let ago = 1; ago <= 6; ago += 1) {
      const dow = new Date(`${t.day(ago)}T00:00:00.000Z`).getUTCDay()
      if (dow >= 1 && dow <= 5) return ago
    }
    throw new Error('no weekday in six days')
  }
  const lead = (data: Record<string, unknown>) =>
    t.payload.create({
      collection: 'leads',
      data: { site: 'gallery', source: 'form', status: 'new', ...data } as never,
    }) as unknown as Promise<{ id: number }>

  beforeAll(async () => {
    t = await startDashboardStack('web_dash_panels')
    const p = t.payload
    const maker = await p.create({
      collection: 'makers',
      data: { name: 'François Valentijn', sortName: 'VALENTIJN, François' } as never,
    })
    const place = await p.create({ collection: 'places', data: { name: 'Bali' } as never })
    const credited = {
      makers: [{ maker: maker.id, role: 'cartographer', certainty: 'attributed' }],
      places: [{ place: place.id, role: 'depicts', primary: true }],
    }
    works = [
      (await makeWork(p, { title: 'Bali, 1726', objectType: 'map', ...credited })).id,
      (await makeWork(p, { title: 'A Balinese Dancer', objectType: 'print' })).id,
      (await makeWork(p, { title: 'Java, 1700', objectType: 'map' })).id,
    ]
    const [w1, w2, w3] = works as [number, number, number]

    // Search: "peta lombok" found nothing three times; "peta jawa" found four things twice.
    await t.send('gallery', [
      search(t.noon(2), 'Peta Lombok', 0),
      search(t.noon(2), 'peta lombok', 0),
      search(t.noon(2), 'peta lombok', 0),
      search(t.noon(2), 'peta jawa', 4),
      search(t.noon(2), 'peta jawa', 4),
    ])
    await t.send('gallery', [search(t.noon(9), 'peta bali', 0)])

    // Antiques: work 1 is viewed three times, zoomed twice and asked about once.
    await t.send('gallery', [viewed(t.noon(2), w1, 'map'), viewed(t.noon(2), w1, 'map')])
    await t.send('gallery', [
      viewed(t.noon(2), w1, 'map'),
      zoomed(t.noon(2), w1),
      zoomed(t.noon(2), w1),
    ])
    await t.send('gallery', [
      viewed(t.noon(3), w2, 'print'),
      ask(t.noon(3), 'whatsapp', 'item', w1),
    ])
    await t.send('gallery', [viewed(t.noon(9), w3, 'map')])

    // Taps: the footer's two WhatsApp taps and an email tap carry no item; one sell tap.
    await t.send('gallery', [
      ask(t.noon(4), 'whatsapp', 'footer'),
      ask(t.noon(4), 'whatsapp', 'footer'),
      ask(t.noon(4), 'email', 'page'),
      { name: 'sell.clicked', at: t.noon(4), props: { channel: 'whatsapp' } },
    ])

    // Leads: three answered or owed now, one spam, one from the period before.
    const d = weekday()
    const at = (ago: number, utc: string) => `${t.day(ago)}T${utc}:00.000Z`
    const l1 = await lead({ kind: 'ask', createdAt: at(d, '02:00'), firstReplyAt: at(d, '06:00') })
    await lead({ kind: 'ask', createdAt: at(d, '02:00'), firstReplyAt: at(d - 1, '02:00') })
    await lead({ kind: 'sell', createdAt: at(d, '02:00') })
    const spam = await lead({ kind: 'ask', createdAt: at(d, '03:00'), status: 'spam' })
    await lead({ kind: 'ask', createdAt: at(10, '02:00'), firstReplyAt: at(10, '04:00') })

    // Chat: six sessions now (two hand-offs, one refused, one blocked, one lead, one spam lead).
    const session = (ago: number, outcome: string, leadId?: number) =>
      p.create({
        collection: 'chat-sessions',
        data: {
          site: 'gallery',
          locale: 'en',
          startedAt: at(ago, '03:00'),
          lastMessageAt: at(ago, '03:10'),
          outcome,
          usage: { costUsd: 0.1 },
          ...(leadId === undefined ? {} : { lead: leadId }),
        } as never,
      })
    for (const outcome of ['handoff', 'handoff', 'refused', 'blocked']) await session(d, outcome)
    await session(d, 'lead', l1.id)
    await session(d, 'lead', spam.id)
    await session(10, 'handoff')
    const handoff = (channel: string) => ({
      name: 'chat.handedOff',
      at: t.noon(d),
      props: { chatSessionId: 1, channel, hasItem: false },
    })
    await t.send('gallery', [handoff('whatsapp'), handoff('whatsapp')])

    // The shop: a paid order now, one paid in the period before, one never paid; and
    // `order.paid` events that say something else about the money.
    const store = t.stack.stores[0].id
    const product = (await makeProduct(p, 'OEI-MUG')).id
    const paid = async (ago: number, status = 'paid') => {
      const order = await makeOrder(p, { store, product, qty: 2, status })
      await p.update({
        collection: 'orders',
        id: order.id,
        data: { payment: { paidAt: at(ago, '03:00'), method: 'qris' } } as never,
        overrideAccess: true,
      })
    }
    await paid(2)
    await paid(10)
    await makeOrder(p, { store, product, qty: 1, status: 'pending_payment' })
    const orderPaid = {
      name: 'order.paid',
      at: t.noon(2),
      props: { orderId: 1, total: 999_999, method: 'gopay' },
    }
    await t.send('shop', [orderPaid, orderPaid])

    gallery = await load('gallery')
    shop = await load('shop')
  }, 240_000)
  afterAll(() => t?.stop(), 60_000)

  it('zero-result queries are listed with their counts', () => {
    expect(gallery.search!.zeroResultQueries).toEqual([
      { key: 'peta lombok', current: 3, previous: 0 },
    ])
    expect(gallery.search!.topQueries.slice(0, 2)).toEqual([
      { key: 'peta lombok', current: 3, previous: 0 },
      { key: 'peta jawa', current: 2, previous: 0 },
    ])
    expect(gallery.search!.searches).toMatchObject({ current: 5, previous: 1 })
    expect(gallery.search!.zeroResults).toMatchObject({ current: 3, previous: 1 })
  })

  it('ranks the antiques by views and zooms, with the ask rate and the title', () => {
    const antiques = gallery.antiques!
    expect(antiques.mostViewed[0]).toMatchObject({
      workId: works[0],
      title: 'Bali, 1726',
      zooms: 2,
      asks: 1,
      askRate: 1 / 3,
      views: { current: 3, previous: 0 },
    })
    expect(antiques.mostViewed[1]).toMatchObject({ workId: works[1], askRate: 0 })
    expect(antiques.mostZoomed.map((r) => r.workId)).toEqual([works[0]])
    expect(antiques.views).toMatchObject({ current: 4, previous: 1 })
  })

  it('groups the views by object type, maker and place from the works records', () => {
    const antiques = gallery.antiques!
    expect(antiques.byType.map((r) => [r.key, r.views.current, r.asks])).toEqual([
      ['map', 3, 1],
      ['print', 1, 0],
    ])
    expect(antiques.byMaker).toMatchObject([{ key: 'François Valentijn', asks: 1 }])
    expect(antiques.byMaker[0]!.views.current).toBe(3)
    expect(antiques.byPlace[0]).toMatchObject({ key: 'Bali', asks: 1 })
  })

  it('counts taps by channel and context, apart from the leads', () => {
    const { asks } = gallery
    expect(asks.byChannel.map((r) => [r.key, r.current])).toEqual([
      ['whatsapp', 4],
      ['email', 1],
    ])
    expect(asks.byContext.find((r) => r.key === 'footer')?.current).toBe(2)
    // Four ask taps and one sell tap. Taps are events, leads are records: never added together.
    expect(asks.taps.current).toBe(5)
  })

  it('a lead flagged spam is not counted', () => {
    const { asks } = gallery
    expect(asks.leads).toMatchObject({ current: 3, previous: 1 })
    expect(asks.leadsByKind.map((k) => [k.kind, k.leads.current])).toEqual([
      ['ask', 2],
      ['sell', 1],
    ])
  })

  it('measures the first reply against the same-working-day promise', () => {
    const { replies } = gallery.asks
    expect(replies).toMatchObject({ answered: 2, inTime: 1, late: 1, overdue: 1, open: 0 })
    expect(replies.medianHours).toBe(14)
    expect(replies.inTimePct).toMatchObject({ current: 33.3, previous: 100 })
  })

  it('counts the chat from its sessions, a spam lead captured as none', () => {
    const { chat } = gallery
    expect(chat.sessions).toMatchObject({ current: 6, previous: 1 })
    expect(chat.handoffs.current).toBe(2)
    expect(chat.handoffRate).toMatchObject({ current: 33.3, previous: 100 })
    expect(chat.leadsCaptured.current).toBe(1)
    expect([chat.refused.current, chat.blocked.current]).toEqual([1, 1])
    expect(chat.costUsd.current).toBeCloseTo(0.6)
    expect(chat.handoffsByChannel).toEqual([{ key: 'whatsapp', current: 2, previous: 0 }])
  })

  it('business numbers come from records, not events', () => {
    // The two `order.paid` events claim 999 999 each; the order records say 205 000 once.
    expect(shop.business).toMatchObject({
      paidOrders: { current: 1, previous: 1 },
      revenue: { current: 205_000, previous: 205_000, change: 0 },
    })
    expect(gallery.business).toBeNull()
  })
})
