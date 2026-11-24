/**
 * The chat's product images on a real, pushed Postgres (TASKS.md 23.4, carry-over): Payload computes
 * a media record's `url` from its `filename` after the read, so a populate that selects `url`
 * without `filename` answers `url: null` wherever no public derivative is published yet — the chat
 * then showed no picture. The projection's `MEDIA_POPULATE` reads `filename` (and the derivative's
 * fields), and the reader's `imageUrl` chooses the URL the pages choose.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { makeProduct } from '@engine/cms-shop/collections/stock-levels/shop.test-support'

import { collectingWrites } from '../../../cms/src/collections/places/pushed-database.test-support'
import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../../cms/src/collections/users/staff.test-support'
import { mediaUrl } from '../../../chat/src/server/projection/read'
import { PRODUCT_POPULATE } from '../../../chat/src/server/projection/products'
import { PUBLIC_IMAGE_SELECT, publicImageUrl } from '../media/public-image'
import { payloadCatalogue } from './catalogue'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

describe.skipIf(!server)('the chat’s product image, on a real database', () => {
  let stack: StaffStack
  let productId = 0

  beforeAll(async () => {
    stack = await startStaffStack('site_chat_image_test', async (config, key) =>
      collectingWrites(await getPayload({ config, key })),
    )
    const media = (await stack.payload.create({
      collection: 'media',
      locale: 'en',
      data: { alt: 'A tote', subject: 'product', role: 'flat', provenance: 'photograph' } as never,
      file: { data: PNG, mimetype: 'image/png', name: 'tote.png', size: PNG.length },
    })) as unknown as { id: number }
    const product = await makeProduct(stack.payload, 'OE-TOTE-IMG')
    productId = Number(product.id)
    await stack.payload.update({
      collection: 'products',
      id: productId,
      data: { images: [{ image: media.id }] } as never,
      draft: true,
    })
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const firstImage = async (media: Record<string, unknown>) => {
    const { docs } = await stack.payload.find({
      collection: 'products',
      where: { id: { equals: productId } },
      select: { images: { image: true } } as never,
      populate: { media } as never,
      depth: 1,
      draft: true,
      overrideAccess: true,
    })
    const images = (docs[0] as { images?: Array<{ image?: unknown }> } | undefined)?.images
    return images?.[0]?.image as Record<string, unknown> | undefined
  }

  it('answers url: null to a populate of { url, alt } — the finding', async () => {
    const image = await firstImage({ url: true, alt: true })
    expect(image?.alt).toBe('A tote')
    expect(image?.url ?? null).toBeNull()
  })

  it('answers the record’s URL to the projection’s populate, which the reader passes on', async () => {
    const image = await firstImage(PRODUCT_POPULATE.media)
    expect(image?.url).toMatch(/^\/api\/media\/file\/tote.*\.png$/)
    const reader = payloadCatalogue(stack.payload)
    // No bucket here: no derivative is published, so the image is the record's own file.
    expect(mediaUrl(image, reader.imageUrl?.bind(reader))).toBe(image?.url)
  })

  it('answers the record’s URL to the pages’ PUBLIC_IMAGE_SELECT too', async () => {
    const image = await firstImage({ ...PUBLIC_IMAGE_SELECT, provenance: true })
    expect(image?.url).toMatch(/^\/api\/media\/file\/tote.*\.png$/)
    expect(publicImageUrl(image ?? {}, '')).toBe(image?.url)
  })
})
