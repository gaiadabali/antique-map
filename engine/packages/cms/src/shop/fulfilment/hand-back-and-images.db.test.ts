/**
 * The rest of the fulfilment core on a real, pushed Postgres (TASKS.md 7.1.b, 7.1.c): a store
 * handing an order back, the driver image replaced and read by a signed URL, and the purge 30
 * days after an order closes.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../collections/users/staff.test-support'
import { openShop, type Shop } from '../orders/orders-db.test-support'
import { attachDriverImage, driverImageUrl, purgeDriverImages } from './driver-image'
import { actors, memoryStore, placeOrder, readers } from './fulfilment-db.test-support'
import { handBackOrder } from './hand-back'
import { reencodeImage } from './image'
import { EXIF_JPEG, png } from './image.test-support'
import { reassignOrder } from './reassign'

describe.skipIf(!server)('hand-back, driver images and the purge, on a real database', () => {
  let stack: StaffStack
  let shop: Shop
  let as: ReturnType<typeof actors>
  let read: ReturnType<typeof readers>

  beforeAll(async () => {
    stack = await startStaffStack('cms_fulfilment_more_test', (config, key) =>
      getPayload({ config, key }),
    )
    shop = await openShop(stack)
    as = actors(stack)
    read = readers(stack)
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const place = (status: Parameters<typeof placeOrder>[1]['status'], store = shop.ubud) =>
    placeOrder(stack, {
      store,
      status,
      lines: [{ qty: 1, stock: { [shop.ubud]: 2, [shop.sanur]: 2 } }],
    })

  it('a store hands its order back with a reason; the owner reassigns it', async () => {
    const order = await place('processing')
    const handBack = (actor = as.store, reason = 'The last scarf is torn.') =>
      handBackOrder(stack.payload, { orderId: order.id, actor, reason })

    expect(await handBack(as.store, '   ')).toMatchObject({ ok: false, refusal: 'reason_required' })
    expect(await handBack(as.owner)).toMatchObject({ ok: false, refusal: 'not_allowed' })
    expect(await handBack()).toEqual({ ok: true, orderId: order.id })
    let row = await read.order(order.id)
    expect(row.status).toBe('processing')
    expect(row.needs_attention_flag).toBe(true)
    expect(row.needs_attention_reason).toBe('Handed back by the store: The last scarf is torn.')
    expect(await read.history(order.id)).toEqual([
      {
        from: 'processing',
        to: 'processing',
        actor: 'user',
        by_id: as.store!.id,
        note: 'Handed back: The last scarf is torn.',
      },
    ])

    const moved = await reassignOrder(stack.payload, {
      orderId: order.id,
      toStoreId: shop.sanur,
      actor: as.owner,
    })
    expect(moved).toMatchObject({ ok: true, fromStoreId: shop.ubud, toStoreId: shop.sanur })
    // The flag stays for the owner to clear: the payments core raises it too.
    row = await read.order(order.id)
    expect(row.needs_attention_flag).toBe(true)
    expect(Number(row.store_id)).toBe(shop.sanur)
    // Now Sanur's order: the Ubud user can no longer hand it back.
    expect(await handBack()).toMatchObject({ ok: false, refusal: 'not_your_store' })
  })

  it('a store cannot hand back an order a driver has collected', async () => {
    const order = await place('on_the_way')
    expect(
      await handBackOrder(stack.payload, { orderId: order.id, actor: as.store, reason: 'Late.' }),
    ).toMatchObject({ ok: false, refusal: 'wrong_status' })
  })

  it('a new image replaces the old one, which is deleted; the URL signs the current one only', async () => {
    const order = await place('waiting_driver')
    const memory = memoryStore()
    const deps = { ...memory.deps, reencode: reencodeImage }
    const attach = (buffer: Buffer) =>
      attachDriverImage(
        stack.payload,
        { orderId: order.id, file: { buffer }, actor: as.store },
        deps,
      )

    expect(await driverImageUrl(stack.payload, order.id, 300, memory.deps)).toBeNull()
    const first = await attach(EXIF_JPEG)
    const second = await attach(png(2400, 1200))
    if (!first.ok || !second.ok) throw new Error('both uploads should be accepted')
    expect(second).toMatchObject({ width: 1600, height: 800, contentType: 'image/webp' })
    expect([...memory.objects.keys()]).toEqual([second.key])
    expect(await driverImageUrl(stack.payload, order.id, 300, memory.deps)).toBe(
      `memory://${second.key}?ttl=300`,
    )
    await expect(driverImageUrl(stack.payload, order.id, 3600, memory.deps)).rejects.toThrow(
      RangeError,
    )
    expect((await read.history(order.id)).map((h) => h.note)).toEqual([
      'Driver’s details added.',
      'Driver’s details replaced.',
    ])
    // Bytes that look like a PNG but do not decode are refused, and nothing is stored.
    const broken = Buffer.concat([png(4, 4).subarray(0, 20), Buffer.alloc(40)])
    expect(await attach(broken)).toMatchObject({ ok: false, refusal: 'unreadable_image' })
    expect([...memory.objects.keys()]).toEqual([second.key])
    // A delivered order takes no new image.
    await stack.pool.query(`UPDATE orders SET status = 'delivered' WHERE id = ${order.id}`)
    expect(await attach(EXIF_JPEG)).toMatchObject({ ok: false, refusal: 'order_closed' })
  })

  it('purges an image 30 days after delivery or cancellation, and not before', async () => {
    const memory = memoryStore()
    const deps = { ...memory.deps, reencode: reencodeImage }
    const withImage = async (closeAs: 'delivered' | 'cancelled' | 'on_the_way') => {
      const order = await place('waiting_driver')
      const attached = await attachDriverImage(
        stack.payload,
        { orderId: order.id, file: { buffer: EXIF_JPEG }, actor: as.store },
        deps,
      )
      if (!attached.ok) throw new Error(attached.message)
      await stack.pool.query(`UPDATE orders SET status = '${closeAs}' WHERE id = ${order.id}`)
      await stack.pool.query(
        `INSERT INTO orders_history (_order, _parent_id, id, "from", "to", at, actor)
         VALUES (99, ${order.id}, md5(random()::text)::varchar(24), 'waiting_driver', '${closeAs}', now(), 'user')`,
      )
      return { id: order.id, key: attached.key }
    }
    const delivered = await withImage('delivered')
    const cancelled = await withImage('cancelled')
    const recent = await withImage('delivered')
    const moving = await withImage('on_the_way')
    for (const order of [delivered, cancelled, moving]) await read.age(order.id, 31)
    await read.age(recent.id, 29)

    expect(await purgeDriverImages(stack.payload, new Date(), memory.deps)).toEqual({
      purged: 2,
      failed: 0,
    })
    expect([...memory.objects.keys()].sort()).toEqual([recent.key, moving.key].sort())
    for (const order of [delivered, cancelled]) {
      const row = await read.order(order.id)
      expect(row.driver_image_key).toBeNull()
      expect(row.driver_image_uploaded_by_id).toBeNull()
      expect((await read.history(order.id)).at(-1)).toMatchObject({
        actor: 'system',
        note: 'Driver’s details deleted 30 days after the order closed.',
      })
    }
    expect((await read.order(recent.id)).driver_image_key).toBe(recent.key)
    // A second run finds nothing more to do.
    expect(await purgeDriverImages(stack.payload, new Date(), memory.deps)).toEqual({
      purged: 0,
      failed: 0,
    })
  })
})
