/**
 * The product editor and list on a real, pushed Postgres (TASKS.md 27.2.d), as each role: what the
 * stock table reads (`./data` `stockTable`) and the requests it sends (`./stock-grid`
 * `stockRequest`) through Payload's own REST handler; the list's stock totals and out-of-stock
 * filter; and Duplicate. The collections' access is the only guard — store staff see and count
 * their own store alone, only the owner starts a row — and this checks it holds for the screens.
 */
import { getPayload, type Payload, type TypedUser } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { makeProduct } from '../../collections/stock-levels/shop.test-support'
import {
  server,
  startStaffStack,
  type Caller,
  type StaffStack,
} from '../../db/staff-stack.test-support'
import { coverOf, outOfStockIds, photoThumbs, stockTable, stockTotals } from './data'
import { stockRequest } from './stock-grid'

describe.skipIf(!server)('the product editor and list, on a real database', () => {
  let stack: StaffStack
  let payload: Payload
  let own: number
  let other: number
  let product: number
  let empty: number

  const as = (role: Caller) => stack.users[role] as unknown as TypedUser

  beforeAll(async () => {
    stack = await startStaffStack('cms_product_editor_test', (config, key) =>
      getPayload({ config, key }),
    )
    payload = stack.payload
    own = stack.stores[0].id
    other = stack.stores[1].id
    product = (await makeProduct(payload, 'PE-PRINT', ['PE-PRINT-A4', 'PE-PRINT-A3'])).id
    empty = (await makeProduct(payload, 'PE-TOTE')).id
    for (const [store, variantSku, quantity] of [
      [own, 'PE-PRINT-A4', 2],
      [other, 'PE-PRINT-A4', 5],
      [other, 'PE-PRINT-A3', 1],
    ] as const) {
      await payload.create({
        collection: 'stock-levels',
        data: { store, product, variantSku, quantity } as never,
      })
    }
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('reads every store and row for the owner, their own alone for store staff', async () => {
    const owner = await stockTable(payload, as('owner'), product)
    expect(owner.stores.map((s) => s.id).sort()).toEqual([own, other].sort())
    expect(owner.rows).toHaveLength(3)
    const store = await stockTable(payload, as('store'), product)
    expect(store.stores.map((s) => s.id)).toEqual([own])
    expect(store.rows.map((r) => [r.store, r.variantSku, r.quantity])).toEqual([
      [own, 'PE-PRINT-A4', 2],
    ])
    expect(await stockTable(payload, null, product)).toEqual({ stores: [], rows: [] })
  })

  it('totals stock as the person may read it', async () => {
    const owner = await stockTotals(payload, as('owner'), [product, empty])
    expect(owner.get(String(product))).toBe(8)
    expect(owner.get(String(empty))).toBe(0)
    expect((await stockTotals(payload, as('store'), [product])).get(String(product))).toBe(2)
  })

  it('offers out of stock to whoever reads every store, and to no one else', async () => {
    const ids = await outOfStockIds(payload, as('owner'))
    expect(ids).toContain(empty)
    expect(ids).not.toContain(product)
    expect(await outOfStockIds(payload, as('editor'))).toEqual(ids)
    expect(await outOfStockIds(payload, as('store'))).toBeNull()
  })

  async function send(role: Caller, input: Parameters<typeof stockRequest>[0]) {
    const request = stockRequest(input)
    return stack.rest(request.method, request.url, { as: role, json: request.body })
  }

  it('lets store staff count their own store’s row and nothing else', async () => {
    const { rows } = await stockTable(payload, as('owner'), product)
    const mine = rows.find((r) => r.store === own)!
    const theirs = rows.find((r) => r.store === other && r.variantSku === 'PE-PRINT-A4')!
    const counted = await send('store', {
      row: mine,
      store: own,
      product,
      variantSku: 'PE-PRINT-A4',
      count: 4,
    })
    expect(counted.status).toBe(200)
    expect((counted.body?.doc as { quantity?: number }).quantity).toBe(4)
    const refused = await send('store', {
      row: theirs,
      store: other,
      product,
      variantSku: 'PE-PRINT-A4',
      count: 9,
    })
    expect([403, 404]).toContain(refused.status)
    const started = await send('store', {
      row: undefined,
      store: own,
      product,
      variantSku: 'PE-PRINT-A3',
      count: 1,
    })
    expect(started.status).toBe(403)
    const { rows: after } = await stockTable(payload, as('owner'), product)
    expect(after.find((r) => r.id === theirs.id)?.quantity).toBe(5)
  })

  it('lets an editor count an existing row, and only the owner start one', async () => {
    const { rows } = await stockTable(payload, as('owner'), product)
    const row = rows.find((r) => r.store === other && r.variantSku === 'PE-PRINT-A3')!
    expect(
      (await send('editor', { row, store: other, product, variantSku: 'PE-PRINT-A3', count: 6 }))
        .status,
    ).toBe(200)
    const input = { row: undefined, store: own, product, variantSku: 'PE-PRINT-A3', count: 3 }
    expect((await send('editor', input)).status).toBe(403)
    const made = await send('owner', input)
    expect(made.status).toBe(201)
    expect((made.body?.doc as { quantity?: number }).quantity).toBe(3)
    // A variant the product does not have is refused with its reason.
    const wrong = await send('owner', { ...input, store: other, variantSku: 'PE-PRINT-A2' })
    expect(wrong.status).toBe(400)
  })

  it('duplicates a product as a draft whose SKUs the rules accept', async () => {
    const copy = await stack.rest('POST', `/api/products/${product}/duplicate?depth=0`, {
      as: 'owner',
      json: {},
    })
    expect(copy.status, JSON.stringify(copy.body)).toBe(200)
    const doc = copy.body?.doc as { sku: string; _status: string; variants: { sku: string }[] }
    expect(doc.sku).toBe('PE-PRINT-COPY')
    expect(doc._status).toBe('draft')
    expect(doc.variants.map((v) => v.sku)).toEqual(['PE-PRINT-A4-COPY', 'PE-PRINT-A3-COPY'])
    const again = await stack.rest('POST', `/api/products/${product}/duplicate?depth=0`, {
      as: 'editor',
      json: {},
    })
    expect((again.body?.doc as { sku: string }).sku).toBe('PE-PRINT-COPY-2')
    expect(
      (await stack.rest('POST', `/api/products/${product}/duplicate`, { as: 'store', json: {} }))
        .status,
    ).toBe(403)
  })

  it('gives the list and the editor a thumbnail before any derivative is published', async () => {
    // A stored file with no published derivative: the thumbnail is the record's own file, whose
    // `url` Payload computes from `filename` after the read — the select has to carry it.
    const filename = `pe-cover-${Date.now()}.jpg`
    const media = (await payload.db.create({
      collection: 'media',
      data: {
        alt: { en: 'A cover' },
        altSource: { en: 'cataloguer' },
        subject: 'product',
        role: 'flat',
        provenance: 'photograph',
        filename,
        mimeType: 'image/jpeg',
      },
    })) as unknown as { id: number }
    const url = `/api/media/file/${filename}`
    expect(await coverOf(payload, as('owner'), [{ image: media.id }])).toContain(url)
    expect((await photoThumbs(payload, as('owner'), [media.id]))[String(media.id)]?.url).toContain(
      url,
    )
    expect(await coverOf(payload, null, [{ image: media.id }])).toBeNull()
  })
})
