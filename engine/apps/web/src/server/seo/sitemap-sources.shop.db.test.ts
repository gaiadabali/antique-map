/**
 * The shop sitemap sources on a real, pushed database (9.3fix): published products listed, the
 * shop sitemap carrying no `/contact` (the shop has none). Its own file: a second Payload stack in
 * the gallery file's process finds no tables. Without `CMS_TEST_POSTGRES_URL` the file skips.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../../../../packages/cms/src/collections/users/staff.test-support'
import { queryShopSitemap } from './sitemap-sources'

// A 1×1 transparent PNG, as `payload.create`'s `file` wants it.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

describe.skipIf(!server)('the shop sitemap sources on a real database', () => {
  let stack: StaffStack
  let term: number
  let media: number

  const publishProduct = async (data: Record<string, unknown>) => {
    // Outside a request the invalidation hook needs a collector (`@engine/cache` batch).
    const write = invalidationBatch()
    const draft = await write.operation((context) =>
      stack.payload.create({
        context,
        collection: 'products',
        data: {
          site: 'shop',
          category: term,
          images: [{ image: media }],
          price: 95000,
          _status: 'draft',
          ...data,
        } as never,
      }),
    )
    return write.operation((context) =>
      stack.payload.update({
        context,
        collection: 'products',
        id: (draft as unknown as { id: number }).id,
        data: { _status: 'published' } as never,
      }),
    )
  }

  beforeAll(async () => {
    stack = await startStaffStack('web_sitemap_shop_test', (config, key) =>
      getPayload({ config, key }),
    )
    const categoryTerm = (await invalidationBatch().operation((context) =>
      stack.payload.create({
        context,
        collection: 'terms',
        data: { kind: 'room', label: 'Sitemap category', _status: 'published' } as never,
      }),
    )) as unknown as { id: number }
    term = categoryTerm.id
    const uploaded = (await stack.payload.create({
      collection: 'media',
      data: {
        alt: 'Sitemap product image',
        subject: 'product',
        role: 'flat',
        provenance: 'photograph',
      },
      file: { data: TINY_PNG, mimetype: 'image/png', name: 'tiny.png', size: TINY_PNG.length },
    })) as unknown as { id: number }
    media = uploaded.id
    await publishProduct({ name: 'Batik Sarong', slug: 'batik-sarong', sku: 'OEI-SITEMAP-1' })
  }, 180_000)
  afterAll(() => stack?.stop?.(), 60_000)

  it('lists published products and carries no /contact (the shop has no such route)', async () => {
    const entries = await queryShopSitemap(stack.payload)
    expect(entries.some((e) => e.paths.en.includes('batik-sarong'))).toBe(true)
    expect(entries.some((e) => e.paths.en === '/contact')).toBe(false)
  }, 30_000)
})
