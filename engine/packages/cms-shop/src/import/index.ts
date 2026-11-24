/**
 * The shop's spreadsheet kinds (DATA.md §3–§5) on the shared engine (`@engine/cms-core/import`):
 * products (a variant row merged into its parent), stores, stock and discounts, each planned by
 * `./plan-shop` and applied by `./apply-shop`. `runShopImportFile` is the engine bound to them — the
 * admin's import screen (`../collections/stock-levels/import-endpoint`) and the shop's seed use it.
 */
import {
  runImportFile,
  runImportPath,
  type ImportHandlers,
  type KindHandler,
  type RunOptions,
} from '@engine/cms-core/import/apply'
import type { WritableRow } from '@engine/cms-core/import/plan'
import type { ImportKind, ImportReport } from '@engine/cms-core/import/types'

import { applyShopRow } from './apply-shop'
import { planDiscountRow, planProductRow, planStockRow, planStoreRow } from './plan-shop'

const apply: KindHandler['apply'] = (ctx, planned) =>
  applyShopRow(ctx, planned as WritableRow & { collection: string })

export const SHOP_IMPORT_HANDLERS = {
  products: {
    plan: (row, vocab) => planProductRow(row, vocab, (row.cells.parent_sku ?? '').trim() !== ''),
    apply,
  },
  stores: { plan: (row) => planStoreRow(row), apply },
  stock: { plan: (row) => planStockRow(row), apply },
  discounts: { plan: (row) => planDiscountRow(row), apply },
} as const satisfies ImportHandlers

export type ShopRunOptions = Omit<RunOptions, 'handlers'>

/** One file of a shop kind, as bytes: the report, the rows applied unless it is a dry run. */
export function runShopImportFile(
  kind: ImportKind,
  fileName: string,
  bytes: Uint8Array,
  options: ShopRunOptions,
): Promise<ImportReport> {
  return runImportFile(kind, fileName, bytes, { ...options, handlers: SHOP_IMPORT_HANDLERS })
}

/** One file of a shop kind, by its path. */
export function runShopImportPath(
  kind: ImportKind,
  path: string,
  options: ShopRunOptions,
): Promise<ImportReport> {
  return runImportPath(kind, path, { ...options, handlers: SHOP_IMPORT_HANDLERS })
}
