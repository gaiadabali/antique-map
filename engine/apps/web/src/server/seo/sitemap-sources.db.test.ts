/**
 * The sitemap sources on a real, pushed database (9.3fix): published-only, both locales, a draft
 * never listed, a sold work listed, the shop sitemap carrying no `/contact` (the shop has none).
 * Without `CMS_TEST_POSTGRES_URL` the file skips — a setup state, same as the other `*.db.test.ts`
 * files beside this one.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  startWorksStack,
  type WorksStack,
} from '../../../../../packages/cms/src/collections/works/works.test-support'
import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../../../../packages/cms/src/collections/users/staff.test-support'
import { queryGallerySitemap, queryShopSitemap } from './sitemap-sources'

describe.skipIf(!process.env.CMS_TEST_POSTGRES_URL)(
  'the gallery sitemap sources on a real database',
  () => {
    let stack: WorksStack

    const publish = (data: object) =>
      invalidationBatch().operation((context) =>
        stack.api.create({ collection: 'works', data: { ...data, _status: 'published' }, context }),
      )

    beforeAll(async () => {
      stack = await startWorksStack('web_sitemap_test', (config, key) =>
        getPayload({ config, key }),
      )
      const recto = await stack.media('recto')
      const grade = await invalidationBatch().operation((context) =>
        stack.api.create({
          context,
          collection: 'terms',
          data: { kind: 'grade', label: 'VG+', definition: 'Very good.', equivalent: 'A' },
        }),
      )

      const complete = (over: object) => ({
        objectType: 'map',
        date: { precision: 'circa', from: 1700 },
        condition: { grade: grade.id },
        images: [{ media: recto }],
        dimensions: { image: { height: 280, width: 360 }, sheet: { height: 310, width: 400 } },
        ...over,
      })

      await publish(complete({ title: 'Kaart van Batavia', stockNumber: 'M.0601' }))
      await publish(complete({ title: 'Sold chart', stockNumber: 'M.0602', status: 'sold' }))
      await stack.api.create({
        collection: 'works',
        data: complete({ title: 'Draft map', stockNumber: 'M.0603' }),
      })
    }, 180_000)
    afterAll(() => stack?.stop(), 60_000)

    it('lists every published work in both locales with translated segments', async () => {
      const entries = await queryGallerySitemap(stack.payload)
      const batavia = entries.find((e) => e.paths.en.includes('kaart-van-batavia'))
      expect(batavia).toBeDefined()
      expect(batavia?.paths.id.startsWith('/id/produk/')).toBe(true)
      expect(batavia?.paths.id).toContain('kaart-van-batavia')
    }, 30_000)

    it('a draft work is not listed', async () => {
      const entries = await queryGallerySitemap(stack.payload)
      expect(entries.some((e) => e.paths.en.includes('draft-map'))).toBe(false)
    }, 30_000)

    it('a sold work is listed', async () => {
      const entries = await queryGallerySitemap(stack.payload)
      expect(entries.some((e) => e.paths.en.includes('sold-chart'))).toBe(true)
    }, 30_000)
  },
)

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
    })
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
