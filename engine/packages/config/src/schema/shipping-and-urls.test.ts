// C1 v1.2 (TASKS.md 3.4.b): a seller's own couriers, resolved to the brand's when it names none
// (3.1 senior-be #2); the URLs a config names are https only (senior-be #4) — a social link on a
// domain, a sister's base as a bare origin.
import { describe, expect, expectTypeOf, it } from 'vitest'

import { testBrandConfig } from '../validate/testing/fixtures'
import {
  brandConfigSchema,
  httpsOriginSchema,
  httpsUrlSchema,
  type BrandConfig,
  type SellerConfig,
  type ShippingConfig,
} from '../schema'

/* eslint-disable @typescript-eslint/no-explicit-any -- each case reaches into raw JSON */
type Raw = any
const parse = (mutate: (raw: Raw) => void) => {
  const raw: Raw = testBrandConfig('gallery')
  mutate(raw)
  return brandConfigSchema.safeParse(raw)
}
const paths = (result: ReturnType<typeof parse>) =>
  result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))

describe('C1 — sellers[].shipping', () => {
  it('resolves a seller that names no couriers to the brand’s, as a list of its own', () => {
    const result = parse(() => {})
    expect(result.success).toBe(true)
    if (!result.success) return
    const { sellers, shipping } = result.data
    for (const seller of sellers) {
      expect(seller.shipping).toEqual(shipping)
      expect(seller.shipping.providers).not.toBe(shipping.providers)
    }
  })

  it('keeps a seller’s own couriers, and leaves the others with the brand’s', () => {
    const result = parse((raw) => {
      raw.sellers[0].shipping = { providers: ['dhl-express', 'quote'] }
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.sellers[0]?.shipping.providers).toEqual(['dhl-express', 'quote'])
    expect(result.data.sellers[1]?.shipping.providers).toEqual(result.data.shipping.providers)
  })

  it('refuses an unknown courier, an empty list and an unknown key, naming the field', () => {
    expect(paths(parse((raw) => (raw.sellers[0].shipping = { providers: ['fedex'] })))).toEqual([
      'sellers.0.shipping.providers.0',
    ])
    expect(paths(parse((raw) => (raw.sellers[1].shipping = { providers: [] })))).toEqual([
      'sellers.1.shipping.providers',
    ])
    expect(
      paths(parse((raw) => (raw.sellers[0].shipping = { providers: ['quote'], extra: 1 }))),
    ).toEqual(['sellers.0.shipping'])
  })

  it('types every parsed seller with its couriers resolved', () => {
    expectTypeOf<BrandConfig['sellers'][number]>().toEqualTypeOf<SellerConfig>()
    expectTypeOf<SellerConfig['shipping']>().toEqualTypeOf<ShippingConfig>()
  })
})

describe('C1 — the URLs a config names are https only', () => {
  const refused = [
    'http://instagram.example/shop',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'https:instagram.example/shop',
    'https://user:secret@instagram.example/shop',
    'https://localhost/shop',
    'https://127.0.0.1/shop',
    'ftp://instagram.example/shop',
  ]

  it('takes a social link on a domain, with a path, and nothing else', () => {
    expect(httpsUrlSchema.safeParse('https://instagram.example/test-gallery').success).toBe(true)
    for (const url of refused) expect(httpsUrlSchema.safeParse(url).success, url).toBe(false)
    for (const url of refused) {
      expect(paths(parse((raw) => (raw.identity.social = { instagram: url }))), url).toEqual([
        'identity.social.instagram',
      ])
    }
  })

  it('takes a sister’s base as a bare https origin, a port allowed', () => {
    for (const origin of ['https://shop.example.com', 'https://shop.example.com:8443'])
      expect(httpsOriginSchema.safeParse(origin).success, origin).toBe(true)
    for (const url of [
      ...refused,
      'https://shop.example.com/',
      'https://shop.example.com/archive',
      'https://shop.example.com?x=1',
      'https://shop.example.com#top',
      'https://Shop.example.com',
    ]) {
      expect(httpsOriginSchema.safeParse(url).success, url).toBe(false)
      expect(paths(parse((raw) => (raw.sisters[0].baseUrl = url))), url).toEqual([
        'sisters.0.baseUrl',
      ])
    }
  })
})
