/**
 * The shop app's one Payload, under the name the shared code asks for it by (TASKS.md 23.3): the
 * storefront and `@engine/site` reach Payload through `@engine/cms/instance`, which today's app
 * resolves to its one CMS and this app aliases here (`next.config.ts` `turbopack.resolveAlias`,
 * `tsconfig.json` `paths`) — so the shop's pages read `indies_shop` through cms-shop's config, and
 * this app never loads today's CMS. Importing this opens nothing: `shopCms()`'s first call connects.
 */
import 'server-only'

import type { LockPool } from '@engine/cms-core/db'
import { shopCms, type Payload } from '@engine/cms-shop/instance'

export type { Payload }

/** The instance, initialised on the first call; every later call resolves the same one. */
export const cms: () => Promise<Payload> = shopCms

/**
 * The adapter's pool, as a live stock read takes it. A cast — `Payload['db']` is the generic
 * adapter — so it throws when the pool has no `connect()`: an instance built without connecting.
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
