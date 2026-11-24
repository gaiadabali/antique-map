/**
 * The spreadsheet importer's engine (DATA.md §3–§5) — `@engine/cms-core/import`: one file in (a
 * `.csv` or an `.xlsx`), each row planned and applied by its kind's handler in one transaction per
 * file, a report out. A CMS binds the kinds it holds (`ImportHandlers`): the shop's in
 * `@engine/cms-shop/import`; the antiques in today's `@engine/cms` until phase 25.
 */
export {
  freshReq,
  runImportFile,
  runImportPath,
  type ImportHandlers,
  type KindHandler,
  type RunOptions,
  type UpsertContext,
  type UpsertResult,
} from './apply'
export { ImportError } from './csv'
export { ensureMedia } from './media'
export { parseSpreadsheet, parseXlsx } from './xlsx'
export { keyColumns, requiredColumns, template } from './kinds'
export { render, Report } from './report'
export { IMPORT_KINDS, type ImportKind, type ImportReport } from './types'
export type { PlannedRow, Row, WritableRow } from './plan'
export { cliInvalidation, postCliTags } from './cli-cache'
