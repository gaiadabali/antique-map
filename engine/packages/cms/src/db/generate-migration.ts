/**
 * `pnpm --filter @engine/cms migrate:create <name>` — the schema lead's one migration per wave
 * (WORKFLOW.md §2), generated in a clean worktree from this CMS's config. What it adds to
 * Payload's own `migrate:create` is `@engine/cms-core/db/schema`'s (`createMigration`).
 */
import { createMigration, migrationNameArgument } from '@engine/cms-core/db/schema'

import { finish, schemaPayload } from './cli'

const name = migrationNameArgument()
const payload = await schemaPayload({ connect: false })
await finish(payload, await createMigration(payload, name))
