/**
 * The Midtrans Snap adapter (TASKS.md 6.4.a; COMMERCE.md §6): QRIS, virtual accounts and cards
 * with 3-D Secure, as one Snap transaction per attempt; and the status API that confirms them.
 *
 * Written against Midtrans's documented API (assumptions, to check against the owner's sandbox
 * account when it exists — OA7):
 * - `POST {snap}/snap/v1/transactions`, HTTP Basic with the server key as the user and an empty
 *   password; answers 201 `{ token, redirect_url }`.
 * - `GET {api}/v2/{order_id}/status`, the same auth; answers the transaction as a notification
 *   carries it (`status_code`, `transaction_status`, `gross_amount`, `signature_key`, …), or
 *   `status_code: "404"` while the buyer has not chosen a method yet.
 * - `expiry: { start_time: "yyyy-MM-dd HH:mm:ss Z", unit: "minute", duration }`: whole minutes,
 *   rounded down, so the attempt stops taking money no later than the order's `expiresAt`.
 * - `enabled_payments` codes: `other_qris`, the bank VAs (`bca_va`, `bni_va`, `bri_va`,
 *   `permata_va`, `echannel` for Mandiri, `other_va`) and `credit_card`.
 *
 * A status answer carrying a `signature_key` is verified like a notification: an answer that is
 * not Midtrans's is a defect, never a payment. Requests time out after 10 seconds; a failure
 * throws, so the webhook answers 500 and Midtrans retries.
 */
import { MIDTRANS_HOSTS, type PaymentsConfig } from './config'
import { parseBody, parseStatus } from './notification'
import type { CreatedPayment, PaymentProvider, PaymentRequest, StatusAnswer } from './provider'
import { isValidSignature } from './signature'

export const SNAP_PAYMENT_METHODS = [
  'other_qris',
  'bca_va',
  'bni_va',
  'bri_va',
  'permata_va',
  'echannel',
  'other_va',
  'credit_card',
] as const

export const MIDTRANS_TIMEOUT_MS = 10_000

export type Fetch = (input: string, init: RequestInit) => Promise<Response>

const pad = (n: number) => String(n).padStart(2, '0')

/** `2026-10-03 04:05:06 +0000`: Midtrans's expiry start time, in UTC. */
export function midtransTime(date: Date): string {
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} +0000`
  )
}

/** Whole minutes from `now` to `expiresAt`, rounded down; below one, the window is closed. */
export function minutesLeft(now: Date, expiresAt: Date): number {
  return Math.floor((expiresAt.getTime() - now.getTime()) / 60_000)
}

/** The Snap request body for an attempt (exported for the adapter's tests). */
export function snapBody(request: PaymentRequest): Record<string, unknown> {
  const duration = minutesLeft(request.now, request.expiresAt)
  if (duration < 1) throw new RangeError('payments: less than a minute of the window is left')
  return {
    transaction_details: { order_id: request.midtransOrderId, gross_amount: request.grossAmount },
    item_details: request.items.map((item) => ({ ...item })),
    customer_details: {
      first_name: request.customer.name,
      email: request.customer.email,
      phone: request.customer.phone,
    },
    enabled_payments: [...SNAP_PAYMENT_METHODS],
    credit_card: { secure: true },
    expiry: { start_time: midtransTime(request.now), unit: 'minute', duration },
    ...(request.finishUrl ? { callbacks: { finish: request.finishUrl } } : {}),
  }
}

export function snapProvider(config: PaymentsConfig, fetchImpl: Fetch = fetch): PaymentProvider {
  if (config.mode === 'simulate') throw new Error('payments: Snap needs sandbox or production keys')
  const hosts = MIDTRANS_HOSTS[config.mode]
  const authorization = `Basic ${Buffer.from(`${config.serverKey}:`).toString('base64')}`
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: authorization,
  }

  return {
    mode: config.mode,

    async createPayment(request): Promise<CreatedPayment> {
      const response = await fetchImpl(`${hosts.snap}/snap/v1/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(snapBody(request)),
        signal: AbortSignal.timeout(MIDTRANS_TIMEOUT_MS),
      })
      const body = parseBody(await response.text())
      const token = body?.token
      const redirectUrl = body?.redirect_url
      if (response.status !== 201 || typeof token !== 'string' || typeof redirectUrl !== 'string') {
        // Midtrans's error_messages say what it refused; they hold no secret and no card data.
        const messages = Array.isArray(body?.error_messages) ? body.error_messages.join('; ') : ''
        throw new Error(
          `payments: Snap refused ${request.midtransOrderId} (${response.status}) ${messages}`,
        )
      }
      return { token, redirectUrl }
    },

    async getStatus(midtransOrderId): Promise<StatusAnswer> {
      const response = await fetchImpl(
        `${hosts.api}/v2/${encodeURIComponent(midtransOrderId)}/status`,
        { method: 'GET', headers, signal: AbortSignal.timeout(MIDTRANS_TIMEOUT_MS) },
      )
      const raw = await response.text()
      const body = parseBody(raw)
      if (response.status === 404 || body?.status_code === '404') return { found: false }
      if (!response.ok || !body) {
        throw new Error(
          `payments: the status API answered ${response.status} for ${midtransOrderId}`,
        )
      }
      const status = parseStatus(body)
      if (!status || status.midtransOrderId !== midtransOrderId) {
        throw new Error(`payments: the status API's answer for ${midtransOrderId} is malformed`)
      }
      const signature = body.signature_key
      if (
        typeof signature === 'string' &&
        !isValidSignature(
          {
            orderId: status.midtransOrderId,
            statusCode: status.statusCode,
            grossAmount: status.grossAmountText,
          },
          signature,
          config.serverKey,
        )
      ) {
        throw new Error(
          `payments: the status API's answer for ${midtransOrderId} is not signed by Midtrans`,
        )
      }
      return { found: true, status, raw }
    },

    redirectUrlFor(token) {
      return `${hosts.snap}/snap/v4/redirection/${encodeURIComponent(token)}`
    },
  }
}
