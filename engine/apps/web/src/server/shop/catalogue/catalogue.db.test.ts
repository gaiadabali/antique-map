/**
 * The shop catalogue's loaders on a real, pushed database (6.1.a): published-only reads that
 * select only the fields a page shows — never a store id, code or quantity — and availability
 * that counts an active store's stock alone, and search that finds "Baróe" from "baroe".
 * Without `CMS_TEST_POSTGRES_URL` the file skips — a setup state.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  CARD_SELECT,
  PRODUCT_SELECT,
  getProduct,
  getRelatedWork,
  listProducts,
  productsByIds,
} from './queries'
import { availabilityFor, withAvailability } from './availability'
import { searchProductIds } from './search'
import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../../../../../packages/cms/src/collections/users/staff.test-support'

// A 1×1 transparent PNG, as `payload.create`'s `file` wants it.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

describe.skipIf(!server)('shop catalogue loaders, on a real database', () => {
  let stack: StaffStack
  let active: number
  let retired: number
  let term: number
  let media: number

  /** A published product in the shop, with a category term and an image, as publishing demands. */
  const publishProduct = async (data: Record<string, unknown>) => {
    const draft = await stack.payload.create({
      collection: 'products',
      data: {
        site: 'shop',
        category: term,
        images: [{ image: media }],
        price: 95000,
        _status: 'draft',
        ...data,
      } as never,
    })
    return stack.payload.update({
      collection: 'products',
      id: (draft as unknown as { id: number }).id,
      data: { _status: 'published' } as never,
    }) as unknown as Promise<{ id: number; slug: string; name: string }>
  }

  beforeAll(async () => {
    stack = await startStaffStack('web_shop_catalogue_test', (config, key) =>
      getPayload({ config, key }),
    )
    // Two stores: the first active (an address and a pin, as activating demands), the second not.
    const first = (await stack.payload.update({
      collection: 'stores',
      id: stack.stores[0].id,
      data: {
        active: true,
        address: 'Jl. Raya Ubud 1',
        lat: -8.5069,
        lng: 115.262,
      } as never,
    })) as unknown as { id: number }
    active = first.id
    retired = stack.stores[1].id
    term = (
      (await invalidationBatch().operation((context) =>
        stack.payload.create({
          context,
          collection: 'terms',
          data: { kind: 'room', label: 'Prints', _status: 'published' } as never,
        }),
      )) as unknown as { id: number }
    ).id
    media = (
      (await stack.payload.create({
        collection: 'media',
        data: { alt: 'A print', subject: 'product', role: 'flat', provenance: 'photograph' },
        file: { data: TINY_PNG, mimetype: 'image/png', name: 'tiny.png', size: TINY_PNG.length },
      })) as unknown as { id: number }
    ).id
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const stock = (data: Record<string, unknown>) =>
    stack.payload.create({ collection: 'stock-levels', data: data as never })

  it('the listing loader never selects a store id or quantity', () => {
    for (const select of [CARD_SELECT, PRODUCT_SELECT]) {
      const keys = Object.keys(select)
      expect(keys).not.toContain('site')
      expect(keys).not.toContain('notes')
      for (const key of keys) {
        expect(key.toLowerCase()).not.toContain('store')
        expect(key.toLowerCase()).not.toContain('quantity')
        expect(key.toLowerCase()).not.toContain('stock')
      }
    }
  })

  it('a product with zero stock in every active store is not available', async () => {
    const product = await publishProduct({ sku: 'OEI-ZERO', name: 'Zero' })
    await stock({ store: active, product: product.id, quantity: 0 })
    const availability = await availabilityFor(stack.payload, [product.id])
    const answer = availability.get(product.id)
    expect(answer?.product).toBe(false)
    const { items } = await listProducts(stack.payload)
    const card = items.find((item) => item.id === product.id)
    expect(card).toBeDefined()
    expect(withAvailability(card!, answer).available).toBe(false)
  })

  it('stock in an inactive store does not count', async () => {
    const product = await publishProduct({ sku: 'OEI-INACTIVE', name: 'Inactive stock' })
    await stock({ store: retired, product: product.id, quantity: 5 })
    let answer = (await availabilityFor(stack.payload, [product.id])).get(product.id)
    expect(answer?.product).toBe(false)
    // The same units, once the store takes orders, count.
    await stack.payload.update({
      collection: 'stores',
      id: retired,
      data: { active: true, address: 'Jl. Sanur 2', lat: -8.67, lng: 115.26 } as never,
    })
    answer = (await availabilityFor(stack.payload, [product.id])).get(product.id)
    expect(answer?.product).toBe(true)
  })

  it('search finds a product by an accented Indonesian word without the accent', async () => {
    const product = await publishProduct({
      sku: 'OEI-BAROE',
      name: 'Peta Jawa Baróe',
      description: 'Peta lama dengan catatan Baróe.',
    })
    const ids = await searchProductIds(stack.payload, 'baroe', 'en')
    expect(ids).toContain(product.id)
    const cards = await productsByIds(stack.payload, ids)
    expect(cards.items[0]!.slug).toBe(product.slug)
  })

  it('the product page loader returns a published product by its slug, and no draft', async () => {
    const product = await publishProduct({
      sku: 'OEI-FIND',
      name: 'Cetak Batavia',
      description: 'A view of Batavia.',
    })
    const found = await getProduct(stack.payload, product.slug)
    expect(found?.name).toBe('Cetak Batavia')
    expect(found?.description).toBe('A view of Batavia.')
    expect(found?.images.length).toBeGreaterThan(0)
    expect(found?.category?.slug).toBe('prints')
    expect(await getProduct(stack.payload, 'no-such-product')).toBeNull()
    expect(await getRelatedWork(stack.payload, 999999)).toBeNull()
  })
})
