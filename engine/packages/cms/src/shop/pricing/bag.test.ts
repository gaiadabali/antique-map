/**
 * The bag cookie (TASKS.md 6.2.a, 6.2.d): ids and quantities only, signed, and never a throw — a
 * forged, tampered, oversize or malformed bag is the empty bag.
 */
import { describe, expect, it } from 'vitest'

import {
  BAG_COOKIE_KEY_ENV,
  MAX_BAG_LINES,
  bagCookieKeyFromEnv,
  createBagCookieKey,
  parseBag,
  parseBagLine,
  parseBagLines,
  serialiseBag,
} from './bag'
import { TEST_KEY_SECRET, line } from './pricing.test-support'

const key = createBagCookieKey(TEST_KEY_SECRET)
const otherKey = createBagCookieKey(`${TEST_KEY_SECRET}-other`)

/** Re-encodes a cookie's payload as an attacker would, keeping the original signature. */
function withPayload(cookie: string, payload: unknown): string {
  const [version, , signature] = cookie.split('.')
  return `${version}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${signature}`
}

describe('the bag cookie round trip', () => {
  it('reads back exactly the lines it wrote', () => {
    const bag = [line(1, 2), line(2, 1, 'PRINT-A3'), line(5, 10)]
    expect(parseBag(serialiseBag(bag, key), key)).toEqual(bag)
  })

  it('holds no price: the value decodes to ids and quantities only', () => {
    const cookie = serialiseBag([line(2, 3, 'PRINT-A2')], key)
    const payload = cookie.split('.')[1] as string
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))).toEqual([
      { productId: 2, variantSku: 'PRINT-A2', qty: 3 },
    ])
  })

  it('writes an invalid bag as the empty bag rather than signing it', () => {
    expect(parseBag(serialiseBag([line(1, 11)], key), key)).toEqual([])
  })
})

describe('a forged or tampered cookie is ignored', () => {
  const cookie = serialiseBag([line(1, 1)], key)

  it('a raised quantity under the old signature reads as the empty bag', () => {
    expect(parseBag(withPayload(cookie, [{ productId: 1, qty: 9 }]), key)).toEqual([])
  })

  it('an added price under the old signature reads as the empty bag', () => {
    expect(parseBag(withPayload(cookie, [{ productId: 1, qty: 1, unitIdr: 1 }]), key)).toEqual([])
  })

  it('a bag signed with another key reads as the empty bag', () => {
    expect(parseBag(serialiseBag([line(1, 1)], otherKey), key)).toEqual([])
  })

  it('a truncated, missing, re-versioned or unsigned value reads as the empty bag', () => {
    for (const value of [
      cookie.slice(0, -1),
      cookie.split('.').slice(0, 2).join('.'),
      cookie.replace(/^v1\./, 'v2.'),
      `${cookie}.extra`,
      '',
      null,
      undefined,
    ]) {
      expect(parseBag(value, key)).toEqual([])
    }
  })

  it('an oversize value is refused unread', () => {
    expect(parseBag(`v1.${'A'.repeat(5000)}.sig`, key)).toEqual([])
  })

  it('never throws on any string', () => {
    let seed = 7
    const next = () => (seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648)
    for (let i = 0; i < 500; i++) {
      const chars = Array.from({ length: next() % 120 }, () =>
        String.fromCharCode(32 + (next() % 95)),
      )
      expect(() => parseBag(chars.join(''), key)).not.toThrow()
      expect(() => parseBag(`v1.${chars.join('')}.${chars.join('')}`, key)).not.toThrow()
    }
  })
})

describe('validating lines', () => {
  it('keeps productId, variantSku and qty and drops every other key', () => {
    expect(
      parseBagLine({
        productId: 1,
        variantSku: 'PRINT-A3',
        qty: 2,
        unitIdr: 1,
        price: 1,
        total: 1,
      }),
    ).toEqual({ productId: 1, variantSku: 'PRINT-A3', qty: 2 })
  })

  it('accepts a form’s canonical digit strings and an empty variant as none', () => {
    expect(parseBagLine({ productId: '12', variantSku: '', qty: '3' })).toEqual(line(12, 3))
  })

  it('refuses a quantity that is not a whole number from 1 to 10', () => {
    for (const qty of [
      0,
      -1,
      11,
      999,
      2.5,
      '2.0',
      '1e1',
      ' 2',
      Number.NaN,
      null,
      undefined,
      true,
    ]) {
      expect(parseBagLine({ productId: 1, qty })).toBeNull()
    }
  })

  it('refuses a bad product id or variant SKU', () => {
    for (const productId of [0, -3, 1.5, 'abc', null])
      expect(parseBagLine({ productId, qty: 1 })).toBeNull()
    for (const variantSku of [' A3', 'A3 ', 'A\u0000', 'X'.repeat(65), 42, {}]) {
      expect(parseBagLine({ productId: 1, variantSku, qty: 1 })).toBeNull()
    }
    for (const input of [null, [], 'line', 1]) expect(parseBagLine(input)).toBeNull()
  })

  it('takes up to 20 lines; 21, one bad line or a repeated line is the empty bag', () => {
    const twenty = Array.from({ length: MAX_BAG_LINES }, (_, i) => line(i + 1, 1))
    expect(parseBagLines(twenty)).toHaveLength(20)
    expect(parseBagLines([...twenty, line(99, 1)])).toEqual([])
    expect(parseBagLines([line(1, 1), line(2, 0)])).toEqual([])
    expect(parseBagLines([line(1, 1), line(1, 2)])).toEqual([])
    expect(parseBagLines([line(2, 1, 'PRINT-A3'), line(2, 1, 'PRINT-A2')])).toHaveLength(2)
    expect(parseBagLines({ 0: line(1, 1) })).toEqual([])
  })
})

describe('the signing key', () => {
  it(`is read from ${BAG_COOKIE_KEY_ENV} and must be at least 32 characters`, () => {
    expect(() => bagCookieKeyFromEnv({})).toThrow(BAG_COOKIE_KEY_ENV)
    expect(() => bagCookieKeyFromEnv({ [BAG_COOKIE_KEY_ENV]: 'short' })).toThrow(BAG_COOKIE_KEY_ENV)
    const fromEnv = bagCookieKeyFromEnv({ [BAG_COOKIE_KEY_ENV]: TEST_KEY_SECRET })
    expect(parseBag(serialiseBag([line(1, 1)], key), fromEnv)).toEqual([line(1, 1)])
  })
})
