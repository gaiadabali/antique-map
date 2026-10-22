/**
 * `POST /api/x/webhooks/midtrans` — the Midtrans notification (COMMERCE.md §6; SECURITY.md
 * §2.4 W1–W5; TASKS.md 6.4.b), as a `Request → Response` handler the app mounts.
 *
 * In order, and nothing out of it:
 * 1. **The config** is read at call time; a refused one (simulate mode in production, a missing
 *    or wrong-environment key) answers 503 and touches nothing.
 * 2. **The raw body**, read once and bounded (`MAX_BODY_BYTES`, else 413).
 * 3. **The signature**, before anything else of the body is looked at: only `order_id`,
 *    `status_code`, `gross_amount` and `signature_key` are taken out of the JSON to verify, in
 *    constant time, against the server key (the simulator's in simulate mode). Unparseable → 400;
 *    unsigned or wrong → 401, logged as an alert with the body's SHA-256, **nothing written**.
 * 4. **Confirm** with the status API (SECURITY.md W2): the answer, not the notification, is what is
 *    applied. Unknown to Midtrans, or a different `order_id` → 500 (Midtrans retries; nothing written).
 * 5. **Apply** in one transaction (`../apply`) — a replay is a 200 with no change. A delivery that
 *    loses the order's lock (TASKS.md 10.5.a) is a 200 when its event is already recorded, else a
 *    503 with `Retry-After`: lock contention is never a 500.
 *
 * Any other failure after verification answers a plain 500 with the cause in the log, so Midtrans
 * retries. Logs carry the body's hash and the attempt id, never the body (W5). The Payload-backed
 * part (`./payload-port`) is loaded with `import()` only once a request has passed verification,
 * so `next build` and the handler's unit tests never evaluate the Payload config.
 */
import { describeError } from '@engine/config/boot-check'

import { isLockContention } from '../contention'

import type { ApplyResult } from '../apply'
import { paymentsConfigFromEnv, type PaymentsConfig } from '../config'
import { parseStatus, readSignedFields, sha256Hex, type MidtransStatus } from '../notification'
import type { StatusAnswer } from '../provider'
import { isValidSignature } from '../signature'
import { plain, readBounded, type Env } from './respond'

/** Midtrans notifications are a few hundred bytes; anything near this is not one. */
export const MAX_BODY_BYTES = 16 * 1024

/** Seconds a delivery that lost the order's lock is asked to wait before it retries. */
export const BUSY_RETRY_AFTER_SECONDS = 5

const busy = () =>
  plain(503, 'the order is busy; retry later', {
    'Retry-After': String(BUSY_RETRY_AFTER_SECONDS),
  })

export type WebhookPort = {
  confirm(midtransOrderId: string): Promise<StatusAnswer>
  apply(
    status: MidtransStatus,
    source: 'webhook' | 'simulate',
    payloadHash: string,
  ): Promise<ApplyResult>
}

export type WebhookPortLoader = (config: PaymentsConfig) => Promise<WebhookPort>

const loadPort: WebhookPortLoader = async (config) =>
  (await import('./payload-port')).webhookPort(config)

export type WebhookOptions = {
  readonly load?: WebhookPortLoader
  readonly env?: Env
  readonly log?: (line: string) => void
}

export function midtransWebhookRoute(options: WebhookOptions = {}) {
  const load = options.load ?? loadPort
  const log = options.log ?? ((line: string) => console.error(line))

  return async function POST(request: Request): Promise<Response> {
    const configured = paymentsConfigFromEnv(options.env ?? process.env)
    if (!configured.ok) {
      log(`[payments] webhook refused: ${configured.subject} ${configured.reason}`)
      return plain(503, 'payments are not configured on this host')
    }
    const { config } = configured

    const raw = await readBounded(request, MAX_BODY_BYTES)
    if (raw === null) return plain(413, 'too large')
    const hash = sha256Hex(raw)

    const signed = readSignedFields(raw)
    if (!signed.ok) {
      if (signed.reason === 'malformed') return plain(400, 'not a notification')
      log(`[payments] ALERT webhook without a signature body=sha256:${hash}`)
      return plain(401, 'unauthorised')
    }
    if (!isValidSignature(signed.fields, signed.signatureKey, config.serverKey)) {
      log(`[payments] ALERT webhook signature mismatch body=sha256:${hash}`)
      return plain(401, 'unauthorised')
    }

    const status = parseStatus(signed.body)
    if (!status) {
      log(`[payments] signed webhook is malformed body=sha256:${hash}`)
      return plain(400, 'not a notification')
    }

    try {
      const port = await load(config)
      const answer = await port.confirm(status.midtransOrderId)
      if (!answer.found || answer.status.midtransOrderId !== status.midtransOrderId) {
        log(`[payments] webhook ${status.midtransOrderId}: the status API does not confirm it`)
        return plain(500, 'not confirmed; retry later')
      }
      const source = config.mode === 'simulate' ? 'simulate' : 'webhook'
      // The outcome is in the ledger (`payment-events.outcome`); the answer says only "received".
      const applied = await port.apply(answer.status, source, hash)
      if (applied.outcome === 'busy') {
        log(`[payments] webhook ${status.midtransOrderId}: the order is busy; asked to retry`)
        return busy()
      }
      return Response.json(
        { received: true },
        { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
      )
    } catch (error) {
      if (isLockContention(error)) {
        log(`[payments] webhook ${status.midtransOrderId}: lock contention; asked to retry`)
        return busy()
      }
      log(`[payments] webhook ${status.midtransOrderId} failed: ${describeError(error)}`)
      return plain(500, 'the notification could not be applied; retry later')
    }
  }
}
