/**
 * The driver-image route's Payload-backed port: loaded by `./route` with `import()` once it has
 * read its path, so nothing else evaluates the Payload config (ARCHITECTURE.md §15).
 *
 * The order is found by the token's SHA-256 (`trackingTokenHash`, the rule `loadTrackingWith`
 * follows), as a database equality match, and its status must be `on_the_way` or `delivered` —
 * attaching an image always moves an order on, so a key stored on an earlier status is never
 * shown. `overrideAccess: true` is deliberate (SECURITY.md §2.2): the token is the access control,
 * and `select` reads the status alone.
 */
import { cms } from '@engine/cms/instance'
import { driverImageUrl } from '@engine/cms/shop/fulfilment'
import { trackingTokenHash } from '@engine/cms/shop/orders'

const SHOWN_STATUSES: readonly string[] = ['on_the_way', 'delivered']

export async function driverImageUrlFor(token: string, ttlSeconds: number): Promise<string | null> {
  const payload = await cms()
  const { docs } = await payload.find({
    collection: 'orders',
    overrideAccess: true,
    limit: 1,
    depth: 0,
    where: { trackingTokenHash: { equals: trackingTokenHash(token) } },
    select: { status: true },
  })
  const order = docs[0] as { id: number; status: string } | undefined
  if (order === undefined || !SHOWN_STATUSES.includes(order.status)) return null
  return driverImageUrl(payload, order.id, ttlSeconds)
}
