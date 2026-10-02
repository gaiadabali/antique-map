/**
 * Each builder's grammar and profile: what it makes, what it refuses, that `parseCacheTag()` — the
 * revalidate route's check — accepts exactly what the builders make, that a tag's expiry is its
 * kind's, and that tags are namespaced by collection with the site only where one record holds a
 * part for each site (TASKS.md 2.2.d).
 */
import { describe, expect, it } from 'vitest'

import {
  EDITORIAL_EXPIRY,
  IMMEDIATE_EXPIRY,
  MAX_TAG_LENGTH,
  parseCacheTag,
  productPriceTag,
  productStockTag,
  productTag,
  redirectsTag,
  requireCacheTag,
  settingsTag,
  TAG_KINDS,
  tagExpiry,
  tagKind,
  workTag,
} from '../src/index'

const byRecordId = [
  ['product', productTag],
  ['product-stock', productStockTag],
  ['product-price', productPriceTag],
] as const

describe('the record-id builders: product, product-stock, product-price', () => {
  it.each(byRecordId)('%s:<id> for every positive safe integer', (kind, build) => {
    for (const id of [1, 1706, 2_000_000, Number.MAX_SAFE_INTEGER]) {
      expect(build(id)).toBe(`${kind}:${id}`)
      expect(parseCacheTag(`${kind}:${id}`)).toBe(`${kind}:${id}`)
    }
  })

  it.each(byRecordId)('%s refuses anything that is not a record id', (kind, build) => {
    for (const id of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 1e21]) {
      expect(() => build(id), String(id)).toThrow(new RegExp(`^${kind} tag: .* is not a record id`))
    }
  })
})

describe('work:<workUid>', () => {
  it('takes a workUid: the gallery’s prefix, a hyphen, digits', () => {
    for (const uid of ['IG-000123', 'ABC-1', 'A1-0', 'ABCDEFGH-1234567890123456', 'X9-42']) {
      expect(workTag(uid)).toBe(`work:${uid}`)
      expect(parseCacheTag(`work:${uid}`)).toBe(`work:${uid}`)
    }
  })

  it('refuses anything else', () => {
    for (const uid of [
      '',
      'IG',
      'IG-',
      '-000123',
      'ig-000123', // lower case
      'I-000123', // a one-character prefix
      'ABCDEFGHI-1', // nine
      '1X-000123', // a digit first
      'IG-12a',
      'IG_000123',
      'IG-000123 ',
      'IG-000123:product:1',
      'IG-１２３', // full-width digits
    ]) {
      expect(() => workTag(uid), JSON.stringify(uid)).toThrow(/^work tag: .* is not a workUid/)
      expect(parseCacheTag(`work:${uid}`), JSON.stringify(uid)).toBeNull()
    }
  })
})

describe('the site-scoped tags: one record, a part per site', () => {
  it('name a site, and only a site', () => {
    expect(settingsTag('gallery')).toBe('settings:gallery')
    expect(redirectsTag('shop')).toBe('redirects:shop')
    for (const value of [
      'settings:',
      'settings:emporium',
      'settings:Gallery',
      'redirects:gallery ',
    ]) {
      expect(parseCacheTag(value), value).toBeNull()
    }
    expect(() => settingsTag('brand' as never)).toThrow(/^settings tag: "brand" is not a site/)
  })

  it('leave every other kind site-free, so one invalidation reaches both sites', () => {
    for (const tag of [workTag('IG-1'), productTag(1), productStockTag(1), productPriceTag(1)]) {
      expect(tag).not.toMatch(/gallery|shop/)
    }
  })
})

describe('parseCacheTag(): the grammar the revalidate route checks', () => {
  it('accepts no second spelling of a tag', () => {
    for (const value of [
      'product:01', // a leading zero
      'product:0',
      'product:+1',
      'product:-1',
      'product:1.0',
      'product:1e3',
      'product:0x10',
      'product: 1',
      'product:1 ',
      'product:',
      'PRODUCT:1',
      'product::1',
      'product:1:2',
      'product:9007199254740992', // past the largest safe integer
      'product-stock:١٢', // Arabic-Indic digits
    ]) {
      expect(parseCacheTag(value), value).toBeNull()
    }
  })

  it('accepts no kind it has no builder for — the one-brand kinds included', () => {
    for (const value of [
      'item:1',
      'availability:1',
      'price:1',
      'maker:1',
      'constructor:1',
      '__proto__:1',
      '_N_T_/en/item/1', // a Next implicit (path) tag
      '1',
      'product',
      '',
    ]) {
      expect(parseCacheTag(value), value).toBeNull()
    }
  })

  it('refuses a value that is not a string, and reads nothing past MAX_TAG_LENGTH', () => {
    for (const value of [undefined, null, 1, ['product:1'], { tag: 'product:1' }]) {
      expect(parseCacheTag(value)).toBeNull()
    }
    expect(parseCacheTag(`product:${'1'.repeat(MAX_TAG_LENGTH)}`)).toBeNull()
    expect(MAX_TAG_LENGTH).toBeLessThanOrEqual(256) // Next's own limit on a tag
    expect(`product-price:${'9'.repeat(16)}`.length).toBeLessThanOrEqual(MAX_TAG_LENGTH)
  })

  it('requireCacheTag() throws naming what it was given', () => {
    expect(requireCacheTag('product-price:7')).toBe('product-price:7')
    expect(() => requireCacheTag('product-price:07')).toThrow(
      'not a cache tag @engine/cache makes: "product-price:07"',
    )
  })
})

describe('each kind has its expiry', () => {
  it('editorial — work, product, settings, redirects — stale-while-revalidate', () => {
    expect(EDITORIAL_EXPIRY).toBe('max')
    for (const tag of [
      workTag('IG-1'),
      productTag(1706),
      settingsTag('shop'),
      redirectsTag('gallery'),
    ]) {
      expect(tagExpiry(tag), tag).toBe('max')
    }
  })

  it('stock and price — gone at once, { expire: 0 }', () => {
    expect(IMMEDIATE_EXPIRY).toEqual({ expire: 0 })
    expect(Object.isFrozen(IMMEDIATE_EXPIRY)).toBe(true)
    expect(tagExpiry(productStockTag(1706))).toEqual({ expire: 0 })
    expect(tagExpiry(productPriceTag(1706))).toEqual({ expire: 0 })
  })

  it('the kinds known today, each named by its collection', () => {
    expect(Object.keys(TAG_KINDS).sort()).toEqual([
      'product',
      'product-price',
      'product-stock',
      'redirects',
      'settings',
      'work',
    ])
    expect(tagKind(productStockTag(1))).toBe('product-stock')
    expect(tagKind(settingsTag('gallery'))).toBe('settings')
  })

  it('a kind is read from the tag, never from a caller: a forged tag has none', () => {
    expect(() => tagExpiry('product-stock:1 max' as never)).toThrow(/not a cache tag/)
  })
})
