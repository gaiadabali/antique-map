/**
 * The legacy route's Payload-backed port (TASKS.md 9.4.b): the one module of `legacy/` that
 * reaches `@engine/cms`, loaded by `./route` with `import()` on the first legacy request — so
 * `next build`, route parity's runner and the route's tests never evaluate the Payload config
 * (ARCHITECTURE.md §15).
 */
import { cms } from '@engine/cms/instance'
import type { SiteKey } from '@engine/config/sites'

import { readRedirectMap, type RedirectMap, type RedirectReader } from './redirect-map'

export async function loadRedirectMap(site: SiteKey): Promise<RedirectMap> {
  const payload = await cms()
  return readRedirectMap(payload as unknown as RedirectReader, site)
}
