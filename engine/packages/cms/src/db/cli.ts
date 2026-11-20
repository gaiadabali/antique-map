/**
 * What this CMS's schema scripts share (`./generate-migration`, `./schema-check`): a Payload
 * instance built from the one config, the way every CMS's schema scripts run theirs
 * (`@engine/cms-core/db/schema`: `schemaConfig`, `schemaInstance`), and a clean exit code (`finish`).
 * Run through `payload run`, which loads TypeScript and the nearest `.env*` file.
 */
import { schemaConfig, schemaInstance } from '@engine/cms-core/db/schema'
import { getPayload, type Payload } from 'payload'

export { argument, finish, latestSnapshot } from '@engine/cms-core/db/schema'

export async function schemaPayload(options: { connect: boolean }): Promise<Payload> {
  const config = await schemaConfig(() => import('../payload.config'))
  return getPayload({ config, ...schemaInstance(options) })
}
