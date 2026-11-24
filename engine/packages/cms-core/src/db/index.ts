/**
 * The database tooling every CMS's config runs with — `@engine/cms-core/db`: the Postgres adapter
 * with its pool limits and the migration lock (`./adapter`, `./advisory-lock`), the
 * schema-constraint seam (`./constraints`), and how a generated migration is finished
 * (`./migration-template`). Each CMS passes its own migration folder and set; none of this knows
 * which CMS it serves.
 *
 * Elsewhere, so a config never loads them: the bodies of the `migrate:create` and `schema:check`
 * scripts (`@engine/cms-core/db/schema`, which loads Prettier), the boot probe
 * (`…/db/probe`) and the test databases' helpers (`…/db/test-database`, `…/db/test-origin`).
 */
export {
  buildDatabaseAdapter,
  devPushRequested,
  LOCKED_MIGRATION_METHODS,
  POOL_CONNECT_TIMEOUT_MS,
  POOL_IDLE_TIMEOUT_MS,
  POOL_MAX,
  QUERY_TIMEOUT_MS,
  runsMigrationsOnBoot,
  unboundedQueries,
  withMigrationLock,
  type BundledMigration,
  type DatabaseAdapterOptions,
  type DatabaseEnv,
} from './adapter'
export {
  advisoryLockKey,
  MIGRATION_LOCK_KEY,
  MIGRATION_LOCK_NAME,
  withAdvisoryLock,
  type LockClient,
  type LockLog,
  type LockPool,
} from './advisory-lock'
export {
  collectConstraints,
  DB_CONSTRAINTS,
  dbConstraints,
  declareConstraints,
  extraConfigFor,
  type ConstraintSet,
} from './constraints'
export {
  finishMigrationSource,
  MIGRATION_LOCK_TIMEOUT,
  typeOnlyImports,
  withLockTimeout,
} from './migration-template'
