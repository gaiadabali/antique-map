/**
 * The fulfilment core on a real, pushed Postgres (TASKS.md 7.1.d): who may move an order where,
 * the history every change writes, the driver image's refusals, and the stock a reassign or a
 * cancel moves — exactly once, with concurrent callers.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../collections/users/staff.test-support'
import { openShop, type Shop } from '../orders/orders-db.test-support'
import { attachDriverImage } from './driver-image'
import { actors, memoryStore, placeOrder, readers } from './fulfilment-db.test-support'
import { reencodeImage } from './image'
import { EXE, EXIF_JPEG, TEXT } from './image.test-support'
import { moveOrder } from './move'
import { reassignOrder } from './reassign'

/** The refusals come before any decoding: a test that reaches the re-encoder fails. */
const neverReencode = async (): Promise<never> => {
  throw new Error('the re-encoder was reached')
}

describe.skipIf(!server)('fulfilment, on a real database', () => {
  let stack: StaffStack
  let shop: Shop
  let as: ReturnType<typeof actors>
  let read: ReturnType<typeof readers>

  beforeAll(async () => {
    stack = await startStaffStack('cms_fulfilment_test', (config, key) =>
      getPayload({ config, key }),
    )
    shop = await openShop(stack)
    as = actors(stack)
    read = readers(stack)
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const at = (store: 'ubud' | 'sanur', status: Parameters<typeof placeOrder>[1]['status']) =>
    placeOrder(stack, {
      store: shop[store],
      status,
      lines: [{ qty: 1, stock: { [shop[store]]: 4 } }],
    })

  it('a store user cannot move a status backward', async () => {
    const order = await at('ubud', 'processing')
    const moved = await moveOrder(stack.payload, { orderId: order.id, to: 'paid', actor: as.store })
    expect(moved).toMatchObject({ ok: false, refusal: 'move_not_allowed' })
    expect((await read.order(order.id)).status).toBe('processing')
    expect(await read.history(order.id)).toEqual([])
  })

  it('a store user cannot skip a status', async () => {
    const order = await at('ubud', 'paid')
    for (const to of ['waiting_driver', 'on_the_way', 'delivered', 'cancelled'] as const) {
      const moved = await moveOrder(stack.payload, { orderId: order.id, to, actor: as.store })
      expect(moved).toMatchObject({ ok: false, refusal: 'move_not_allowed' })
    }
    expect((await read.order(order.id)).status).toBe('paid')
  })

  it("a store user cannot move another store's order", async () => {
    const order = await at('sanur', 'paid')
    const moved = await moveOrder(stack.payload, {
      orderId: order.id,
      to: 'processing',
      actor: as.store,
    })
    expect(moved).toMatchObject({ ok: false, refusal: 'not_your_store' })
    expect((await read.order(order.id)).status).toBe('paid')
    // Nor upload its driver image.
    const memory = memoryStore()
    const attached = await attachDriverImage(
      stack.payload,
      { orderId: order.id, file: { buffer: EXIF_JPEG }, actor: as.store },
      { ...memory.deps, reencode: neverReencode },
    )
    expect(attached).toMatchObject({ ok: false, refusal: 'not_your_store' })
    expect(memory.calls.put).toBe(0)
  })

  it('every transition writes a history row', async () => {
    const order = await at('ubud', 'paid')
    const store = as.store!.id
    const owner = as.owner!.id
    const memory = memoryStore()
    const step = (to: Parameters<typeof moveOrder>[1]['to'], actor = as.store, reason?: string) =>
      moveOrder(stack.payload, { orderId: order.id, to, actor, reason })

    expect(await step('processing')).toMatchObject({ ok: true, from: 'paid', to: 'processing' })
    expect(await step('waiting_driver')).toMatchObject({ ok: true })
    // On the way needs the driver's details first: refused, and no row written for it.
    expect(await step('on_the_way')).toMatchObject({ ok: false, refusal: 'driver_image_required' })
    const attached = await attachDriverImage(
      stack.payload,
      { orderId: order.id, file: { buffer: EXIF_JPEG, mimetype: 'image/jpeg' }, actor: as.store },
      { ...memory.deps, reencode: reencodeImage },
    )
    expect(attached).toMatchObject({ ok: true, contentType: 'image/webp', width: 16, height: 12 })
    expect(await step('on_the_way')).toMatchObject({ ok: true })
    expect(await step('delivered')).toMatchObject({ ok: true })
    expect(await step('on_the_way', as.owner, 'Marked delivered by mistake.')).toMatchObject({
      ok: true,
    })

    expect(await read.history(order.id)).toEqual([
      { from: 'paid', to: 'processing', actor: 'user', by_id: store, note: null },
      { from: 'processing', to: 'waiting_driver', actor: 'user', by_id: store, note: null },
      {
        from: 'waiting_driver',
        to: 'waiting_driver',
        actor: 'user',
        by_id: store,
        note: 'Driver’s details added.',
      },
      { from: 'waiting_driver', to: 'on_the_way', actor: 'user', by_id: store, note: null },
      { from: 'on_the_way', to: 'delivered', actor: 'user', by_id: store, note: null },
      {
        from: 'delivered',
        to: 'on_the_way',
        actor: 'user',
        by_id: owner,
        note: 'Marked delivered by mistake.',
      },
    ])
    const row = await read.order(order.id)
    expect(row.status).toBe('on_the_way')
    expect(row.driver_image_key).toBe(attached.ok ? attached.key : null)
    expect(row.driver_image_key).toMatch(
      new RegExp(`^orders/${order.id}/\\d+-[0-9a-f]{12}\\.webp$`),
    )
    expect(row.driver_image_uploaded_by_id).toBe(store)
  })

  it('an image that is not an image is refused', async () => {
    const order = await at('ubud', 'waiting_driver')
    const memory = memoryStore()
    // A renamed .exe and a text file, each sent as a JPEG named like one.
    for (const buffer of [EXE, TEXT]) {
      const attached = await attachDriverImage(
        stack.payload,
        { orderId: order.id, file: { buffer, mimetype: 'image/jpeg', size: 10 }, actor: as.store },
        { ...memory.deps, reencode: neverReencode },
      )
      expect(attached).toMatchObject({ ok: false, refusal: 'not_an_image' })
    }
    expect(memory.calls.put).toBe(0)
    expect((await read.order(order.id)).driver_image_key).toBeNull()
    expect(await read.history(order.id)).toEqual([])
  })

  it('an oversize image is refused', async () => {
    const order = await at('ubud', 'waiting_driver')
    const memory = memoryStore()
    const buffer = Buffer.concat([EXIF_JPEG, Buffer.alloc(10 * 1024 * 1024 + 1 - EXIF_JPEG.length)])
    const attached = await attachDriverImage(
      stack.payload,
      // The declared size is small; the bytes received are what count.
      { orderId: order.id, file: { buffer, mimetype: 'image/jpeg', size: 1000 }, actor: as.store },
      { ...memory.deps, reencode: neverReencode },
    )
    expect(attached).toMatchObject({ ok: false, refusal: 'too_large' })
    expect(memory.calls.put).toBe(0)
    expect((await read.order(order.id)).driver_image_key).toBeNull()
  })

  it('a reassign to a store without stock leaves both stocks unchanged', async () => {
    // Sanur can fill the first line but not the second: the first line's move must roll back too.
    const order = await placeOrder(stack, {
      store: shop.ubud,
      status: 'paid',
      lines: [
        { qty: 2, stock: { [shop.ubud]: 3, [shop.sanur]: 5 } },
        { qty: 2, stock: { [shop.ubud]: 3, [shop.sanur]: 1 } },
      ],
    })
    const quantities = () =>
      Promise.all(
        order.stock.flatMap((rows) => [shop.ubud, shop.sanur].map((s) => read.quantity(rows[s]!))),
      )
    const before = await quantities()
    const result = await reassignOrder(stack.payload, {
      orderId: order.id,
      toStoreId: shop.sanur,
      actor: as.owner,
    })
    expect(result).toEqual({
      ok: false,
      refusal: 'not_enough_stock',
      message: expect.any(String),
      lines: [{ productId: order.products[1], variantSku: null }],
    })
    expect(await quantities()).toEqual(before)
    expect(Number((await read.order(order.id)).store_id)).toBe(shop.ubud)
    expect(await read.history(order.id)).toEqual([])
    // Store staff never reassign, whatever the stock.
    expect(
      await reassignOrder(stack.payload, {
        orderId: order.id,
        toStoreId: shop.sanur,
        actor: as.store,
      }),
    ).toMatchObject({ ok: false, refusal: 'not_allowed' })
  })

  it('a reassign moves the stock exactly once', async () => {
    const order = await placeOrder(stack, {
      store: shop.ubud,
      status: 'processing',
      lines: [{ qty: 2, stock: { [shop.ubud]: 1, [shop.sanur]: 5 } }],
    })
    const [rows] = order.stock
    const results = await Promise.all([
      reassignOrder(stack.payload, { orderId: order.id, toStoreId: shop.sanur, actor: as.owner }),
      reassignOrder(stack.payload, { orderId: order.id, toStoreId: shop.sanur, actor: as.editor }),
    ])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.filter((r) => !r.ok)).toEqual([
      expect.objectContaining({ ok: false, refusal: 'same_store' }),
    ])
    expect(await read.quantity(rows![shop.ubud]!)).toBe(3)
    expect(await read.quantity(rows![shop.sanur]!)).toBe(3)
    const row = await read.order(order.id)
    expect(Number(row.store_id)).toBe(shop.sanur)
    expect(row.store_snapshot_code).toBe('SNR-01')
    expect(Number(row.distance_km)).toBeGreaterThan(15)
    expect(Number(row.totals_delivery_fee)).toBe(15000)
    const history = await read.history(order.id)
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({
      from: 'processing',
      to: 'processing',
      // Whichever of the two racing callers won the lock wrote the row.
      by_id: (results[0]!.ok ? as.owner : as.editor)!.id,
      note: 'Reassigned from Ubud (UBD-01) to Sanur (SNR-01).',
    })
  })

  it('cancelling a held order returns its stock once', async () => {
    const order = await placeOrder(stack, {
      store: shop.ubud,
      status: 'waiting_driver',
      lines: [{ qty: 3, stock: { [shop.ubud]: 0 } }],
    })
    const results = await Promise.all(
      [as.owner, as.editor, as.owner].map((actor) =>
        moveOrder(stack.payload, {
          orderId: order.id,
          to: 'cancelled',
          actor,
          reason: 'Buyer asked.',
        }),
      ),
    )
    expect(results.filter((r) => r.ok)).toEqual([expect.objectContaining({ stockReturned: true })])
    expect(results.filter((r) => !r.ok).map((r) => !r.ok && r.refusal)).toEqual([
      'no_change',
      'no_change',
    ])
    expect(await read.quantity(order.stock[0]![shop.ubud]!)).toBe(3)
    expect((await read.order(order.id)).status).toBe('cancelled')
    expect((await read.history(order.id)).map((h) => [h.from, h.to, h.note])).toEqual([
      ['waiting_driver', 'cancelled', 'Buyer asked.'],
    ])
    // A cancel once the driver has the parcel returns nothing: the units left the shelf.
    const gone = await placeOrder(stack, {
      store: shop.ubud,
      status: 'on_the_way',
      lines: [{ qty: 1, stock: { [shop.ubud]: 2 } }],
    })
    expect(
      await moveOrder(stack.payload, { orderId: gone.id, to: 'cancelled', actor: as.owner }),
    ).toMatchObject({ ok: true, stockReturned: false })
    expect(await read.quantity(gone.stock[0]![shop.ubud]!)).toBe(2)
  })
})
