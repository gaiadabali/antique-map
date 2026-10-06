/**
 * Test support only — the dashboard's db tests share one pushed database (the staff stack: two
 * stores, one user per role) and seed it the way production does: events through the real
 * `collect` write path (never straight SQL), leads, chat sessions and orders through the Local
 * API. Without `CMS_TEST_POSTGRES_URL` the tests that use it skip — a setup state.
 */
import { getPayload, type Payload } from 'payload'

import {
  makeOrder,
  makeProduct,
} from '../../../../../../packages/cms/src/collections/stock-levels/shop.test-support'
import {
  server,
  startStaffStack,
  type Caller,
  type StaffStack,
} from '../../../../../../packages/cms/src/collections/users/staff.test-support'
import { shiftDay, witaDay } from '../../../../../../packages/cms/src/admin/dashboard/period'

import { collect } from '../collect'
import { rateLimiter } from '../rate'

export { server, shiftDay, witaDay }

const ENV = {
  GALLERY_HOSTS: 'gallery.test',
  SHOP_HOSTS: 'shop.test',
  ADMIN_HOST: 'shop.test',
  PAYLOAD_DEV_PUSH: '1',
}
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36'
const PHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'

export type Beacon = {
  name: string
  /** An ISO instant; the day the dashboard counts is the one collect stamps from it. */
  at: string
  props?: Record<string, unknown>
  path?: string
  referrer?: string | null
  locale?: 'en' | 'id'
  utmSource?: string
}

export type Dashboardish = {
  stack: StaffStack
  payload: Payload
  /** A signed-in user of `role`, as `req.user` carries it. */
  as: (role: Caller | null) => Record<string, unknown> | null
  /** Sends events through `collect`; each call is a new visitor unless `visitor` repeats. */
  send: (
    site: 'gallery' | 'shop',
    events: Beacon[],
    options?: { visitor?: number; phone?: boolean },
  ) => Promise<void>
  /** The clock every test reads: now, fixed when the stack booted. */
  now: Date
  /** `daysAgo` days before today (WITA), as a day string. */
  day: (daysAgo: number) => string
  /** Noon at the start of `daysAgo`'s WITA day, as an ISO instant. */
  noon: (daysAgo: number) => string
  stop: () => Promise<void>
}

export async function startDashboardStack(prefix: string): Promise<Dashboardish> {
  const stack = await startStaffStack(prefix, (config, key) => getPayload({ config, key }))
  rateLimiter.reset()
  const now = new Date()
  let nextVisitor = 1
  const day = (daysAgo: number) => shiftDay(witaDay(now), -daysAgo)
  return {
    stack,
    payload: stack.payload,
    now,
    day,
    noon: (daysAgo) => `${day(daysAgo)}T04:00:00.000Z`,
    as: (role) => (role === null ? null : { ...stack.users[role], collection: 'users' }),
    async send(site, events, options = {}) {
      const visitor = options.visitor ?? nextVisitor++
      const host = site === 'gallery' ? 'gallery.test' : 'shop.test'
      const body = JSON.stringify({
        events: events.map((e) => ({
          name: e.name,
          at: e.at,
          locale: e.locale ?? 'en',
          props: e.props ?? {},
          url: `https://${host}${e.path ?? '/'}`,
          referrer: e.referrer ?? null,
          utm: e.utmSource ? { utm_source: e.utmSource } : {},
        })),
      })
      const response = await collect(
        {
          method: 'POST',
          origin: `https://${host}`,
          contentType: 'application/json',
          userAgent: options.phone ? PHONE : DESKTOP,
          address: `203.0.113.${visitor}`,
          body,
          referer: null,
        },
        { getPayload: async () => stack.payload, env: ENV, now: () => new Date(events[0]!.at) },
      )
      if (response.status !== 204) throw new Error(`collect answered ${response.status}`)
    },
    stop: () => stack.stop(),
  }
}

/** A work (a draft is enough: the dashboard reads its record, not its page). */
export async function makeWork(
  payload: Payload,
  data: Record<string, unknown>,
): Promise<{ id: number }> {
  return (await payload.create({ collection: 'works', data: data as never })) as unknown as {
    id: number
  }
}

export { makeOrder, makeProduct }
