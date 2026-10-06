/**
 * The two payment jobs the crontab runs (ARCHITECTURE.md §10; COMMERCE.md §6 "Reconcile and
 * sweep"; SECURITY.md W6; TASKS.md 6.4.c):
 *
 * - **The sweep** (`/api/x/cron/sweeps`, every minute): each `pending_payment` order whose window
 *   ended more than `EXPIRY_GRACE_MINUTES` ago. It asks the provider about every attempt **once
 *   more** and applies each answer through `applyPaymentStatus` — a payment whose webhook never
 *   arrived is applied, not expired — and only then expires the order and returns its stock, in a
 *   transaction of its own guarded by the status (`./release`), so the units come back once
 *   however many sweeps run, concurrently or again. If the provider cannot be asked, the order
 *   waits for the next run: nothing is expired on a guess. The sweep also expires each
 *   `awaiting_quote` order past its own window (TASKS.md 6.6) — no Midtrans attempt to ask about,
 *   since none is opened before a quote — and sends the "expired" email after each expiry commits.
 * - **The reconciler** (`/api/x/cron/reconcile`, every 10 minutes): each `pending_payment` order
 *   older than `RECONCILE_AFTER_MINUTES` and still in its window, with at least one attempt; it
 *   asks about each attempt and applies the answers, so a lost notification shows sooner.
 *
 * Both take a bounded batch, oldest first, and report counts — never personal data.
 */
import type { Payload } from 'payload'

import { describeError } from '@engine/config/boot-check'

import { notifyOrderEvent } from '../notify'
import { applyPaymentStatus } from './apply'
import { sha256Hex } from './notification'
import { DEFAULT_WINDOW_MINUTES } from './order-sql'
import type { PaymentProvider } from './provider'
import { expireAndRelease } from './release'
import { inTransaction, sql, wholeOf } from './transaction'

export const EXPIRY_GRACE_MINUTES = 5
export const RECONCILE_AFTER_MINUTES = 10
export const JOB_BATCH = 100

export type JobRun = {
  readonly checked: number
  readonly applied: number
  readonly expired: number
  readonly failed: number
}

type Candidate = { id: number; attempts: string[] }

const windowEnd = sql`COALESCE(o.expires_at, o.created_at + make_interval(mins => ${DEFAULT_WINDOW_MINUTES}))`

async function candidates(
  payload: Payload,
  status: 'pending_payment' | 'awaiting_quote',
  condition: ReturnType<typeof sql>,
): Promise<Candidate[]> {
  const rows = await inTransaction(payload, (tx) =>
    tx.rows(sql`
      SELECT o.id, COALESCE(array_agg(a.midtrans_order_id ORDER BY a._order DESC)
                            FILTER (WHERE a.midtrans_order_id IS NOT NULL), '{}') AS attempts
        FROM orders o LEFT JOIN orders_payment_attempts a ON a._parent_id = o.id
       WHERE o.status = ${status} AND ${condition}
       GROUP BY o.id
       ORDER BY o.id
       LIMIT ${JOB_BATCH}`),
  )
  return rows.map((row) => ({
    id: wholeOf(row.id, 'orders.id'),
    attempts: Array.isArray(row.attempts) ? row.attempts.map(String) : [],
  }))
}

/** Expires one order, past its window, exactly once; sends the "expired" email after commit. */
async function expireOne(
  payload: Payload,
  orderId: number,
  now: Date,
  from: 'pending_payment' | 'awaiting_quote',
  note: string,
): Promise<boolean> {
  const release = await inTransaction(payload, (tx) =>
    expireAndRelease(tx, orderId, now, 'system', note, from),
  )
  if (release.released) {
    await notifyOrderEvent(payload, { orderId, from, to: 'expired' }).catch(() => {})
  }
  return release.released
}

/** Asks about each attempt and applies what the provider knows; throws when it cannot be asked. */
async function askAndApply(
  payload: Payload,
  provider: PaymentProvider,
  attempts: string[],
  now: Date,
) {
  let applied = 0
  for (const midtransOrderId of attempts) {
    const answer = await provider.getStatus(midtransOrderId)
    if (!answer.found) continue
    const result = await applyPaymentStatus(payload, {
      status: answer.status,
      source: 'reconcile',
      payloadHash: sha256Hex(answer.raw),
      now,
    })
    if (result.outcome !== 'duplicate') applied += 1
  }
  return applied
}

export async function runPaymentSweep(
  payload: Payload,
  provider: PaymentProvider,
  now: Date = new Date(),
): Promise<JobRun> {
  const due = await candidates(
    payload,
    'pending_payment',
    sql`${windowEnd} + make_interval(mins => ${EXPIRY_GRACE_MINUTES}) <= ${now}::timestamptz`,
  )
  let applied = 0
  let expired = 0
  let failed = 0
  for (const order of due) {
    try {
      applied += await askAndApply(payload, provider, order.attempts, now)
      if (
        await expireOne(
          payload,
          order.id,
          now,
          'pending_payment',
          'The payment window passed unpaid.',
        )
      ) {
        expired += 1
      }
    } catch (error) {
      failed += 1
      console.error(
        `[payments] sweep: order ${order.id} left for the next run: ${describeError(error)}`,
      )
    }
  }

  // Awaiting a delivery price, past its own window (TASKS.md 6.6): no attempt was ever opened, so
  // there is nothing to ask Midtrans about — the window itself is the only thing that matters.
  const unquoted = await candidates(
    payload,
    'awaiting_quote',
    sql`o.expires_at <= ${now}::timestamptz`,
  )
  for (const order of unquoted) {
    try {
      if (
        await expireOne(
          payload,
          order.id,
          now,
          'awaiting_quote',
          'The delivery-price window passed with no price set.',
        )
      ) {
        expired += 1
      }
    } catch (error) {
      failed += 1
      console.error(
        `[payments] sweep: order ${order.id} left for the next run: ${describeError(error)}`,
      )
    }
  }
  return { checked: due.length + unquoted.length, applied, expired, failed }
}

export async function runPaymentReconcile(
  payload: Payload,
  provider: PaymentProvider,
  now: Date = new Date(),
): Promise<JobRun> {
  const open = await candidates(
    payload,
    'pending_payment',
    sql`o.created_at <= ${now}::timestamptz - make_interval(mins => ${RECONCILE_AFTER_MINUTES})
        AND ${windowEnd} + make_interval(mins => ${EXPIRY_GRACE_MINUTES}) > ${now}::timestamptz
        AND EXISTS (SELECT 1 FROM orders_payment_attempts x WHERE x._parent_id = o.id)`,
  )
  let applied = 0
  let failed = 0
  for (const order of open) {
    try {
      applied += await askAndApply(payload, provider, order.attempts, now)
    } catch (error) {
      failed += 1
      console.error(`[payments] reconcile: order ${order.id} not checked: ${describeError(error)}`)
    }
  }
  return { checked: open.length, applied, expired: 0, failed }
}
