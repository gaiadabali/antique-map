/**
 * The spreadsheet import's public surface (DATA.md §3–§5): the `@engine/cms/import` export the
 * admin action and the seed use. One call — `runImportFile` (bytes) or `runImportPath` (a path)
 * — takes a kind, a file (`.csv` or `.xlsx`) and options, and answers the report; `render`
 * prints it. The CLI is `./cli.ts` (`payload run engine/packages/cms/src/import/cli.ts`); planning's shapes and the
 * column templates are here for the callers that build sheets.
 */
export {
  runImportFile,
  runImportPath,
  type RunOptions,
  type UpsertContext,
  type UpsertResult,
} from './apply'
export { ImportError } from '@engine/cms-core/import/csv'
export { parseSpreadsheet, parseXlsx } from '@engine/cms-core/import/xlsx'
export {
  template,
  requiredColumns,
  keyColumns,
  ANTIQUE_COLUMNS,
  PRODUCT_COLUMNS,
  STORE_COLUMNS,
  STOCK_COLUMNS,
  DISCOUNT_COLUMNS,
} from '@engine/cms-core/import/kinds'
export { render, Report } from '@engine/cms-core/import/report'
export {
  emptyCounts,
  hold,
  reject,
  IMPORT_KINDS,
  type ImportKind,
  type ImportReport,
  type Outcome,
  type Problem,
  type ReportRow,
} from '@engine/cms-core/import/types'
export type { PlannedRow, Row, WritableRow, ImportCollection } from '@engine/cms-core/import/plan'
export type { Sheet } from '@engine/cms-core/import/csv'
export { cliInvalidation, postCliTags } from '@engine/cms-core/import/cli-cache'
