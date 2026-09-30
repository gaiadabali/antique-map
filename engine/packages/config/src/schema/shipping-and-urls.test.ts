// C1 v1.2 (TASKS.md 3.4.b): a seller's own couriers, resolved to the brand's when it names none
// (3.1 senior-be #2); the URLs a config names are https only (senior-be #4) — a social link on a
// domain, a sister's base as a bare origin; an asset only of a type the brand-assets route serves.
import { describe, expect, expectTypeOf, it } from 'vitest'

import { parseEditorialGlobals } from '../loader/globals-parts'
import { parseUrl } from './url'
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
    // 3.4 senior-be #7: names no deployed site answers at.
    'https://shop.localhost/x',
    'https://printer.local/x',
    'https://svc.internal/x',
    'https://nowhere.invalid/x',
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

  it('holds an editor’s social link in the CMS to the same rule as the file’s (3.4 be #4)', () => {
    const social = (url: string) => parseEditorialGlobals({ social: { instagram: url } })
    expect(social('https://instagram.example/test-gallery')?.overrides.social).toEqual({
      instagram: 'https://instagram.example/test-gallery',
    })
    for (const url of refused) {
      const parsed = social(url)
      expect(parsed?.overrides.social, url).toBeUndefined()
      expect(
        parsed?.refused.map((each) => each.part),
        url,
      ).toEqual(['social'])
    }
  })

  it('reads a URL with the WHATWG parser, typed without Node’s or the DOM’s types (3.4 CI)', () => {
    expect(parseUrl('https://Shop.Example.com:443/a?b#c')).toMatchObject({
      origin: 'https://shop.example.com',
      hostname: 'shop.example.com',
      protocol: 'https:',
    })
    expect(parseUrl('https://app:secret@example.com')).toMatchObject({ username: 'app' })
    for (const bad of ['', 'not a url', 'https://', '//example.com'])
      expect(parseUrl(bad)).toBeNull()
  })

  it('takes a sister’s base as a bare https origin, a port allowed', () => {
    for (const origin of [
      'https://shop.example.com',
      'https://shop.example.com:8443',
      'https://xn--bcher-kva.example',
    ])
      expect(httpsOriginSchema.safeParse(origin).success, origin).toBe(true)
    // A name that is not ASCII is written as its origin is: in punycode.
    const unicode = httpsOriginSchema.safeParse('https://bücher.example')
    expect(unicode.success ? '' : unicode.error.issues[0]?.message).toMatch(/punycode/)
    for (const url of [
      ...refused,
      'https://shop.example.com/',
      'https://shop.example.com/archive',
      'https://shop.example.com?x=1',
      'https://shop.example.com#top',
      'https://Shop.example.com',
      'https://bücher.example',
    ]) {
      expect(httpsOriginSchema.safeParse(url).success, url).toBe(false)
      expect(paths(parse((raw) => (raw.sisters[0].baseUrl = url))), url).toEqual([
        'sisters.0.baseUrl',
      ])
    }
  })
})

describe('C1 — a sister is another brand (3.4 senior-be #12)', () => {
  it('refuses a sister named by the brand’s own slug', () => {
    expect(paths(parse(() => {}))).toEqual([])
    const own = parse((raw) => (raw.sisters[0].slug = raw.slug))
    expect(paths(own)).toEqual(['sisters.0.slug'])
    expect(own.success ? '' : own.error.issues[0]?.message).toBe(
      'is this brand\'s own slug ("test"): a sister is another brand',
    )
  })
})

describe('C1 — a brand names only files the brand-assets route serves (3.4 senior-fe #2)', () => {
  it('takes the allowlisted extensions, in any case, and refuses the rest with one issue', () => {
    const ok = parse((raw) => {
      raw.assets.logo = 'marks/Logo.SVG'
      raw.assets.fonts = [{ family: 'Display', src: 'fonts/display.woff2' }]
    })
    expect(paths(ok)).toEqual([])
    for (const [field, value] of [
      ['logo', 'logo.gif'],
      ['favicon', 'favicon'],
      ['ogImage', 'og.html'],
      ['ogImage', '../og.png'],
    ] as const) {
      const result = parse((raw) => (raw.assets[field] = value))
      expect(paths(result), value).toEqual([`assets.${field}`])
    }
    const font = parse((raw) => (raw.assets.fonts = [{ family: 'Display', src: 'display.ttf' }]))
    expect(paths(font)).toEqual(['assets.fonts.0.src'])
    expect(font.success ? '' : font.error.issues[0]?.message).toMatch(/\.woff2/)
  })
})
