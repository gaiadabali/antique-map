/**
 * The shop-catalogue layer (DATA.md §2, task 10.6.e): the owner's real designs as products,
 * generated in memory from `LEGACY_DATA_DIR`, never committed, and loaded through the same
 * importer as his sheets: products by SKU (drafts), then their pictures with honest provenance
 * and, with `--publish`, their publish checks (`./attach`), the mock products' retirement
 * (`./retire`), and stock by store code and SKU in the mock stores.
 */
import type { Payload, RequestContext } from 'payload'

import { runImportFile, type RunOptions } from '../../import/apply'
import type { ImportReport } from '../../import/types'
import { PRODUCT_COLUMNS } from '../../import/kinds'
import { attachImages, type AttachReport } from './attach'
import { loadCatalogue, mockProductSkus, mockStoreCodes } from './read'
import { retireMockProducts, type RetireReport } from './retire'
import { csvOf, productRows, stockFiles, stockRows } from './rows'
import type { CatalogueProduct } from './types'

const utf8 = (text: string) => new TextEncoder().encode(text)

export type CataloguePlan = {
  readonly products: readonly CatalogueProduct[]
  readonly productsCsv: string
  readonly stockCsvs: readonly string[]
  readonly stockRowCount: number
  readonly retireSkus: readonly string[]
}

/** Everything the layer will write, in memory: no database, no network. */
export function cataloguePlan(dir: string): CataloguePlan {
  const products = loadCatalogue(dir)
  const stock = stockRows(products, mockStoreCodes())
  return {
    products,
    productsCsv: csvOf(PRODUCT_COLUMNS, productRows(products)),
    stockCsvs: stockFiles(stock),
    stockRowCount: stock.length,
    retireSkus: mockProductSkus(),
  }
}

export type CatalogueRun = {
  readonly imports: readonly ImportReport[]
  /** Not run on a dry run (media and unpublishing cannot be rolled back): `undefined`. */
  readonly attach?: AttachReport
  readonly retire?: RetireReport
}

export async function seedCatalogue(
  payload: Payload,
  dir: string,
  options: {
    readonly dryRun: boolean
    readonly publish: boolean
    readonly runOptions: Omit<RunOptions, 'payload'>
    readonly context: RequestContext | undefined
  },
): Promise<CatalogueRun> {
  const plan = cataloguePlan(dir)
  // The products import always saves drafts: a published product needs its pictures, which only
  // `attachImages` can place with the right provenance, and it publishes afterwards.
  const base = { payload, ...options.runOptions, publish: false }
  const imports: ImportReport[] = [
    await runImportFile('products', 'shop-catalogue-products.csv', utf8(plan.productsCsv), base),
  ]
  if (options.dryRun) {
    return { imports: await withStock(imports, plan, base) }
  }
  const attach = await attachImages(payload, plan.products, {
    publish: options.publish,
    context: options.context,
  })
  // The mocks leave only on a publishing run, in the run that publishes their replacements:
  // a drafts-only run (pictures first, derivatives next) must not empty the shop meanwhile.
  const retire = options.publish
    ? await retireMockProducts(payload, plan.retireSkus, options.context)
    : undefined
  return { imports: await withStock(imports, plan, base), attach, ...(retire ? { retire } : {}) }
}

async function withStock(
  imports: ImportReport[],
  plan: CataloguePlan,
  base: RunOptions,
): Promise<ImportReport[]> {
  for (const [index, csv] of plan.stockCsvs.entries()) {
    imports.push(
      await runImportFile('stock', `shop-catalogue-stock-${index + 1}.csv`, utf8(csv), base),
    )
  }
  return imports
}

export function renderCatalogue(run: CatalogueRun): string[] {
  const lines: string[] = []
  if (run.attach) {
    const a = run.attach
    lines.push(
      `catalogue pictures: ${a.mediaCreated} media made, ${a.imagesSet} product(s) given pictures, ` +
        `${a.published} published, ${a.held.length} held`,
      ...a.held.map((line) => `  held: ${line}`),
    )
  }
  if (run.retire) {
    lines.push(
      `mock products retired: ${run.retire.retired} unpublished, ` +
        `${run.retire.alreadyRetired} already retired or absent`,
    )
  }
  return lines
}
