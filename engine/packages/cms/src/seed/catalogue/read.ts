/**
 * The owner's designs on disk (task 10.6.e), in `LEGACY_DATA_DIR`, never committed:
 * `old-east-indies/designs/designs.jsonl` (+ `images/<code>.jpg`) from his six catalogue PDFs, and
 * `old-east-indies/instagram/products.json` (+ `images/`) for the four designs only his Instagram
 * shows. The committed additions (`./data/additions` + `./data/images`) join them: designs the
 * PDFs do not hold, in the same shape. Where no legacy folder is found (a server), the committed
 * export of those designs (`./committed`) stands in for it. The mock shop's own sheets are read
 * here too: the stores that get stock, and the mock products that retire.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ImportError, readCsv, type Sheet } from '../../import/csv'
import { PRODUCT_COLUMNS, STORE_COLUMNS } from '../../import/kinds'
import { buildCatalogue } from './build'
import { loadCommittedDesigns } from './committed'
import { ADDITIONS } from './data/additions'
import type { CatalogueDirs, CatalogueProduct, DesignRecord, InstagramRecord } from './types'

export function catalogueDirs(dir: string): CatalogueDirs {
  return {
    designs: join(dir, 'old-east-indies', 'designs'),
    instagram: join(dir, 'old-east-indies', 'instagram'),
  }
}

function readText(path: string): string {
  if (!existsSync(path)) {
    throw new ImportError(
      `The shop designs are not on disk (${path}).`,
      'Point LEGACY_DATA_DIR at the legacy data folder that holds old-east-indies/ (docs/DATA.md §2).',
    )
  }
  return readFileSync(path, 'utf8')
}

export function loadDesigns(dirs: CatalogueDirs): DesignRecord[] {
  return readText(join(dirs.designs, 'designs.jsonl'))
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as DesignRecord)
}

export function loadInstagram(dirs: CatalogueDirs): InstagramRecord[] {
  const file = JSON.parse(readText(join(dirs.instagram, 'products.json'))) as {
    products: InstagramRecord[]
  }
  return file.products
}

/** Every picture a product needs that is not on disk, as `sku: path`. */
export function missingImages(products: readonly CatalogueProduct[]): string[] {
  return products.flatMap((product) =>
    product.images
      .filter((image) => !existsSync(image.path))
      .map((image) => `${product.sku}: ${image.path}`),
  )
}

/** The designs kept in the repo (`./data/additions`), always seeded beside the owner's. */
export function loadAdditions(): { designs: DesignRecord[]; dir: string } {
  const designs = ADDITIONS.map(({ record, image }) => ({
    ...record,
    image: { file: fileURLToPath(image) },
  }))
  // The pictures' paths are absolute: joined to an empty folder, they stay as they are.
  return { designs, dir: '' }
}

/**
 * The catalogue to seed: the owner's designs from `dir` and the committed additions — or, with no
 * `dir` (a server holds no legacy data: the admin's seed button on staging), the committed export
 * of his designs (`./committed`) and the additions.
 */
export function loadCatalogue(dir: string | null): CatalogueProduct[] {
  const dirs = catalogueDirs(dir ?? '')
  const products =
    dir === null
      ? [...loadCommittedDesigns(), ...buildCatalogue([], [], dirs, loadAdditions())]
      : buildCatalogue(loadDesigns(dirs), loadInstagram(dirs), dirs, loadAdditions())
  const missing = missingImages(products)
  if (missing.length > 0) {
    throw new ImportError(
      `${missing.length} design picture(s) are not on disk, e.g. ${missing[0]}.`,
      'Restore old-east-indies/designs/images and old-east-indies/instagram/images, then run again.',
    )
  }
  return products
}

/** The mock shop's sheets, each by a `new URL()` a bundler follows (the admin's seed screen). */
const SHOP_SHEETS = {
  stores: fileURLToPath(new URL('../shop/data/stores.csv', import.meta.url)),
  products: fileURLToPath(new URL('../shop/data/products.csv', import.meta.url)),
} as const

const column = (sheet: Sheet, name: string, only?: (cells: readonly string[]) => boolean) =>
  sheet.rows
    .filter((row) => only?.(row.cells) ?? true)
    .map((row) => row.cells[sheet.header.indexOf(name)] ?? '')
    .filter((value) => value !== '')

/** The mock stores' codes, from the committed shop mock (they get this layer's stock). */
export function mockStoreCodes(): string[] {
  return column(readCsv(SHOP_SHEETS.stores, 'stores', STORE_COLUMNS), 'store_code')
}

/** The mock products' SKUs (product rows only, not their variants): what the run retires. */
export function mockProductSkus(): string[] {
  const sheet = readCsv(SHOP_SHEETS.products, 'products', PRODUCT_COLUMNS)
  const parent = sheet.header.indexOf('parent_sku')
  return [...new Set(column(sheet, 'sku', (cells) => (cells[parent] ?? '') === ''))]
}
