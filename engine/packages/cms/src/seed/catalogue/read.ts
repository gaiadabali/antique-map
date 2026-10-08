/**
 * The owner's designs on disk (task 10.6.e), in `LEGACY_DATA_DIR`, never committed:
 * `old-east-indies/designs/designs.jsonl` (+ `images/<code>.jpg`) from his six catalogue PDFs, and
 * `old-east-indies/instagram/products.json` (+ `images/`) for the four designs only his Instagram
 * shows. The mock shop's own sheets are read here too: the stores that get stock, and the mock
 * products that retire.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ImportError, readCsv, type Sheet } from '../../import/csv'
import { PRODUCT_COLUMNS, STORE_COLUMNS } from '../../import/kinds'
import { buildCatalogue } from './build'
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

export function loadCatalogue(dir: string): CatalogueProduct[] {
  const dirs = catalogueDirs(dir)
  const products = buildCatalogue(loadDesigns(dirs), loadInstagram(dirs), dirs)
  const missing = missingImages(products)
  if (missing.length > 0) {
    throw new ImportError(
      `${missing.length} design picture(s) are not on disk, e.g. ${missing[0]}.`,
      'Restore old-east-indies/designs/images and old-east-indies/instagram/images, then run again.',
    )
  }
  return products
}

const shopSheet = (file: string) => fileURLToPath(new URL(`../shop/data/${file}`, import.meta.url))

const column = (sheet: Sheet, name: string, only?: (cells: readonly string[]) => boolean) =>
  sheet.rows
    .filter((row) => only?.(row.cells) ?? true)
    .map((row) => row.cells[sheet.header.indexOf(name)] ?? '')
    .filter((value) => value !== '')

/** The mock stores' codes, from the committed shop mock (they get this layer's stock). */
export function mockStoreCodes(): string[] {
  return column(readCsv(shopSheet('stores.csv'), 'stores', STORE_COLUMNS), 'store_code')
}

/** The mock products' SKUs (product rows only, not their variants): what the run retires. */
export function mockProductSkus(): string[] {
  const sheet = readCsv(shopSheet('products.csv'), 'products', PRODUCT_COLUMNS)
  const parent = sheet.header.indexOf('parent_sku')
  return [...new Set(column(sheet, 'sku', (cells) => (cells[parent] ?? '') === ''))]
}
