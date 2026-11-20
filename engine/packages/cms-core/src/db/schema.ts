/**
 * A CMS's schema scripts — `@engine/cms-core/db/schema`: the config as `migrate:create` and
 * `schema:check` run it and a clean exit (`./schema-cli`), the config's schema against the
 * committed snapshot chain and a live database against the migration set (`./schema-diff`), and
 * the two scripts' bodies (`./schema-scripts`). Only those scripts import this: it loads Prettier,
 * which no running process needs.
 */
export {
  argument,
  finish,
  latestSnapshot,
  schemaConfig,
  schemaInstance,
  type ConfigModule,
} from './schema-cli'
export {
  currentSnapshot,
  migrationDrift,
  normalisedSnapshot,
  pendingMigrationStatements,
} from './schema-diff'
export {
  checkSchema,
  createMigration,
  migrationNameArgument,
  schemaCheckArguments,
} from './schema-scripts'
