/**
 * What `migrate:create` changes in Payload's migration template before writing it
 * (`./generate-migration`): the two argument types imported as types. The template imports them
 * as values, which `verbatimModuleSyntax` refuses — and a bundler honouring it would keep them as
 * an import of an export that does not exist at runtime.
 */
const TEMPLATE_IMPORT =
  "import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'"
const TYPED_IMPORT =
  "import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'"

export function typeOnlyImports(source: string): string {
  return source.replace(TEMPLATE_IMPORT, TYPED_IMPORT)
}
