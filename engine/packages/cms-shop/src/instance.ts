/**
 * The shop process's one Payload (ARCHITECTURE.md §15): what the shop app's server routes reach
 * Payload through — loaded with `import()` once a handler has read its request. `payload` is one
 * copy per process (`serverExternalPackages`), so the admin's routes and every handler share one
 * instance, one pool and one migration run.
 *
 * Importing this opens nothing: `./payload.config` builds the adapter, whose pool is created on
 * connect. Only `shopCms()`'s first call connects — and, with `RUN_MIGRATIONS=1`, applies pending
 * migrations under the advisory lock.
 */
import { getPayload, type Payload } from 'payload'

import config from './payload.config'

export type { Payload }

/** The instance, initialised on the first call; every later call resolves the same one. */
export function shopCms(): Promise<Payload> {
  return getPayload({ config })
}
