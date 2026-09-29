/**
 * What `migrate:create` changes in Payload's migration template before writing it
 * (`./generate-migration`):
 *
 * - the two argument types imported as types. The template imports them as values, which
 *   `verbatimModuleSyntax` refuses — and a bundler honouring it would keep them as an import of an
 *   export that does not exist at runtime;
 * - `up()` opens with `SET LOCAL lock_timeout`: a migration that waits on a lock a live request
 *   holds gives up after five seconds, failing the boot (and so the deploy's health check) instead
 *   of queueing every request behind its DDL (senior-db review of 3.2, N3). `SET LOCAL` lasts for
 *   the migration's own transaction only.
 */
const TEMPLATE_IMPORT =
  "import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'"
const TYPED_IMPORT =
  "import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'"

const UP_OPENING = 'export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {'
export const MIGRATION_LOCK_TIMEOUT = '5s'
const LOCK_TIMEOUT =
  "  await db.execute(sql`SET LOCAL lock_timeout = '" + MIGRATION_LOCK_TIMEOUT + "'`)"

export function typeOnlyImports(source: string): string {
  return source.replace(TEMPLATE_IMPORT, TYPED_IMPORT)
}

/** The lock timeout as `up()`'s first statement, once. */
export function withLockTimeout(source: string): string {
  if (!source.includes(UP_OPENING) || source.includes('SET LOCAL lock_timeout')) return source
  return source.replace(UP_OPENING, `${UP_OPENING}\n${LOCK_TIMEOUT}`)
}

/** Everything `migrate:create` does to Payload's template. */
export function finishMigrationSource(source: string): string {
  return withLockTimeout(typeOnlyImports(source))
}
