/**
 * A partner's sign-in password, kept only as a salted scrypt hash (the partner sign-in, 2026-10-20).
 * Partners are not Payload users: they never reach the admin, and their session is the shop's own
 * signed cookie (`apps/web/src/server/shop/partners`). The hash is self-describing
 * (`scrypt$N$r$p$salt$key`, base64url), so its cost can rise later without breaking old ones.
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'

const N = 16384
const R = 8
const P = 1
const KEY_LENGTH = 32
const SALT_LENGTH = 16

function scrypt(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      KEY_LENGTH,
      { N: n, r, p, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    )
  })
}

/** A new hash of `password` with a fresh salt. */
export async function hashPartnerPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const key = await scrypt(password.normalize('NFKC'), salt, N, R, P)
  return ['scrypt', N, R, P, salt.toString('base64url'), key.toString('base64url')].join('$')
}

/** A hash no password matches, for an unknown address: the same work, so timing says nothing. */
export const UNMATCHABLE_HASH = `scrypt$${N}$${R}$${P}$${Buffer.alloc(SALT_LENGTH).toString('base64url')}$${Buffer.alloc(KEY_LENGTH).toString('base64url')}`

/** Whether `password` matches `stored`; a malformed hash matches nothing. Constant-time compare. */
export async function verifyPartnerPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [n, r, p] = parts.slice(1, 4).map(Number)
  if (!n || !r || !p || n > 1 << 20 || r > 32 || p > 16) return false
  const salt = Buffer.from(parts[4]!, 'base64url')
  const expected = Buffer.from(parts[5]!, 'base64url')
  if (expected.length !== KEY_LENGTH) return false
  const actual = await scrypt(password.normalize('NFKC'), salt, n, r, p)
  return timingSafeEqual(actual, expected)
}
