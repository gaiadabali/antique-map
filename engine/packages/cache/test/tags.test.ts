/**
 * Each builder's grammar and profile (TASKS.md 4.8.c, 4.8.d): what it makes, what it refuses,
 * that `parseCacheTag()` — the revalidate route's check — accepts exactly what the builders make,
 * and that a tag's expiry is its kind's.
 */
import { describe, expect, it } from 'vitest'

import {
  availabilityTag,
  EDITORIAL_EXPIRY,
  IMMEDIATE_EXPIRY,
  itemTag,
  MAX_TAG_LENGTH,
  parseCacheTag,
  priceTag,
  requireCacheTag,
  TAG_KINDS,
  tagExpiry,
  tagKind,
  workTag,
} from '../src/index'

const byPublicId = [
  ['item', itemTag],
  ['availability', availabilityTag],
  ['price', priceTag],
] as const

describe('the publicId builders: item, availability, price', () => {
  it.each(byPublicId)('%s:<publicId> for every non-negative safe integer', (kind, build) => {
    for (const id of [0, 1, 1706, 2_000_000, Number.MAX_SAFE_INTEGER]) {
      expect(build(id)).toBe(`${kind}:${id}`)
      expect(parseCacheTag(`${kind}:${id}`)).toBe(`${kind}:${id}`)
    }
    expect(build(-0)).toBe(`${kind}:0`)
  })

  it.each(byPublicId)('%s refuses anything that is not a publicId', (kind, build) => {
    for (const id of [-1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, 1e21]) {
      expect(() => build(id), String(id)).toThrow(new RegExp(`^${kind} tag: .* is not a publicId`))
    }
  })
})

describe('work:<workUid>', () => {
  it('takes a workUid: the C1 prefix, a hyphen, digits', () => {
    for (const uid of ['FX-000123', 'ABC-1', 'A1-0', 'ABCDEFGH-1234567890123456', 'X9-42']) {
      expect(workTag(uid)).toBe(`work:${uid}`)
      expect(parseCacheTag(`work:${uid}`)).toBe(`work:${uid}`)
    }
  })

  it('refuses anything else', () => {
    for (const uid of [
      '',
      'FX',
      'FX-',
      '-000123',
      'fx-000123', // lower case
      'I-000123', // a one-character prefix
      'ABCDEFGHI-1', // nine
      '1X-000123', // a digit first
      'FX-12a',
      'FX_000123',
      'FX-000123 ',
      ' FX-000123',
      'FX-000123\n',
      'FX-00012345678901234', // seventeen digits
      'FX-000123:item:1',
      'FX-１２３', // full-width digits
    ]) {
      expect(() => workTag(uid), JSON.stringify(uid)).toThrow(/^work tag: .* is not a workUid/)
      expect(parseCacheTag(`work:${uid}`), JSON.stringify(uid)).toBeNull()
    }
  })
})

describe('parseCacheTag(): the grammar the revalidate route checks', () => {
  it('accepts no second spelling of a tag', () => {
    for (const value of [
      'item:01', // a leading zero
      'item:+1',
      'item:-1',
      'item:1.0',
      'item:1e3',
      'item:0x10',
      'item: 1',
      'item:1 ',
      'item:',
      'ITEM:1',
      'Item:1',
      'item::1',
      'item:1:2',
      'item:9007199254740992', // past the largest safe integer
      'item:99999999999999999',
      'availability:١٢', // Arabic-Indic digits
    ]) {
      expect(parseCacheTag(value), value).toBeNull()
    }
  })

  it('accepts no kind it has no builder for', () => {
    for (const value of [
      'maker:1',
      'constructor:1',
      'toString:1',
      '__proto__:1',
      'hasOwnProperty:1',
      '_N_T_/en/item/1', // a Next implicit (path) tag
      '1',
      'item',
      '',
    ]) {
      expect(parseCacheTag(value), value).toBeNull()
    }
  })

  it('refuses a value that is not a string, and reads nothing past MAX_TAG_LENGTH', () => {
    for (const value of [undefined, null, 1, ['item:1'], { tag: 'item:1' }, Symbol('item:1')]) {
      expect(parseCacheTag(value)).toBeNull()
    }
    expect(parseCacheTag(`item:${'1'.repeat(MAX_TAG_LENGTH)}`)).toBeNull()
    expect(MAX_TAG_LENGTH).toBeLessThanOrEqual(256) // Next's own limit on a tag
    expect(`work:ABCDEFGH-${'9'.repeat(16)}`.length).toBeLessThanOrEqual(MAX_TAG_LENGTH)
  })

  it('requireCacheTag() throws naming what it was given', () => {
    expect(requireCacheTag('price:7')).toBe('price:7')
    expect(() => requireCacheTag('price:07')).toThrow(
      'not a cache tag @engine/cache makes: "price:07"',
    )
  })
})

describe('each kind has its expiry', () => {
  it('editorial — item, work — stale-while-revalidate', () => {
    expect(EDITORIAL_EXPIRY).toBe('max')
    expect(tagExpiry(itemTag(1706))).toBe('max')
    expect(tagExpiry(workTag('FX-000123'))).toBe('max')
  })

  it('availability and price — gone at once, { expire: 0 }', () => {
    expect(IMMEDIATE_EXPIRY).toEqual({ expire: 0 })
    expect(Object.isFrozen(IMMEDIATE_EXPIRY)).toBe(true)
    expect(tagExpiry(availabilityTag(1706))).toEqual({ expire: 0 })
    expect(tagExpiry(priceTag(1706))).toEqual({ expire: 0 })
  })

  it('the kinds known today, each named by its builder', () => {
    expect(Object.keys(TAG_KINDS).sort()).toEqual(['availability', 'item', 'price', 'work'])
    expect(tagKind(itemTag(1))).toBe('item')
    expect(tagKind(availabilityTag(1))).toBe('availability')
    expect(tagKind(priceTag(1))).toBe('price')
    expect(tagKind(workTag('FX-1'))).toBe('work')
  })

  it('a kind is read from the tag, never from a caller: a forged tag has none', () => {
    expect(() => tagExpiry('availability:1 max' as never)).toThrow(/not a cache tag/)
  })
})
