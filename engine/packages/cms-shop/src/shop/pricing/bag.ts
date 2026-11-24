/**
 * The bag (TASKS.md 6.2.a; COMMERCE.md §3): a guest cart in a first-party cookie, `cart`, holding
 * only `{ productId, variantSku, qty }` per line — never a price, a fee, a discount or a total. The
 * server reads it, prices it from the database (`quote.ts`) and renders it.
 *
 * The value is signed with HMAC-SHA256 under `BAG_COOKIE_KEY`, so a bag the server did not write is
 * ignored. Nothing here throws to its caller on visitor input: a missing, malformed, oversize, forged
 * or out-of-range bag reads as the empty bag. Only a missing or short key throws — that is a
 * deployment defect, caught by the first request (a boot-check line is a proposed follow-up).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

/** One bag line. `productId` is the product's Payload id (a serial integer on Postgres). */
export type BagLine = {
  readonly productId: number
  /** The variant's SKU, or `null` for a product without variants. */
  readonly variantSku: string | null
  /** 1 to `MAX_LINE_QTY`, a whole number. */
  readonly qty: number
}

/** The cookie's name (COMMERCE.md §3). */
export const BAG_COOKIE_NAME = 'cart'
/** The environment variable holding the signing secret: at least 32 characters, host-only. */
export const BAG_COOKIE_KEY_ENV = 'BAG_COOKIE_KEY'
/** COMMERCE.md §3's defaults: at most 20 lines, at most 10 of one line. */
export const MAX_BAG_LINES = 20
export const MAX_LINE_QTY = 10
/** A cookie value longer than this is refused unread (browsers cap a cookie near 4096 bytes). */
export const MAX_BAG_COOKIE_LENGTH = 4000
const MIN_KEY_LENGTH = 32
const MAX_SKU_LENGTH = 64
const VERSION = 'v1'
/** Binds the signature to this cookie and format, so no other HMAC under the key verifies here. */
const SIGNING_CONTEXT = `${BAG_COOKIE_NAME}.${VERSION}.`

/**
 * The attributes the bag page sets the cookie with. `httpOnly`: the browser never needs to read it,
 * since every bag view is server-rendered. `secure` is the caller's (`NODE_ENV === 'production'`).
 */
export const BAG_COOKIE_ATTRIBUTES = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
} as const

const KEY_BRAND: unique symbol = Symbol('BagCookieKey')
/** A checked signing key. Make one with `createBagCookieKey` or `bagCookieKeyFromEnv`. */
export type BagCookieKey = { readonly [KEY_BRAND]: true; readonly secret: Buffer }

export function createBagCookieKey(secret: string): BagCookieKey {
  if (typeof secret !== 'string' || secret.length < MIN_KEY_LENGTH) {
    throw new Error(
      `${BAG_COOKIE_KEY_ENV} must be set to a secret of at least ${MIN_KEY_LENGTH} characters`,
    )
  }
  return { [KEY_BRAND]: true, secret: Buffer.from(secret, 'utf8') }
}

export function bagCookieKeyFromEnv(
  env: Readonly<Record<string, string | undefined>> = process.env,
): BagCookieKey {
  return createBagCookieKey(env[BAG_COOKIE_KEY_ENV] ?? '')
}

const DIGITS = /^[0-9]{1,16}$/
// eslint-disable-next-line no-control-regex -- refusing control characters is the point
const CONTROL = /[\u0000-\u001f\u007f]/

/**
 * A whole number from a JSON number or a form's canonical digit string ("2", never "2.0", "1e1" or
 * " 2"); anything else is `null`.
 */
function wholeNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isSafeInteger(value) ? value : null
  if (typeof value === 'string' && DIGITS.test(value)) {
    const n = Number(value)
    return Number.isSafeInteger(n) ? n : null
  }
  return null
}

function variantSkuOf(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return undefined
  if (value.length > MAX_SKU_LENGTH || value.trim() !== value || CONTROL.test(value))
    return undefined
  return value
}

/**
 * One line from untrusted input — a cookie's JSON or a form post. Keeps `productId`, `variantSku` and
 * `qty` and drops every other key, so a `price`, `unitIdr` or `total` beside them is never read.
 * `null` when a kept field is missing or out of range.
 */
export function parseBagLine(input: unknown): BagLine | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const raw = input as Record<string, unknown>
  const productId = wholeNumber(raw.productId)
  const qty = wholeNumber(raw.qty)
  const variantSku = variantSkuOf(raw.variantSku)
  if (productId === null || productId < 1) return null
  if (qty === null || qty < 1 || qty > MAX_LINE_QTY) return null
  if (variantSku === undefined) return null
  return { productId, variantSku, qty }
}

/** The key a line is unique by: one line per product and variant. */
export function bagLineKey(line: Pick<BagLine, 'productId' | 'variantSku'>): string {
  return `${line.productId}\u0000${line.variantSku ?? ''}`
}

/**
 * A whole bag from untrusted input. All or nothing: more than `MAX_BAG_LINES` lines, any bad line or
 * a repeated product-and-variant means the input was not written by the bag's own code, so the
 * result is the empty bag rather than a guess at what was meant.
 */
export function parseBagLines(input: unknown): BagLine[] {
  if (!Array.isArray(input) || input.length > MAX_BAG_LINES) return []
  const seen = new Set<string>()
  const lines: BagLine[] = []
  for (const item of input) {
    const line = parseBagLine(item)
    if (line === null) return []
    const key = bagLineKey(line)
    if (seen.has(key)) return []
    seen.add(key)
    lines.push(line)
  }
  return lines
}

function sign(payload: string, key: BagCookieKey): string {
  return createHmac('sha256', key.secret)
    .update(SIGNING_CONTEXT + payload)
    .digest('base64url')
}

/**
 * The cookie value for `lines`: `v1.<base64url JSON>.<base64url HMAC>`. The lines are re-validated
 * first, so a bad bag is written as the empty bag rather than signed.
 */
export function serialiseBag(lines: readonly BagLine[], key: BagCookieKey): string {
  const clean = parseBagLines(lines).map((line) =>
    line.variantSku === null
      ? { productId: line.productId, qty: line.qty }
      : { productId: line.productId, variantSku: line.variantSku, qty: line.qty },
  )
  const payload = Buffer.from(JSON.stringify(clean), 'utf8').toString('base64url')
  return `${VERSION}.${payload}.${sign(payload, key)}`
}

/**
 * The bag in a cookie value. Never throws: an absent, oversize, malformed or forged value — or one
 * whose signature does not match under `key` — is the empty bag.
 */
export function parseBag(cookieValue: string | null | undefined, key: BagCookieKey): BagLine[] {
  if (typeof cookieValue !== 'string' || cookieValue.length > MAX_BAG_COOKIE_LENGTH) return []
  const [version, payload, signature, ...rest] = cookieValue.split('.')
  if (version !== VERSION || !payload || !signature || rest.length > 0) return []
  const expected = Buffer.from(sign(payload, key), 'utf8')
  const given = Buffer.from(signature, 'utf8')
  // Constant time, so the signature cannot be found a byte at a time by timing the response.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return []
  try {
    return parseBagLines(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')))
  } catch {
    return []
  }
}
