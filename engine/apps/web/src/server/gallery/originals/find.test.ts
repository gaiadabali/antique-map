/**
 * The gallery's originals reads (TASKS.md 23.5.a, 23.5.d): the visitor's access, published only,
 * projected; the picture a published derivative or nothing. `./find.db.test.ts` proves the draft
 * filter on a real database.
 */
import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { featuredOf, findOriginal, ORIGINAL_SELECT } from './find'

const BASE = 'https://media.example.test/indies-media'
const ORIGIN = 'https://gallery.example.test'
const ID = '0123456789abcdef0123456789abcdef'

const media = (extra: Record<string, unknown> = {}) => ({
  url: '/api/media/file/M-1044.jpg',
  alt: 'Java, 1598',
  width: 1200,
  height: 900,
  assetId: ID,
  derivatives: { status: 'ready' },
  ...extra,
})

function payloadAnswering(docs: unknown[]) {
  const find = vi.fn(async (_options: Record<string, unknown>) => ({ docs }))
  return { payload: { find } as unknown as Payload, find }
}

describe('findOriginal()', () => {
  it('finds a published work by its stock number, projected, as the visitor', async () => {
    const { payload, find } = payloadAnswering([
      { id: 7, publicId: 12, title: 'Insulae Iavae', workUid: 'w-1', images: [{ media: media() }] },
    ])
    const found = await findOriginal(payload, 'M.1044', 'id', ORIGIN, BASE)
    expect(found).toEqual({
      work: {
        stockNumber: 'M.1044',
        title: 'Insulae Iavae',
        url: `${ORIGIN}/id/produk/12-insulae-iavae`,
        image: {
          url: `${BASE}/derivatives/v1/${ID}/1200.webp`,
          alt: 'Java, 1598',
          width: 1200,
          height: 900,
        },
      },
      workUid: 'w-1',
    })
    const options = find.mock.calls[0]?.[0]
    expect(options).toMatchObject({
      collection: 'works',
      overrideAccess: false,
      locale: 'id',
      limit: 1,
      where: {
        and: [{ _status: { equals: 'published' } }, { stockNumber: { equals: 'M.1044' } }],
      },
      select: ORIGINAL_SELECT,
    })
    expect(JSON.stringify(ORIGINAL_SELECT)).not.toMatch(/askingPrice|notes|rights|physical/)
  })

  it('is null when no published work has the number (unknown, or a draft the filter skips)', async () => {
    const { payload } = payloadAnswering([])
    expect(await findOriginal(payload, 'M.9', 'en', ORIGIN, BASE)).toBeNull()
  })

  it('sends no picture until a derivative is published: the record’s own file is staff-only', async () => {
    const pending = media({ derivatives: { status: 'pending' } })
    const { payload } = payloadAnswering([
      { id: 7, publicId: 12, title: 'Insulae Iavae', images: [{ media: pending }] },
    ])
    const found = await findOriginal(payload, 'M.1044', 'en', ORIGIN, BASE)
    expect(found?.work.image).toBeNull()
    expect(found?.work.url).toBe(`${ORIGIN}/product/12-insulae-iavae`)
    expect(JSON.stringify(found)).not.toContain('/api/media/file')
  })
})

describe('featuredOf()', () => {
  const card = (url: string) => ({
    title: 'Java',
    date: '1598',
    maker: 'Linschoten',
    publicId: 3,
    image: { url, alt: 'Java', width: 640, height: 480 },
  })

  it('keeps the chosen works whose picture is a published derivative, linked on the gallery', () => {
    const derivative = `${BASE}/derivatives/v1/${ID}/640.webp`
    expect(
      featuredOf([card(derivative), card('/api/media/file/x.jpg')], 'en', ORIGIN, BASE),
    ).toEqual([
      {
        title: 'Java',
        date: '1598',
        maker: 'Linschoten',
        url: `${ORIGIN}/product/3-java`,
        image: { url: derivative, alt: 'Java', width: 640, height: 480 },
      },
    ])
    expect(featuredOf([card(derivative)], 'en', ORIGIN, '')).toEqual([])
  })
})
