/**
 * The process's one Payload (TASKS.md 4.8.a, ARCHITECTURE.md §15 condition 1): what a server
 * route reaches Payload through — `@engine/http`'s `payload-*.ts` modules, loaded with `import()`
 * once a handler has read its request. `payload` is declared and pinned by cms alone, so there is
 * one copy of it and one `getPayload()` cache: the admin's routes and every handler share one
 * instance, one pool and one migration run. cms's own CLI (`db/cli`) and tests keep their own
 * `getPayload()` calls, with the options they need.
 *
 * Importing this opens nothing: `./payload.config` builds the adapter, whose pool is created on
 * connect. Only `cms()`'s first call connects — and, in the web process of a production build
 * with `RUN_MIGRATIONS=1`, applies pending migrations under the advisory lock (`db/adapter`).
 * It imports the config and nothing an admin component needs, since http's type-check covers it.
 */
import { getPayload, type Payload } from 'payload'

import type { LockPool } from './db/advisory-lock'
import config from './payload.config'

export type { Payload }

/**
 * The instance, initialised on the first call; every later call, concurrent ones included,
 * resolves the same one (`getPayload()` caches it per process). A first call that fails — no
 * database yet — leaves nothing cached, so the next call tries again.
 */
export function cms(): Promise<Payload> {
  return getPayload({ config })
}

/**
 * The adapter's pool, typed as `@engine/cms/db/probe`'s `databaseProbe()` takes it. A cast —
 * `Payload['db']` is the generic adapter — so it throws when the pool has no `connect()`: an
 * instance built without connecting, or another adapter.
 */
export function cmsPool(payload: Payload): Pick<LockPool, 'connect'> {
  const pool: unknown = (payload.db as { pool?: unknown }).pool
  const connect = (pool as { connect?: unknown } | null | undefined)?.connect
  if (typeof connect !== 'function') {
    throw new TypeError(
      'cmsPool(): payload.db.pool.connect is not a function — is this instance connected to Postgres?',
    )
  }
  return pool as Pick<LockPool, 'connect'>
}
