/**
 * Today's one importer (DATA.md §3–§5): the shared engine (`@engine/cms-core/import`) bound to every
 * kind this CMS holds — the gallery's antiques (`./plan-antiques`, `./apply-works`) and the shop's
 * products, stores, stock and discounts (`@engine/cms-shop/import`). The seed, the CLI and the
 * tests call these as they always have.
 */
import {
  runImportFile as runWith,
  runImportPath as runPathWith,
  type ImportHandlers,
  type RunOptions as EngineRunOptions,
} from '@engine/cms-core/import/apply'
import type { WritableRow } from '@engine/cms-core/import/plan'
import type { ImportKind, ImportReport } from '@engine/cms-core/import/types'
import { SHOP_IMPORT_HANDLERS } from '@engine/cms-shop/import'

import { applyWork } from './apply-works'
import { planAntiqueRow } from './plan-antiques'

export { freshReq, type UpsertContext, type UpsertResult } from '@engine/cms-core/import/apply'

export const IMPORT_HANDLERS: ImportHandlers = {
  antiques: {
    plan: planAntiqueRow,
    apply: (ctx, planned) => applyWork(ctx, planned as WritableRow & { collection: 'works' }),
  },
  ...SHOP_IMPORT_HANDLERS,
}

export type RunOptions = Omit<EngineRunOptions, 'handlers'>

export function runImportFile(
  kind: ImportKind,
  fileName: string,
  bytes: Uint8Array,
  options: RunOptions,
): Promise<ImportReport> {
  return runWith(kind, fileName, bytes, { ...options, handlers: IMPORT_HANDLERS })
}

export function runImportPath(
  kind: ImportKind,
  path: string,
  options: RunOptions,
): Promise<ImportReport> {
  return runPathWith(kind, path, { ...options, handlers: IMPORT_HANDLERS })
}
