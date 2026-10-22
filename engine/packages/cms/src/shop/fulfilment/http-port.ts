/**
 * The purge route's Payload-backed port: the one fulfilment module that reaches the process's
 * Payload (`../../instance`), loaded with `import()` by `./http` once the crontab's bearer has
 * passed — so a mount, `next build` and the route's unit test never evaluate the Payload config.
 */
import { cms } from '../../instance'
import { purgeDriverImages } from './driver-image'
import type { PurgePort } from './http'

export function purgePort(): PurgePort {
  return { run: async (now) => purgeDriverImages(await cms(), now) }
}
