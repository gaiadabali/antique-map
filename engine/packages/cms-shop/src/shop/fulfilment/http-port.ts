/**
 * The purge route's Payload-backed port: `purgePortWith` for a given Payload, and `purgePort` bound
 * to the shop's own (`../../instance`) — loaded with `import()` by `./http` once the crontab's bearer
 * has passed, so a mount, `next build` and the route's unit test never evaluate the Payload config.
 * Today's one CMS binds `purgePortWith` to its own instance.
 */
import type { Payload } from 'payload'

import { shopCms } from '../../instance'
import { purgeDriverImages } from './driver-image'
import type { PurgePort } from './http'

export function purgePortWith(instance: () => Promise<Payload>): PurgePort {
  return { run: async (now) => purgeDriverImages(await instance(), now) }
}

export const purgePort = (): PurgePort => purgePortWith(shopCms)
