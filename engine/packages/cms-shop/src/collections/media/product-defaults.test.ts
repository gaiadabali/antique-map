import { describe, expect, it } from 'vitest'

import { PRODUCT_IMAGE_DEFAULTS, productImageDefaults } from './product-defaults'

type Product = { name?: string } | null

const run = (
  data: Record<string, unknown>,
  options: { operation?: string; locale?: string; product?: Product } = {},
) => {
  const reads: unknown[] = []
  const req = {
    locale: options.locale ?? 'en',
    payload: {
      findByID: async (args: unknown) => {
        reads.push(args)
        return options.product === undefined ? { name: 'Batavia, 1681' } : options.product
      },
    },
  }
  const result = productImageDefaults({
    data,
    operation: options.operation ?? 'create',
    req,
  } as never) as Promise<Record<string, unknown>>
  return { result, reads }
}

describe('a product photo’s intake', () => {
  it('starts as a product photograph, flat, with the product’s name as its alt', async () => {
    const { result, reads } = run({ forProduct: 12 })
    expect(await result).toMatchObject({
      ...PRODUCT_IMAGE_DEFAULTS,
      alt: 'Batavia, 1681',
      altSource: 'baseline',
    })
    // Read as the uploader may read it, drafts included.
    expect(reads[0]).toMatchObject({
      collection: 'products',
      id: 12,
      overrideAccess: false,
      draft: true,
    })
  })

  it('keeps what the uploader set', async () => {
    const { result } = run({
      forProduct: { id: 12 },
      provenance: 'rendered',
      role: 'lifestyle',
      alt: 'The print, framed, on a wall',
    })
    expect(await result).toMatchObject({
      subject: 'product',
      role: 'lifestyle',
      provenance: 'rendered',
      alt: 'The print, framed, on a wall',
    })
  })

  it('fills nothing for an image not uploaded for a product, or on an update', async () => {
    expect(await run({ alt: '' }).result).toEqual({ alt: '' })
    expect(await run({ forProduct: 12 }, { operation: 'update' }).result).toEqual({
      forProduct: 12,
    })
  })

  it('gives no alt for a product the uploader cannot read, or an all-locales write', async () => {
    expect((await run({ forProduct: 12 }, { product: null }).result).alt).toBeUndefined()
    const all = run({ forProduct: 12 }, { locale: 'all' })
    expect((await all.result).alt).toBeUndefined()
    expect(all.reads).toHaveLength(0)
  })
})
