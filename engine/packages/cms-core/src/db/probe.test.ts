import { describe, expect, it } from 'vitest'

import { databaseProbe } from './probe'

function fakePool(query: () => Promise<{ rows: Record<string, unknown>[] }>) {
  const released: unknown[] = []
  const pool = {
    connect: async () => ({
      query,
      release: (error?: Error | boolean) => {
        released.push(error)
      },
    }),
  }
  return { pool: pool as never, released }
}

describe('databaseProbe()', () => {
  it('answers the isolation level and pools the connection again', async () => {
    const { pool, released } = fakePool(async () => ({
      rows: [{ default_transaction_isolation: 'read committed' }],
    }))
    await expect(databaseProbe(pool)()).resolves.toEqual({ transactionIsolation: 'read committed' })
    expect(released).toEqual([undefined])
  })

  it('hands a failed query’s error to release(), so pg destroys that connection (4.6 review #1)', async () => {
    const timeout = new Error('Query read timeout')
    const { pool, released } = fakePool(async () => {
      throw timeout
    })
    await expect(databaseProbe(pool)()).rejects.toBe(timeout)
    expect(released).toEqual([timeout])
  })

  it('destroys the connection when the database answers nothing', async () => {
    const { pool, released } = fakePool(async () => ({ rows: [] }))
    await expect(databaseProbe(pool)()).rejects.toThrow(/answered nothing/)
    expect(released).toHaveLength(1)
    expect(released[0]).toBeInstanceOf(Error)
  })
})
