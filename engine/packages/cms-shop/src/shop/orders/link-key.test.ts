import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  createOrderLinkKey,
  ORDER_LINK_KEY_ENV,
  openToken,
  orderLinkKeyFromEnv,
  sealToken,
} from './link-key'

const secret = (seed: string) => createHash('sha256').update(seed).digest().toString('base64url')
const KEY_A = createOrderLinkKey(secret('order-link-key-a'))
const KEY_B = createOrderLinkKey(secret('order-link-key-b'))

describe('sealToken / openToken', () => {
  it('round-trips a token', () => {
    const sealed = sealToken('the-tracking-token', KEY_A)
    expect(openToken(sealed, KEY_A)).toBe('the-tracking-token')
  })

  it('opens to null under the wrong key', () => {
    const sealed = sealToken('the-tracking-token', KEY_A)
    expect(openToken(sealed, KEY_B)).toBeNull()
  })

  it('opens to null when tampered', () => {
    const sealed = sealToken('the-tracking-token', KEY_A)
    const parts = sealed.split('.')
    // Flip the ciphertext's last character so the authentication tag no longer matches.
    const ciphertext = parts[2]!
    const flipped = ciphertext.slice(0, -1) + (ciphertext.at(-1) === 'A' ? 'B' : 'A')
    const tampered = [parts[0], parts[1], flipped, parts[3]].join('.')
    expect(openToken(tampered, KEY_A)).toBeNull()
  })

  it('opens to null for malformed input', () => {
    expect(openToken('', KEY_A)).toBeNull()
    expect(openToken('garbage', KEY_A)).toBeNull()
    expect(openToken('v2.a.b.c', KEY_A)).toBeNull()
    expect(openToken('v1.a.b.c.d', KEY_A)).toBeNull()
  })

  it(`is read from ${ORDER_LINK_KEY_ENV} and must decode to at least 32 bytes`, () => {
    expect(() => orderLinkKeyFromEnv({})).toThrow(ORDER_LINK_KEY_ENV)
    expect(() => orderLinkKeyFromEnv({ [ORDER_LINK_KEY_ENV]: 'short' })).toThrow(ORDER_LINK_KEY_ENV)
    const fromEnv = orderLinkKeyFromEnv({ [ORDER_LINK_KEY_ENV]: secret('order-link-key-env') })
    const sealed = sealToken('x', fromEnv)
    expect(openToken(sealed, fromEnv)).toBe('x')
  })
})
