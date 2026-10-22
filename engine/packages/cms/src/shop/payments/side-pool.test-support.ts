/**
 * Test support only — the side connections a contention test holds locks with (TASKS.md 10.5.c).
 * "Artificially held lock": the test itself holds a row lock on a connection of its own while the
 * contenders run, so what it proves never depends on the host's speed. The side pool is pg's own
 * `Pool` (the adapter's class) on the stack's database, so holding a lock never takes one of
 * Payload's ten connections.
 */
import { server, type StaffStack } from '../../collections/users/staff.test-support'

export type SideClient = {
  query(text: string): Promise<{ rows: Array<Record<string, unknown>> }>
  release(): void
}
export type SidePool = { connect(): Promise<SideClient>; end(): Promise<void> }

/** A pool of `max` connections of our own on the stack's database. */
export async function openSidePool(stack: StaffStack, max = 3): Promise<SidePool> {
  const { rows } = await stack.pool.query('SELECT current_database() AS name')
  const url = new URL(server!)
  url.pathname = `/${String(rows[0]!.name)}`
  const Pool = stack.pool.constructor as unknown as new (options: object) => SidePool
  return new Pool({ connectionString: url.toString(), max })
}

/** Sessions in the test database waiting on a lock now (optionally: running SQL like `like`). */
export async function lockWaits(client: SideClient, like?: string): Promise<number> {
  const filter = like === undefined ? '' : ` AND query ILIKE '${like.replace(/'/g, "''")}'`
  const { rows } = await client.query(
    `SELECT count(*) AS n FROM pg_stat_activity
      WHERE datname = current_database() AND wait_event_type = 'Lock'${filter}`,
  )
  return Number(rows[0]!.n)
}

/** Polls `check` every 20 ms until it is true; throws `what` after `ms`. */
export async function waitUntil(check: () => Promise<boolean> | boolean, ms: number, what: string) {
  const started = Date.now()
  while (!(await check())) {
    if (Date.now() - started > ms) throw new Error(`timed out waiting until ${what}`)
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

type ErrorEmitter = { on(event: 'error', listener: (error: Error) => void): unknown }
type AcquiringPool = {
  on(event: 'acquire', listener: (client: ErrorEmitter) => void): unknown
  off(event: 'acquire', listener: (client: ErrorEmitter) => void): unknown
}

/**
 * Lets a test terminate the backend of one of Payload's checked-out connections (a killed process,
 * as the database sees it). pg-pool takes its own `'error'` listener off a client while it is
 * checked out, so the dying connection's `'error'` would be an uncaught exception in the test
 * process — the killed query's own rejection is what the code under test sees. Returns the undo.
 */
export function absorbCheckedOutClientErrors(pool: StaffStack['pool']): () => void {
  const guarded = new WeakSet<object>()
  const target = pool as unknown as AcquiringPool
  const guard = (client: ErrorEmitter) => {
    if (guarded.has(client)) return
    guarded.add(client)
    client.on('error', () => {})
  }
  target.on('acquire', guard)
  return () => target.off('acquire', guard)
}

/** Tracks how many of `promises` have settled, without changing what they settle to. */
export function settleCounter<T>(promises: Promise<T>[]): {
  settled: () => number
  all: Promise<PromiseSettledResult<T>[]>
} {
  let count = 0
  const counted = promises.map((promise) =>
    promise.finally(() => {
      count += 1
    }),
  )
  return { settled: () => count, all: Promise.allSettled(counted) }
}
