/**
 * The shop's seed layers (DATA.md §2, PLAN-V2 §4.4), one call each — `seedShopLayer`:
 *
 * - `vocabulary` — the categories and the settings' defaults (`./vocabulary/seed`);
 * - `shop` — the mock shop's four sheets (`./shop/data`): 80 products as drafts, 120 stores, their
 *   stock and the welcome discount, each through the shop's import (`../import`);
 * - `shop-catalogue` — the owner's 156 designs (`./catalogue/layer`), from `LEGACY_DATA_DIR` where
 *   this machine holds it, else from the committed export; their pictures uploaded to the media
 *   storage the config names (the shop's bucket, or local disk without one) and, with `publish`,
 *   published, the mock products retired;
 * - `pictures` — the web sizes of every picture not yet `ready` (`./derivatives`).
 *
 * Every write is the importer's or a key-matched upsert, so seeding twice is a no-op. The layers
 * run on today's one CMS too (`@engine/cms`'s seed delegates its shop layers here) — the shop's
 * import kinds are the same handlers there. The pages are the storefront's (`./cli`'s header).
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ImportReport } from '@engine/cms-core/import/types'
import type { Payload } from 'payload'

import { runShopImportPath, type ShopRunOptions } from '../import'
import { renderCatalogue, seedCatalogue, type CatalogueRun } from './catalogue/layer'
import { mockProductSkus } from './catalogue/read'
import { mockProductsRetired } from './catalogue/retire'
import { derivePending, type DerivativesReport } from './derivatives'
import { seedShopVocabulary, type ShopVocabularyReport } from './vocabulary/seed'

export const SHOP_SEED_LAYERS = ['vocabulary', 'shop', 'shop-catalogue', 'pictures'] as const
export type ShopSeedLayer = (typeof SHOP_SEED_LAYERS)[number]

export type ShopSeedOptions = {
  readonly payload: Payload
  readonly dryRun?: boolean
  readonly publish?: boolean
  /** The CLI's cache collector context (`@engine/cms-core/import/cli-cache`). */
  readonly context?: ShopRunOptions['context']
}

export type ShopSeedRun = {
  readonly layer: ShopSeedLayer
  readonly vocabulary?: ShopVocabularyReport
  readonly imports: readonly ImportReport[]
  readonly catalogue?: CatalogueRun
  readonly pictures?: DerivativesReport
  /** Why a sheet was left out, one line each. */
  readonly notes?: readonly string[]
}

/** The mock shop's sheets, each by a `new URL()` a bundler follows (the admin's seed screen). */
const SHOP_FILES = {
  products: new URL('./shop/data/products.csv', import.meta.url),
  stores: new URL('./shop/data/stores.csv', import.meta.url),
  stock: new URL('./shop/data/stock.csv', import.meta.url),
  discounts: new URL('./shop/data/discounts.csv', import.meta.url),
} as const

export const shopSeedFile = (kind: keyof typeof SHOP_FILES) => fileURLToPath(SHOP_FILES[kind])

/**
 * The mock shop's four sheets, in the order their keys need: products, stores, stock, discounts —
 * the products left out once the catalogue has retired them all (`mockProductsRetired`), so a
 * second whole seed changes nothing.
 */
export async function seedMockShop(
  payload: Payload,
  runOptions: Omit<ShopRunOptions, 'payload'>,
): Promise<ImportReport[]> {
  const imports: ImportReport[] = []
  const retired = await mockProductsRetired(payload, mockProductSkus(), runOptions.context)
  const kinds = ['products', 'stores', 'stock', 'discounts'] as const
  for (const kind of kinds.filter((kind) => !(retired && kind === 'products'))) {
    imports.push(await runShopImportPath(kind, shopSeedFile(kind), { payload, ...runOptions }))
  }
  return imports
}

/**
 * The legacy data folder when this machine has one (`LEGACY_DATA_DIR`, else `indies-legacy-data`
 * beside the repo, as the gallery's seed looks); `null` on a server, which never does — the
 * committed export stands in for it.
 */
export function catalogueDir(
  env: Readonly<Record<string, string | undefined>> = process.env,
  here: string | undefined = import.meta.dirname,
) {
  // Inside the built server (the admin's seed button) `import.meta.dirname` names no folder: there
  // is then no sibling folder to look in, and the committed export stands in.
  const candidates = [
    ...(env.LEGACY_DATA_DIR ? [env.LEGACY_DATA_DIR] : []),
    ...(typeof here === 'string'
      ? [resolve(here, '..', '..', '..', '..', '..', '..', 'indies-legacy-data')]
      : []),
  ]
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

export async function seedShopLayer(
  layer: ShopSeedLayer,
  options: ShopSeedOptions,
): Promise<ShopSeedRun> {
  const { payload, dryRun = false, publish = false, context } = options
  const runOptions = { runner: 'seed', dryRun, publish, context }
  if (layer === 'vocabulary') {
    const vocabulary = await seedShopVocabulary(payload, context, { publish: publish && !dryRun })
    return { layer, vocabulary, imports: [] }
  }
  if (layer === 'shop') {
    const imports = await seedMockShop(payload, runOptions)
    const notes =
      imports.length === 3
        ? ['products.csv — left out: the catalogue has retired every mock product (kept retired)']
        : []
    return { layer, imports, notes }
  }
  if (layer === 'shop-catalogue') {
    const catalogue = await seedCatalogue(payload, catalogueDir(), {
      dryRun,
      publish,
      runOptions,
      context,
    })
    return { layer, imports: catalogue.imports, catalogue }
  }
  if (dryRun) return { layer, imports: [] }
  return { layer, imports: [], pictures: await derivePending(payload, context) }
}

/** The layers `pnpm data:seed --app shop` runs with no `--layer`, in order. */
export const SHOP_SEED_ALL: readonly ShopSeedLayer[] = [
  'vocabulary',
  'shop',
  'shop-catalogue',
  'pictures',
]

export { renderCatalogue }
