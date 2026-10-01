/**
 * The laravel-catalogue source (TASKS.md 7.1.b, 7.1.f): a restored MySQL dump
 * — any path, never the live database — in a throwaway container, its schema
 * discovered and its catalogue extracted by SQL. The command line is
 * `pnpm --filter @engine/migrate legacy:mysql`; this entry is what `cli.ts`
 * builds on, for a caller that drives the same steps.
 */
export { CONTAINER_LABEL, DEFAULT_IMAGE, containerState, removeContainer } from './docker.ts'
export { dumpTables, runQueries, verifyJsonLines, type ExtractResult } from './extract.ts'
export { DEFAULT_DATABASE, restoreDump, type RestoreReport, type TableCount } from './restore.ts'
export {
  discoverSchema,
  schemaMarkdown,
  type ColumnReport,
  type SchemaReport,
  type TableReport,
} from './schema.ts'
