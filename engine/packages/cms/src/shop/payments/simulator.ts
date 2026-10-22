/**
 * The payment simulator (`MIDTRANS_MODE=simulate`; COMMERCE.md §6; SECURITY.md W7): no Midtrans
 * and no credential. It plays Midtrans's two parts — the Snap transaction and the status API — and
 * emits notifications **signed with `SIMULATOR_SERVER_KEY`** for the pay page's *Settle*,
 * *Pending*, *Deny* and *Expire* buttons, the e2e and the tests, which post them to the **same**
 * webhook route, so the real verify → confirm → apply path runs end to end.
 *
 * - **Refused in production** at creation and again on every call (`assertSimulatorAllowed`).
 * - **One store per process** (on `globalThis`, so the pay page's server action and the webhook
 *   route share it whichever bundle layer loaded this module). Simulate mode is a workstation, CI
 *   or staging's single process; a restart forgets the attempts, and the sweep then finds no
 *   transaction and expires the order — as Midtrans would for an attempt nobody paid.
 * - `emit(…, { grossAmount })` can sign a wrong amount, for the mismatch test.
 */
import { randomUUID } from 'node:crypto'

import { assertSimulatorAllowed, type PaymentsConfig } from './config'
import { parseBody, parseStatus } from './notification'
import type { PaymentProvider, StatusAnswer } from './provider'
import { midtransSignature } from './signature'

export const SIMULATOR_ACTIONS = ['settle', 'pending', 'deny', 'expire'] as const
export type SimulatorAction = (typeof SIMULATOR_ACTIONS)[number]

const ACTION_STATUS: Record<SimulatorAction, { transactionStatus: string; statusCode: string }> = {
  settle: { transactionStatus: 'settlement', statusCode: '200' },
  pending: { transactionStatus: 'pending', statusCode: '201' },
  deny: { transactionStatus: 'deny', statusCode: '202' },
  expire: { transactionStatus: 'expire', statusCode: '407' },
}

/** The pay page 6.5 builds; the simulator's "redirect URL" for an attempt. */
export const SIMULATOR_PAY_PATH = '/pay/simulate'

type Attempt = { grossAmount: number; transactionId: string; latest: string | null }
type Store = Map<string, Attempt>

const STORE_KEY = Symbol.for('indies.payments.simulator')

function store(): Store {
  const holder = globalThis as { [STORE_KEY]?: Store }
  holder[STORE_KEY] ??= new Map()
  return holder[STORE_KEY]
}

export type SimulatedNotification = {
  /** The notification's JSON, exactly as the webhook receives it. */
  readonly body: string
  readonly payload: Record<string, string>
}

export type SimulatorProvider = PaymentProvider & {
  /** Signs the notification `action` would send for an attempt, and remembers it as its status. */
  emit(
    midtransOrderId: string,
    action: SimulatorAction,
    options?: { readonly grossAmount?: number; readonly paymentType?: string },
  ): SimulatedNotification
  /** Registers an attempt the simulator did not open (tests, or after a restart). */
  register(midtransOrderId: string, grossAmount: number): void
}

export function simulatorProvider(
  config: PaymentsConfig,
  payPageUrl: (midtransOrderId: string) => string = (id) =>
    `${SIMULATOR_PAY_PATH}?attempt=${encodeURIComponent(id)}`,
): SimulatorProvider {
  assertSimulatorAllowed(config)
  const attempts = store()

  const register = (midtransOrderId: string, grossAmount: number) => {
    assertSimulatorAllowed(config)
    if (!Number.isSafeInteger(grossAmount) || grossAmount < 0) throw new RangeError('grossAmount')
    if (!attempts.has(midtransOrderId)) {
      attempts.set(midtransOrderId, { grossAmount, transactionId: randomUUID(), latest: null })
    }
  }

  return {
    mode: 'simulate',

    async createPayment(request) {
      register(request.midtransOrderId, request.grossAmount)
      return { token: `sim-${randomUUID()}`, redirectUrl: payPageUrl(request.midtransOrderId) }
    },

    async getStatus(midtransOrderId): Promise<StatusAnswer> {
      assertSimulatorAllowed(config)
      const raw = attempts.get(midtransOrderId)?.latest
      if (!raw) return { found: false }
      const status = parseStatus(parseBody(raw) ?? {})
      if (!status) throw new Error('payments: the simulator holds a malformed status')
      return { found: true, status, raw }
    },

    redirectUrlFor(_token, midtransOrderId) {
      return payPageUrl(midtransOrderId)
    },

    register,

    emit(midtransOrderId, action, options = {}) {
      assertSimulatorAllowed(config)
      const attempt = attempts.get(midtransOrderId)
      if (!attempt) throw new Error(`payments: the simulator opened no attempt ${midtransOrderId}`)
      const { transactionStatus, statusCode } = ACTION_STATUS[action]
      const grossAmount = `${options.grossAmount ?? attempt.grossAmount}.00`
      const payload: Record<string, string> = {
        transaction_time: new Date().toISOString().replace('T', ' ').slice(0, 19),
        transaction_status: transactionStatus,
        transaction_id: attempt.transactionId,
        status_message: 'midtrans payment notification',
        status_code: statusCode,
        signature_key: midtransSignature(
          { orderId: midtransOrderId, statusCode, grossAmount },
          config.serverKey,
        ),
        payment_type: options.paymentType ?? 'qris',
        order_id: midtransOrderId,
        merchant_id: 'SIMULATOR',
        gross_amount: grossAmount,
        fraud_status: 'accept',
        currency: 'IDR',
      }
      const body = JSON.stringify(payload)
      attempt.latest = body
      return { body, payload }
    },
  }
}
