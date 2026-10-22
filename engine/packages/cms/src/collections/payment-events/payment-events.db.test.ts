/**
 * `payment-events` is append-only, on a real, pushed Postgres (TASKS.md 3.3.c, 3.3.e): an update
 * and a delete are refused through REST for everyone — the owner included — through the Local
 * API with access overridden, and, once the migration's trigger is in place, by the database for
 * any session. The trigger SQL is the exact text the schema lead puts in the migration
 * (`PAYMENT_EVENTS_APPEND_ONLY_SQL`); it is applied here because drizzle's push cannot carry one.
 * A second event with the same dedupe key is refused, which is the webhook's idempotency.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sqlError } from '../stock-levels/shop.test-support'
import { server, startStaffStack, type StaffStack } from '../users/staff.test-support'
import {
  APPEND_ONLY_MESSAGE,
  PAYMENT_EVENTS_APPEND_ONLY_DOWN_SQL,
  PAYMENT_EVENTS_APPEND_ONLY_SQL,
} from './append-only'

describe.skipIf(!server)('payment events, on a real database', () => {
  let stack: StaffStack
  let event: { id: number | string }

  const record = (dedupeKey: string) =>
    stack.payload.create({
      collection: 'payment-events',
      data: {
        dedupeKey,
        source: 'simulate',
        transactionStatus: 'settlement',
        grossAmount: 205000,
        outcome: 'applied',
        receivedAt: new Date().toISOString(),
      },
    })

  beforeAll(async () => {
    stack = await startStaffStack('cms_payment_events_test', (config, key) =>
      getPayload({ config, key }),
    )
    event = await record('a'.repeat(64))
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('shows the owner the ledger, and nobody else', async () => {
    const owner = await stack.rest('GET', '/api/payment-events', { as: 'owner' })
    expect(owner.status).toBe(200)
    expect(owner.body?.totalDocs).toBe(1)
    for (const as of ['editor', 'store'] as const) {
      expect((await stack.rest('GET', '/api/payment-events', { as })).status, as).toBe(403)
    }
    expect((await stack.rest('GET', '/api/payment-events')).status).toBe(403)
  })

  it('refuses an update and a delete over REST, for the owner too, and a create', async () => {
    for (const as of ['owner', 'editor', 'store'] as const) {
      const patched = await stack.rest('PATCH', `/api/payment-events/${event.id}`, {
        as,
        json: { outcome: 'tidied' },
      })
      expect(patched.status, `update as ${as}`).toBe(403)
      const deleted = await stack.rest('DELETE', `/api/payment-events/${event.id}`, { as })
      expect(deleted.status, `delete as ${as}`).toBe(403)
      const bulk = await stack.rest('DELETE', '/api/payment-events?where[id][exists]=true', { as })
      expect(bulk.status, `bulk delete as ${as}`).toBe(403)
      const made = await stack.rest('POST', '/api/payment-events', {
        as,
        json: { dedupeKey: `x-${as}`, source: 'webhook', receivedAt: new Date().toISOString() },
      })
      expect(made.status, `create as ${as}`).toBe(403)
    }
  })

  it('refuses an update and a delete through the Local API with access overridden', async () => {
    await expect(
      stack.payload.update({
        collection: 'payment-events',
        id: event.id,
        data: { outcome: 'tidied' },
      }),
    ).rejects.toThrow(APPEND_ONLY_MESSAGE)
    await expect(
      stack.payload.delete({ collection: 'payment-events', id: event.id }),
    ).rejects.toThrow(APPEND_ONLY_MESSAGE)
    await expect(
      stack.payload.delete({ collection: 'payment-events', where: { id: { exists: true } } }),
    ).rejects.toThrow(APPEND_ONLY_MESSAGE)
    const { rows } = await stack.pool.query(`SELECT outcome FROM payment_events`)
    expect(rows).toEqual([{ outcome: 'applied' }])
  })

  it('refuses a second event with the same dedupe key', async () => {
    await expect(record('a'.repeat(64))).rejects.toThrow()
    const error = await sqlError(
      stack.pool,
      `INSERT INTO payment_events (dedupe_key, source, received_at) VALUES ('${'a'.repeat(64)}', 'webhook', now())`,
    )
    expect(error?.code).toBe('23505')
    // The webhook's insert: a duplicate is a no-op, not an error.
    const replay = await stack.pool.query(
      `INSERT INTO payment_events (dedupe_key, source, received_at) VALUES ('${'a'.repeat(64)}', 'webhook', now()) ON CONFLICT (dedupe_key) DO NOTHING RETURNING id`,
    )
    expect(replay.rows).toHaveLength(0)
  })

  it('refuses UPDATE, DELETE and TRUNCATE in the database once the migration’s trigger is in', async () => {
    await stack.pool.query(PAYMENT_EVENTS_APPEND_ONLY_SQL)
    try {
      for (const statement of [
        `UPDATE payment_events SET outcome = 'tidied'`,
        `DELETE FROM payment_events`,
        // A plain TRUNCATE already fails on the foreign keys that reference the table; CASCADE
        // would not, and `TRUNCATE orders CASCADE` reaches the ledger through `order_id`.
        `TRUNCATE payment_events CASCADE`,
        `TRUNCATE orders CASCADE`,
      ]) {
        const error = await sqlError(stack.pool, statement)
        expect(error?.code, statement).toBe('23001')
        expect(error?.message).toMatch(/payment_events is append-only/)
      }
      // Appending still works.
      expect(
        await sqlError(
          stack.pool,
          `INSERT INTO payment_events (dedupe_key, source, received_at) VALUES ('b', 'webhook', now())`,
        ),
      ).toBeNull()
    } finally {
      await stack.pool.query(PAYMENT_EVENTS_APPEND_ONLY_DOWN_SQL)
    }
    // The down migration removes it cleanly.
    expect(await sqlError(stack.pool, `UPDATE payment_events SET outcome = outcome`)).toBeNull()
  })
})
