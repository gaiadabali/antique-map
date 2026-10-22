/**
 * The applied welcome code, kept between bag views (TASKS.md 6.2; COMMERCE.md §3): a first-party
 * cookie, `cart_code`, holding only the normalised code — no kind, no value, no discount amount.
 * The server validates it against `discounts` on every read (`checkWelcomeCode`), so a stale or
 * forged cookie prices as no code at all.
 *
 * Signed with the same `BAG_COOKIE_KEY` HMAC as the bag itself (`./bag.ts` in `@engine/cms`),
 * under this cookie's own context. Never throws on visitor input: anything malformed reads as
 * no code.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

import { normaliseDiscountCode, type BagCookieKey } from '@engine/cms/shop/pricing'

/** The cookie's name. Its attributes are the bag's (`BAG_COOKIE_ATTRIBUTES`). */
export const CODE_COOKIE_NAME = 'cart_code'
const VERSION = 'v1'
const SIGNING_CONTEXT = `${CODE_COOKIE_NAME}.${VERSION}.`
/** A stored code is a normalised code; the pattern bounds it to 32 characters. */
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,31}$/

function sign(payload: string, key: BagCookieKey): string {
  return createHmac('sha256', key.secret)
    .update(SIGNING_CONTEXT + payload)
    .digest('base64url')
}

/** The cookie value for a normalised code; `null` clears it. */
export function serialiseCodeCookie(code: string | null, key: BagCookieKey): string | null {
  if (code === null) return null
  const clean = normaliseDiscountCode(code)
  if (clean === null) return null
  const payload = Buffer.from(clean, 'utf8').toString('base64url')
  return `${VERSION}.${payload}.${sign(payload, key)}`
}

/** The code a cookie value holds, or `null` when absent, malformed or forged. */
export function parseCodeCookie(
  value: string | null | undefined,
  key: BagCookieKey,
): string | null {
  if (typeof value !== 'string' || value.length > 200) return null
  const [version, payload, signature, ...rest] = value.split('.')
  if (version !== VERSION || !payload || !signature || rest.length > 0) return null
  const expected = Buffer.from(sign(payload, key), 'utf8')
  const given = Buffer.from(signature, 'utf8')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const code = Buffer.from(payload, 'base64url').toString('utf8')
    return CODE_PATTERN.test(code) ? code : null
  } catch {
    return null
  }
}
