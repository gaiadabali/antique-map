/**
 * The shop CMS's schema CLI: a Payload for `migrate:create` built from the shop's config
 * (`@engine/cms-core/db/schema`).
 */
import { schemaConfig, schemaInstance } from '@engine/cms-core/db/schema'
import { getPayload, type Payload } from 'payload'

export { argument, finish, latestSnapshot } from '@engine/cms-core/db/schema'

export async function schemaPayload(options: { connect: boolean }): Promise<Payload> {
  const config = await schemaConfig(() => import('../payload.config'))
  return getPayload({ config, ...schemaInstance(options) })
}
