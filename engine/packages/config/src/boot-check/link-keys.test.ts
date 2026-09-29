import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { parseLinkTokenKeys } from './index'

const NOW = new Date('2026-09-29T12:00:00Z')
/** 32 bytes that look random (a hash of the seed), base64url: a well-formed secret. */
const bytesOf = (seed: number) => createHash('sha256').update(`link-key-${seed}`).digest()
const key = (seed: number) => bytesOf(seed).toString('base64url')
const encode = (bytes: number[] | Buffer) => Buffer.from(bytes).toString('base64url')
/** C6 `LINK_TOKEN_VECTORS.key.secret` — 32 × 0x0b — copied, since config imports no other package. */
const VECTORS_TEST_KEY = 'CwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCwsLCws'

const refused = (value: string | undefined) => {
  const result = parseLinkTokenKeys(value, NOW)
  expect(result.ok).toBe(false)
  return result.problems.join('\n')
}

describe('LINK_TOKEN_KEYS — a well-formed ring (C6 links)', () => {
  it('parses one current key, a retired one and a revoked one', () => {
    const result = parseLinkTokenKeys(`k3:${key(3)}, k2:${key(2)}:2026-06-01 ,k1:revoked`, NOW)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ring.current.kid).toBe('k3')
    expect(result.ring.current.secret).toHaveLength(32)
    expect(result.ring.keys.map((each) => `${each.kid}:${each.status}`)).toEqual([
      'k3:current',
      'k2:retired',
      'k1:revoked',
    ])
  })

  it('accepts padding and a key retired today', () => {
    expect(parseLinkTokenKeys(`a:${key(1)}=`, NOW).ok).toBe(true)
    expect(parseLinkTokenKeys(`b:${key(2)},a:${key(1)}:2026-09-29`, NOW).ok).toBe(true)
  })

  it('refuses a missing ring', () => {
    expect(refused(undefined)).toMatch(/is not set/)
    expect(refused('   ')).toMatch(/is not set/)
  })

  it('refuses a ring with no current key, or two', () => {
    expect(refused(`old:${key(1)}:2026-01-01`)).toMatch(/has no current key/)
    expect(refused('gone:revoked')).toMatch(/has no current key/)
    expect(refused(`a:${key(1)},b:${key(2)}`)).toMatch(/has 2 current keys \("a", "b"\)/)
  })

  it('refuses a repeated kid, and one secret under two kids', () => {
    expect(refused(`a:${key(1)},a:${key(2)}:2026-01-01`)).toMatch(
      /entry 2 \(kid "a"\): the kid is used twice/,
    )
    expect(refused(`a:${key(1)},b:${key(1)}:2026-01-01`)).toMatch(
      /the same secret appears under another kid/,
    )
  })

  it('refuses a short secret, and the test vectors’ key (one repeated byte)', () => {
    const short = Buffer.from(Array.from({ length: 31 }, (_, i) => i)).toString('base64url')
    expect(refused(`a:${short}`)).toMatch(
      /the secret is 31 bytes; it needs 32 random bytes or more/,
    )
    expect(refused(`test:${VECTORS_TEST_KEY}`)).toMatch(/one byte repeated — a test key/)
    expect(refused(`a:${Buffer.alloc(48, 0).toString('base64url')}`)).toMatch(/one byte repeated/)
  })

  it('refuses a retirement day in the future, or no date at all', () => {
    expect(refused(`b:${key(2)},a:${key(1)}:2026-09-30`)).toMatch(
      /retirement day 2026-09-30 is in the future \(today is 2026-09-29 UTC\)/,
    )
    expect(refused(`b:${key(2)},a:${key(1)}:2026-02-30`)).toMatch(/is not a calendar date/)
  })

  it('refuses malformed entries without echoing a secret', () => {
    const secret = key(9)
    const text = refused(`A:${secret},b:${secret}+/,c,d:${secret}:2026-01-01:x,`)
    expect(text).toMatch(/entry 1: its kid is not 1–12 characters of a–z and 0–9/)
    expect(text).toMatch(/entry 2 \(kid "b"\): the secret is not base64url/)
    expect(text).toMatch(/entry 3 \(kid "c"\): not kid:secret/)
    expect(text).toMatch(/entry 4 \(kid "d"\): not kid:secret/)
    expect(text).toMatch(/entry 5 is empty/)
    expect(text).not.toContain(secret)
    expect(refused(`toolongkid1234:${secret}`)).toMatch(/its kid is not/)
  })

  it('refuses a pattern and a password dressed as a key', () => {
    const alternating = Buffer.from(
      Array.from({ length: 32 }, (_, i) => (i % 2 === 0 ? 0xaa : 0x55)),
    )
    expect(refused('a:' + alternating.toString('base64url'))).toMatch(
      /has 2 distinct byte values, fewer than 16/,
    )
    const password = Buffer.from('password'.repeat(4)).toString('base64url')
    expect(refused('a:' + password)).toMatch(/fewer than 16/)
    const phrase = Buffer.from('correct horse battery staple, 42!').toString('base64url')
    expect(refused('a:' + phrase)).toMatch(/decodes to printable text/)
  })

  it('refuses a counter, a stride, a padded key and a block repeated (3.1 qa)', () => {
    const run = /bytes in a row stepping by one constant/
    // 0x00 … 0x1f: 32 distinct bytes, none printable — what the 3.1 rule let through.
    const counter = Array.from({ length: 32 }, (_, i) => i)
    expect(refused('a:' + encode(counter))).toMatch(/has 32 bytes in a row stepping/)
    expect(refused('a:' + encode([...counter].reverse()))).toMatch(run)
    expect(refused('a:' + encode(counter.map((i) => (i * 7 + 3) % 256)))).toMatch(run)
    // A counter running into a random tail, and a short random key padded out with zeros.
    expect(refused('a:' + encode([...counter.slice(0, 8), ...bytesOf(1).subarray(8)]))).toMatch(
      /has 8 bytes in a row/,
    )
    expect(refused('a:' + encode([...bytesOf(2).subarray(0, 20), ...Array(12).fill(0)]))).toMatch(
      /has 12 bytes in a row/,
    )
    // A 20-byte key written twice to pass the 32-byte floor.
    const half = bytesOf(3).subarray(0, 20)
    expect(refused('a:' + encode([...half, ...half]))).toMatch(/is a 20-byte block repeated/)
  })

  it('accepts random bytes, whose runs are short', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(parseLinkTokenKeys(`a:${key(seed)}`, NOW).problems, `seed ${seed}`).toEqual([])
    }
    // Seven bytes stepping by one constant is below the line.
    const seven = [...Array.from({ length: 7 }, (_, i) => i * 3), ...bytesOf(4).subarray(7)]
    expect(parseLinkTokenKeys('a:' + encode(seven), NOW).ok).toBe(true)
  })

  it('warns, and only warns, of a retired key past the overlap', () => {
    const result = parseLinkTokenKeys('b:' + key(2) + ',a:' + key(1) + ':2025-08-01', NOW)
    expect(result.ok).toBe(true)
    expect(result.warnings).toEqual([
      expect.stringMatching(/entry 2 \(kid "a"\): retired 424 days ago, past the 400-day overlap/),
    ])
    expect(
      parseLinkTokenKeys('b:' + key(2) + ',a:' + key(1) + ':2026-01-01', NOW).warnings,
    ).toEqual([])
  })
})
