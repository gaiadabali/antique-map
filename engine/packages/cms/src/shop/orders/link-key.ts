/**
 * The order link's key at rest (TASKS.md 6.6; orchestrator decision A, TASKS.md Log 2026-10-06;
 * SECURITY.md tokens): `orders.trackingTokenEnc` holds the buyer's tracking token sealed under
 * `ORDER_LINK_KEY`, AES-256-GCM, so every email — the quote, the paid receipt, each later status —
 * reopens the same link; `orders.trackingTokenHash` stays the lookup (unchanged, SHA-256).
 *
 * The same shape as `../pricing/bag`'s `BagCookieKey`: a checked key, made once with
 * `createOrderLinkKey` or `orderLinkKeyFromEnv`, never read from the environment inside `sealToken`
 * or `openToken` themselves — a caller (the checkout, the quote move, the notifier) holds it and
 * passes it in, so a test builds one straight from a literal and never touches `process.env`.
 *
 * `ORDER_LINK_KEY` is one of the process's `ALWAYS` secrets (`@engine/config/boot-check`'s
 * `platform.ts`): missing or malformed, the boot check refuses to start.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export const ORDER_LINK_KEY_ENV = 'ORDER_LINK_KEY'
const MIN_KEY_BYTES = 32
const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
/** Binds a sealed value to this format; changing it refuses every token sealed under the last one. */
const VERSION = 'v1'

const KEY_BRAND: unique symbol = Symbol('OrderLinkKey')
/** A checked sealing key. Make one with `createOrderLinkKey` or `orderLinkKeyFromEnv`. */
export type OrderLinkKey = { readonly [KEY_BRAND]: true; readonly secret: Buffer }

function decodeBase64(secret: string): Buffer {
  // Accepts both standard and URL-safe base64: a key pasted from either generator reads the same.
  return Buffer.from(secret.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

export function createOrderLinkKey(secret: string): OrderLinkKey {
  const bytes = typeof secret === 'string' && secret !== '' ? decodeBase64(secret) : Buffer.alloc(0)
  if (bytes.length < MIN_KEY_BYTES) {
    throw new Error(
      `${ORDER_LINK_KEY_ENV} must be set to ${MIN_KEY_BYTES} random bytes or more, base64-encoded`,
    )
  }
  return { [KEY_BRAND]: true, secret: bytes.subarray(0, MIN_KEY_BYTES) }
}

export function orderLinkKeyFromEnv(
  env: Readonly<Record<string, string | undefined>> = process.env,
): OrderLinkKey {
  return createOrderLinkKey(env[ORDER_LINK_KEY_ENV] ?? '')
}

/** Seals `token` at rest: `v1.<iv>.<ciphertext>.<authTag>`, each part base64url. */
export function sealToken(token: string, key: OrderLinkKey): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key.secret, iv)
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
    tag.toString('base64url'),
  ].join('.')
}

/**
 * Opens a value `sealToken` made, or `null` for anything else: the wrong version, a key that does
 * not verify the authentication tag (a tampered value or the wrong key), or malformed input. Never
 * throws — a bad token reads exactly like a missing one to every caller.
 */
export function openToken(sealed: string, key: OrderLinkKey): string | null {
  if (typeof sealed !== 'string') return null
  const [version, ivPart, ciphertextPart, tagPart, ...rest] = sealed.split('.')
  if (version !== VERSION || !ivPart || !ciphertextPart || !tagPart || rest.length > 0) return null
  try {
    const iv = Buffer.from(ivPart, 'base64url')
    const ciphertext = Buffer.from(ciphertextPart, 'base64url')
    const tag = Buffer.from(tagPart, 'base64url')
    if (iv.length !== IV_BYTES) return null
    const decipher = createDecipheriv(ALGORITHM, key.secret, iv)
    decipher.setAuthTag(tag)
    const token = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return token.toString('utf8')
  } catch {
    return null
  }
}
