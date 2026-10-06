/**
 * The retention sweep on a real, pushed Postgres with a fixed clock (TASKS.md 9.1.d, 9.1.e): for
 * each of the kinds — chat sessions, closed leads, spam leads, driver images — one row just inside
 * its period and one just past; an open lead is never touched however old; a second run deletes
 * nothing; and the log holds counts only.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../collections/users/staff.test-support'
import { openShop, type Shop } from '../../shop/orders/orders-db.test-support'
import { memoryStore, placeOrder } from '../../shop/fulfilment/fulfilment-db.test-support'
import { runRetention } from './sweep'

/** 03:15 WITA is 19:15 UTC the day before; any fixed instant will do. */
const NOW = new Date('2027-06-15T03:15:00.000Z')
const HOUR = 3_600_000
const DAY = 24 * HOUR
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()
/** 24 calendar months before NOW: 2025-06-15T03:15Z. */
const TWO_YEARS = Date.UTC(2025, 5, 15, 3, 15)
const aroundTwoYears = (offset: number) => new Date(TWO_YEARS + offset).toISOString()

describe.skipIf(!server)('the retention sweep, on a real database', () => {
  let stack: StaffStack
  let shop: Shop
  const logs: string[] = []
  const images = memoryStore()
  const ids = {
    chat: { inside: 0, past: 0 },
    closed: { inside: 0, past: 0, noClock: 0 },
    spam: { inside: 0, past: 0 },
    open: [] as number[],
    image: { inside: 0, past: 0, keyInside: '', keyPast: '', moving: 0 },
  }

  const sql = (text: string) => stack.pool.query(text)
  const countOf = async (table: string, id: number) =>
    Number((await sql(`SELECT count(*) AS n FROM ${table} WHERE id = ${id}`)).rows[0]!.n)

  async function chat(lastMessageAt: string) {
    const doc = (await stack.payload.create({
      collection: 'chat-sessions',
      data: {
        site: 'shop',
        locale: 'en',
        startedAt: lastMessageAt,
        lastMessageAt,
        ipHash: 'hash-of-a-visitor',
        transcript: [{ role: 'user', at: lastMessageAt, text: 'a private question' }],
      } as never,
    })) as unknown as { id: number }
    return doc.id
  }

  async function lead(status: string, patch: { closedAt?: string; createdAt?: string }) {
    const doc = (await stack.payload.create({
      collection: 'leads',
      data: {
        kind: 'partnership',
        site: 'shop',
        source: 'form',
        status,
        payload: { name: 'Ayu Lestari', whatsapp: '+6281200000001', message: 'secret words' },
      } as never,
    })) as unknown as { id: number }
    if (patch.closedAt)
      await sql(`UPDATE leads SET closed_at = '${patch.closedAt}' WHERE id = ${doc.id}`)
    if (patch.createdAt)
      await sql(`UPDATE leads SET created_at = '${patch.createdAt}' WHERE id = ${doc.id}`)
    return doc.id
  }

  /** A closed order holding a driver image in the memory store; its last move into `status` at `at`. */
  async function orderWithImage(status: 'delivered' | 'cancelled' | 'on_the_way', at: string) {
    const order = await placeOrder(stack, {
      store: shop.ubud,
      status,
      lines: [{ qty: 1, stock: { [shop.ubud]: 2, [shop.sanur]: 2 } }],
    })
    const key = `orders/${order.id}/driver.jpg`
    await images.store.put(key, new Uint8Array([1, 2, 3]), 'image/jpeg')
    await sql(
      `UPDATE orders SET driver_image_key = '${key}', driver_image_content_type = 'image/jpeg' WHERE id = ${order.id}`,
    )
    await sql(
      `INSERT INTO orders_history (_order, _parent_id, id, "from", "to", at, actor)
       VALUES (99, ${order.id}, md5(random()::text)::varchar(24), 'waiting_driver', '${status}', '${at}', 'user')`,
    )
    return { id: order.id, key }
  }

  beforeAll(async () => {
    stack = await startStaffStack('cms_retention_test', (config, key) =>
      getPayload({ config, key }),
    )
    shop = await openShop(stack)

    // Chat sessions: the 30-day line sits an hour either side of the last message.
    ids.chat.inside = await chat(ago(30 * DAY - HOUR))
    ids.chat.past = await chat(ago(30 * DAY + HOUR))

    // Closed leads: 24 months from `closedAt`; a closed lead with no clock is left alone.
    ids.closed.inside = await lead('closed', { closedAt: aroundTwoYears(HOUR) })
    ids.closed.past = await lead('closed', { closedAt: aroundTwoYears(-HOUR) })
    ids.closed.noClock = await lead('closed', {})
    await sql(`UPDATE leads SET closed_at = NULL WHERE id = ${ids.closed.noClock}`)
    await sql(
      `UPDATE leads SET created_at = '2019-01-01T00:00:00Z' WHERE id = ${ids.closed.noClock}`,
    )

    // Spam leads: 30 days from creation.
    ids.spam.inside = await lead('spam', { createdAt: ago(30 * DAY - HOUR) })
    ids.spam.past = await lead('spam', { createdAt: ago(30 * DAY + HOUR) })

    // Open leads, however old, in every other status.
    for (const status of ['new', 'contacted', 'in_progress']) {
      ids.open.push(await lead(status, { createdAt: '2019-01-01T00:00:00Z' }))
    }

    // Driver images: 30 days after the order's last move into delivered or cancelled.
    const inside = await orderWithImage('delivered', ago(30 * DAY - HOUR))
    const past = await orderWithImage('cancelled', ago(30 * DAY + HOUR))
    const moving = await orderWithImage('on_the_way', ago(90 * DAY))
    Object.assign(ids.image, {
      inside: inside.id,
      past: past.id,
      moving: moving.id,
      keyInside: inside.key,
      keyPast: past.key,
    })
  }, 240_000)
  afterAll(() => stack?.stop(), 60_000)

  const sweep = () =>
    runRetention(stack.payload, NOW, undefined, { images: images.deps, log: (l) => logs.push(l) })

  it('retention deletes only what is past its date', async () => {
    expect(await sweep()).toEqual({ chatSessions: 1, leads: 2, driverImages: 1 })

    // Chat sessions
    expect(await countOf('chat_sessions', ids.chat.inside)).toBe(1)
    expect(await countOf('chat_sessions', ids.chat.past)).toBe(0)
    // Closed leads and spam
    expect(await countOf('leads', ids.closed.inside)).toBe(1)
    expect(await countOf('leads', ids.closed.past)).toBe(0)
    expect(await countOf('leads', ids.spam.inside)).toBe(1)
    expect(await countOf('leads', ids.spam.past)).toBe(0)
    // Driver images: the past one's object is gone and its group cleared; the order stays.
    expect(await countOf('orders', ids.image.past)).toBe(1)
    const cleared = (await sql(`SELECT driver_image_key FROM orders WHERE id = ${ids.image.past}`))
      .rows[0]!
    expect(cleared.driver_image_key).toBeNull()
    expect(images.objects.has(ids.image.keyPast)).toBe(false)
    const kept = (await sql(`SELECT driver_image_key FROM orders WHERE id = ${ids.image.inside}`))
      .rows[0]!
    expect(kept.driver_image_key).toBe(ids.image.keyInside)
    expect(images.objects.has(ids.image.keyInside)).toBe(true)
    // An order still on the road keeps its image, however long ago it moved.
    expect(images.objects.has(`orders/${ids.image.moving}/driver.jpg`)).toBe(true)
  })

  it('an open lead is never deleted however old', async () => {
    for (const id of ids.open) expect(await countOf('leads', id)).toBe(1)
    // …nor is a closed lead that has no closing time to count from.
    expect(await countOf('leads', ids.closed.noClock)).toBe(1)
  })

  it('a second retention run deletes nothing', async () => {
    expect(await sweep()).toEqual({ chatSessions: 0, leads: 0, driverImages: 0 })
    expect(await countOf('chat_sessions', ids.chat.inside)).toBe(1)
    expect(await countOf('leads', ids.spam.inside)).toBe(1)
  })

  it('the retention log holds counts only', () => {
    expect(logs).toEqual([
      'retention: chatSessions=1 leads=2 driverImages=1',
      'retention: chatSessions=0 leads=0 driverImages=0',
    ])
    const all = logs.join('\n')
    expect(all).not.toMatch(/Ayu|Lestari|6281200000001|secret|private|hash-of|orders\/|driver\.jpg/)
  })
})
