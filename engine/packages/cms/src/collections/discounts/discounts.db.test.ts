/**
 * Discount codes on a real, pushed Postgres (TASKS.md 3.3.c): the owner's alone over REST; a code
 * is stored upper-case and trimmed, so `welcome10 ` and `WELCOME10` are one code; `usedCount` is
 * the server's; and the database refuses the rows a wrong value would cost money on.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { sqlError } from '../stock-levels/shop.test-support'
import { server, startStaffStack, type StaffStack } from '../users/staff.test-support'

describe.skipIf(!server)('discount codes, on a real database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_discounts_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('stores a code upper-case, once, with its uses counted by the server alone', async () => {
    const made = await stack.rest('POST', '/api/discounts', {
      as: 'owner',
      json: { code: ' welcome10 ', kind: 'percent', value: 10, usedCount: 99 },
    })
    expect(made.status).toBe(201)
    expect(made.body?.doc).toMatchObject({ code: 'WELCOME10', usedCount: 0, active: true })
    const twice = await stack.rest('POST', '/api/discounts', {
      as: 'owner',
      json: { code: 'Welcome10', kind: 'fixed', value: 50000 },
    })
    expect(twice.status).toBe(400)
    for (const as of ['editor', 'store'] as const) {
      expect((await stack.rest('GET', '/api/discounts', { as })).status, as).toBe(403)
      const json = { code: `X-${as}`, kind: 'fixed', value: 1000 }
      expect((await stack.rest('POST', '/api/discounts', { as, json })).status, as).toBe(403)
    }
    expect((await stack.rest('GET', '/api/discounts')).status).toBe(403)
  })

  it('refuses in the database a row a wrong value would cost money on', async () => {
    const insert = (columns: string, values: string) =>
      sqlError(stack.pool, `INSERT INTO discounts (${columns}) VALUES (${values})`)
    const base = 'code, kind, value, used_count'
    for (const [columns, values, constraint] of [
      [base, `'lower', 'fixed', 1000, 0`, 'discounts_code_normalised'],
      [base, `'P101', 'percent', 101, 0`, 'discounts_value_valid'],
      [base, `'F0', 'fixed', 0, 0`, 'discounts_value_valid'],
      [base, `'FX', 'fixed', 1000.5, 0`, 'discounts_value_valid'],
      [`${base}, min_spend`, `'MS', 'fixed', 1000, 0, -1`, 'discounts_min_spend_whole'],
      [`${base}, usage_limit`, `'UL', 'fixed', 1000, 3, 2`, 'discounts_usage_counted'],
      [base, `'NEG', 'fixed', 1000, -1`, 'discounts_usage_counted'],
      [
        `${base}, starts_at, ends_at`,
        `'WIN', 'fixed', 1000, 0, '2026-12-01', '2026-11-01'`,
        'discounts_window_ordered',
      ],
    ] as const) {
      expect((await insert(columns, values))?.constraint, values).toBe(constraint)
    }
    expect(await insert(`${base}, usage_limit`, `'OK', 'fixed', 1000, 2, 2`)).toBeNull()
    // The checkout's atomic increment stops at the limit rather than break the rule.
    const taken = await stack.pool.query(
      `UPDATE discounts SET used_count = used_count + 1 WHERE code = 'OK' AND used_count < usage_limit RETURNING id`,
    )
    expect(taken.rows).toHaveLength(0)
  })
})
