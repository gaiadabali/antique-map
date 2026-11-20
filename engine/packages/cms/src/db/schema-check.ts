/**
 * `pnpm --filter @engine/cms schema:check [database | print]` — the "No schema changes detected"
 * check (TASKS.md 3.2.c, DEPLOYMENT.md §4.4) for this CMS's config and its migration set. The
 * check itself, and what each word asks for, is `@engine/cms-core/db/schema`'s (`checkSchema`).
 */
import { checkSchema, schemaCheckArguments } from '@engine/cms-core/db/schema'

import { migrations } from '../migrations'
import { finish, schemaPayload } from './cli'

const { withDatabase, printing } = schemaCheckArguments()
const payload = await schemaPayload({ connect: withDatabase })
await finish(payload, await checkSchema(payload, { withDatabase, printing, migrations }))
