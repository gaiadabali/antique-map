/**
 * `pnpm --filter @engine/cms schema:check` — the "No schema changes detected" check (TASKS.md
 * 3.2.c, DEPLOYMENT.md §4.4), with `BRAND` unset.
 *
 *   schema:check             the config against the latest committed snapshot: exit 1 and the
 *                            SQL if `migrate:create` would write a migration — someone changed a
 *                            collection without the wave's migration, or the chain drifted
 *   schema:check database    also the connected database (DATABASE_URL): exit 1 if a bundled
 *                            migration is not applied there, or it records one the code lacks
 *   schema:check print       print the normalised snapshot JSON and exit, under the caller's
 *                            `BRAND` — what CI's config-drift diffs with `BRAND` unset and once
 *                            per brand (2.2.g); the others always run with `BRAND` unset
 *
 * Words, not `--flags`: `payload run` drops flags before the script sees them.
 */
import { argument, finish, schemaPayload } from './cli'
import {
  currentSnapshot,
  migrationDrift,
  normalisedSnapshot,
  pendingMigrationStatements,
} from './schema-diff'

const withDatabase = argument('database')
const printing = argument('print')
// `print` keeps the caller's BRAND, so CI can diff its output with BRAND unset against each brand's.
const payload = await schemaPayload({ connect: withDatabase, keepBrand: printing })
let code = 0
try {
  if (printing) {
    process.stdout.write(
      `${JSON.stringify(normalisedSnapshot(await currentSnapshot(payload)), null, 2)}\n`,
    )
  } else {
    const { statements, against } = await pendingMigrationStatements(payload)
    if (statements.length === 0) {
      console.log(`schema:check: No schema changes detected (against ${against ?? 'no snapshot'})`)
    } else {
      code = 1
      console.error(
        `schema:check: the config differs from ${against ?? 'an empty database'} — the SCH lead's migrate:create would write:\n${statements.join('\n')}`,
      )
    }
    if (withDatabase) {
      const { pending, unknown } = await migrationDrift(payload)
      if (pending.length === 0 && unknown.length === 0) {
        console.log('schema:check: the database has applied every migration, and only those')
      } else {
        code = 1
        console.error(
          `schema:check: the database is out of step — pending: ${pending.join(', ') || 'none'}; unknown to this code: ${unknown.join(', ') || 'none'}`,
        )
      }
    }
  }
} catch (error) {
  code = 1
  console.error(`schema:check: ${error instanceof Error ? error.stack : String(error)}`)
}
await finish(payload, code)
