/**
 * Midtrans's notification signature (COMMERCE.md §6; SECURITY.md W1):
 *
 *   signature_key = hex(SHA-512(order_id + status_code + gross_amount + server key))
 *
 * over the three fields **exactly as Midtrans sent them** — `gross_amount` is the string
 * `"205000.00"`, never a number re-formatted by us, or a valid notification would fail. Midtrans
 * documents the same formula for the HTTP notification and the status API's answer.
 *
 * The comparison is of two SHA-256 digests, 32 bytes against 32, in constant time — as the cron
 * bearer is compared (`@engine/http`'s `shared/bearer`) — so neither the expected signature's
 * prefix nor the given string's length leaks through timing.
 */
import { createHash, timingSafeEqual } from 'node:crypto'

/** The three signed fields of a notification or status answer, as sent. */
export type SignedFields = {
  readonly orderId: string
  readonly statusCode: string
  readonly grossAmount: string
}

/** The signature Midtrans computes for `fields` with `serverKey`, as lower-case hex. */
export function midtransSignature(fields: SignedFields, serverKey: string): string {
  return createHash('sha512')
    .update(fields.orderId + fields.statusCode + fields.grossAmount + serverKey, 'utf8')
    .digest('hex')
}

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest()

/** True when `signatureKey` is `fields`' signature under `serverKey`; constant time. */
export function isValidSignature(
  fields: SignedFields,
  signatureKey: string,
  serverKey: string,
): boolean {
  const expected = midtransSignature(fields, serverKey)
  return timingSafeEqual(digest(signatureKey.toLowerCase()), digest(expected))
}
