/**
 * What a Midtrans notification or status answer says, read defensively (COMMERCE.md §6, §8).
 *
 * The webhook reads its raw body once, takes **only** the three signed fields and the signature
 * out of it (`readSignedFields`), and verifies them before anything else of the body is looked at;
 * `parseStatus` runs on a verified body or on the status API's answer. Every value is a bounded
 * string of an expected shape, so nothing unexpected reaches a column, a log or a decision.
 *
 * - **Attempts.** Midtrans refuses a reused `order_id`, so each Snap transaction of an order is
 *   an attempt with `order_id` = `{order number}-{attempt}` (`attemptOrderId`, no prefix: Open).
 * - **Money.** `gross_amount` arrives as `"205000.00"`; rupiah have no minor unit below one, so
 *   any fraction other than `.00` cannot be an order total and reads as `null` — a mismatch.
 * - **Dedupe key** (COMMERCE.md §6; SECURITY.md W3): SHA-256 of `order_id | transaction_id |
 *   transaction_status | fraud_status | status_code`. Midtrans sends no event id; these five name
 *   one state of one transaction, so a redelivery repeats the key and a new state (pending, then
 *   settlement) makes a new one.
 */
import { createHash } from 'node:crypto'

import type { SignedFields } from './signature'

export type MidtransStatus = {
  /** The attempt's id at Midtrans: `{order number}-{attempt}`. */
  readonly midtransOrderId: string
  readonly statusCode: string
  /** `gross_amount` as sent — the signed text. */
  readonly grossAmountText: string
  /** The same in whole rupiah, or null when it is not a whole-rupiah amount. */
  readonly grossAmount: number | null
  readonly transactionStatus: string
  readonly fraudStatus: string | null
  readonly transactionId: string | null
  readonly paymentType: string | null
}

const MAX_BODY_FIELDS = 200
const ORDER_ID = /^[A-Za-z0-9._~-]{1,50}$/
const STATUS_CODE = /^\d{3}$/
const WORD = /^[a-z][a-z_]{0,39}$/
const TRANSACTION_ID = /^[A-Za-z0-9._:-]{1,64}$/
const AMOUNT = /^(\d{1,15})(?:\.(\d{1,2}))?$/

type Body = Record<string, unknown>

/** The body as an object, or null when it is not a JSON object of a sane size. */
export function parseBody(raw: string): Body | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return Object.keys(value).length <= MAX_BODY_FIELDS ? (value as Body) : null
}

const text = (body: Body, key: string, shape: RegExp): string | null => {
  const value = body[key]
  return typeof value === 'string' && shape.test(value) ? value : null
}

export type SignedRead =
  | {
      readonly ok: true
      readonly body: Body
      readonly fields: SignedFields
      readonly signatureKey: string
    }
  | { readonly ok: false; readonly reason: 'malformed' | 'unsigned' }

/** The signed fields and the signature, and nothing else; the rest waits for verification. */
export function readSignedFields(raw: string): SignedRead {
  const body = parseBody(raw)
  if (!body) return { ok: false, reason: 'malformed' }
  const orderId = text(body, 'order_id', ORDER_ID)
  const statusCode = text(body, 'status_code', STATUS_CODE)
  const grossAmount = text(body, 'gross_amount', AMOUNT)
  const signatureKey = text(body, 'signature_key', /^[0-9a-fA-F]{128}$/)
  if (!orderId || !statusCode || !grossAmount || !signatureKey) {
    return { ok: false, reason: 'unsigned' }
  }
  return { ok: true, body, fields: { orderId, statusCode, grossAmount }, signatureKey }
}

/** `"205000.00"` or `"205000"` → 205000; any other fraction, or too large → null. */
export function parseGrossAmount(value: string): number | null {
  const match = AMOUNT.exec(value)
  if (!match) return null
  if (match[2] !== undefined && Number(match[2]) !== 0) return null
  const amount = Number(match[1])
  return Number.isSafeInteger(amount) ? amount : null
}

/** A status from a verified notification or the status API, or null when it is malformed. */
export function parseStatus(body: Body): MidtransStatus | null {
  const midtransOrderId = text(body, 'order_id', ORDER_ID)
  const statusCode = text(body, 'status_code', STATUS_CODE)
  const grossAmountText = text(body, 'gross_amount', AMOUNT)
  const transactionStatus = text(body, 'transaction_status', WORD)
  if (!midtransOrderId || !statusCode || !grossAmountText || !transactionStatus) return null
  const optional = (key: string, shape: RegExp) => {
    if (body[key] === undefined || body[key] === null || body[key] === '') return null
    return text(body, key, shape) ?? undefined
  }
  const fraudStatus = optional('fraud_status', WORD)
  const transactionId = optional('transaction_id', TRANSACTION_ID)
  const paymentType = optional('payment_type', WORD)
  if (fraudStatus === undefined || transactionId === undefined || paymentType === undefined) {
    return null
  }
  return {
    midtransOrderId,
    statusCode,
    grossAmountText,
    grossAmount: parseGrossAmount(grossAmountText),
    transactionStatus,
    fraudStatus,
    transactionId,
    paymentType,
  }
}

/** The Midtrans `order_id` of an order's `attempt`-th Snap transaction. */
export function attemptOrderId(orderNumber: number, attempt: number): string {
  if (!Number.isSafeInteger(orderNumber) || orderNumber < 1) throw new RangeError('order number')
  if (!Number.isSafeInteger(attempt) || attempt < 1) throw new RangeError('attempt')
  return `${orderNumber}-${attempt}`
}

/** The order number and attempt a Midtrans `order_id` names, or null for one we never made. */
export function parseAttemptOrderId(
  midtransOrderId: string,
): { readonly orderNumber: number; readonly attempt: number } | null {
  const match = /^([1-9]\d{0,14})-([1-9]\d{0,3})$/.exec(midtransOrderId)
  if (!match) return null
  return { orderNumber: Number(match[1]), attempt: Number(match[2]) }
}

export const sha256Hex = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')

/** The idempotency key of one state of one transaction (64 hex characters). */
export function dedupeKeyOf(status: MidtransStatus): string {
  return sha256Hex(
    [
      'midtrans',
      status.midtransOrderId,
      status.transactionId ?? '',
      status.transactionStatus,
      status.fraudStatus ?? '',
      status.statusCode,
    ].join('|'),
  )
}
