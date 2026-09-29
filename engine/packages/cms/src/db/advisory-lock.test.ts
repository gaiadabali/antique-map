import { describe, expect, it } from 'vitest'

import {
  advisoryLockKey,
  MIGRATION_LOCK_KEY,
  withAdvisoryLock,
  type LockClient,
  type LockPool,
} from './advisory-lock'

type Call = { text: string; values: unknown[] | undefined }

function fakePool(options: { contended?: boolean; unlockFails?: boolean } = {}) {
  const calls: Call[] = []
  const released: Array<Error | boolean | undefined> = []
  const client: LockClient = {
    async query(text, values) {
      calls.push({ text, values })
      if (text.includes('pg_try_advisory_lock')) return { rows: [{ locked: !options.contended }] }
      if (text.includes('pg_advisory_unlock') && options.unlockFails) throw new Error('gone')
      return { rows: [] }
    },
    release(error) {
      released.push(error)
    },
  }
  const pool: LockPool = { connect: async () => client }
  return { pool, calls, released }
}

describe('the migration advisory lock', () => {
  it('derives a stable signed 64-bit key from its name', () => {
    expect(advisoryLockKey('engine/payload-migrations')).toBe(MIGRATION_LOCK_KEY)
    const key = BigInt(MIGRATION_LOCK_KEY)
    expect(key >= -(2n ** 63n) && key < 2n ** 63n).toBe(true)
    expect(advisoryLockKey('another')).not.toBe(MIGRATION_LOCK_KEY)
  })

  it('holds the lock around the task, then unlocks and releases the connection', async () => {
    const { pool, calls, released } = fakePool()
    const order: string[] = []
    const result = await withAdvisoryLock(pool, '42', async () => {
      order.push(`task after ${calls.length} queries`)
      return 'migrated'
    })
    expect(result).toBe('migrated')
    expect(calls.map((call) => call.text)).toEqual([
      'SELECT pg_try_advisory_lock($1::bigint) AS locked',
      'SELECT pg_advisory_unlock($1::bigint)',
    ])
    expect(calls.every((call) => call.values?.[0] === '42')).toBe(true)
    expect(order).toEqual(['task after 1 queries'])
    expect(released).toEqual([false])
  })

  it('waits on the blocking lock, and says so, when another process holds it', async () => {
    const { pool, calls } = fakePool({ contended: true })
    const log: string[] = []
    await withAdvisoryLock(
      pool,
      '7',
      async () => undefined,
      (message) => log.push(message),
    )
    expect(calls.map((call) => call.text)).toContain('SELECT pg_advisory_lock($1::bigint)')
    expect(log[0]).toMatch(/waiting for advisory lock 7/)
  })

  it('unlocks when the task throws, and rethrows its error', async () => {
    const { pool, calls, released } = fakePool()
    await expect(
      withAdvisoryLock(pool, '1', async () => {
        throw new Error('migration failed')
      }),
    ).rejects.toThrow('migration failed')
    expect(calls.at(-1)?.text).toBe('SELECT pg_advisory_unlock($1::bigint)')
    expect(released).toEqual([false])
  })

  it('treats a lost lock connection as fatal, and stops listening once released', async () => {
    const listeners = new Set<(error: Error) => void>()
    const client: LockClient = {
      query: async (text) => ({ rows: text.includes('try') ? [{ locked: true }] : [] }),
      release: () => {},
      on: (_event, listener) => listeners.add(listener),
      off: (_event, listener) => listeners.delete(listener),
    }
    const lost: string[] = []
    await withAdvisoryLock(
      { connect: async () => client },
      '3',
      async () => {
        for (const listener of listeners) listener(new Error('terminating connection'))
      },
      () => {},
      (error) => lost.push(error.message),
    )
    expect(lost).toEqual(['terminating connection'])
    expect(listeners.size).toBe(0)
  })

  it('destroys the connection when unlocking fails, so Postgres releases the lock', async () => {
    const { pool, released } = fakePool({ unlockFails: true })
    await withAdvisoryLock(pool, '1', async () => 'done')
    expect(released[0]).toBeInstanceOf(Error)
  })
})
