// The contexts `check:generated` runs every generator in (ARCHITECTURE.md §2,
// TASKS.md 3.5.b): `BRAND` unset — what the SCH lead generates with — then once
// per brand folder on disk, and once per storefront for a brand that keeps one
// config per storefront (`TEST_STOREFRONT`). Brands are discovered, never named
// (CONVENTIONS.md §1), so a new brand folder is checked with no code change.
//
// Each context's environment is built on purpose, not inherited: the child sees
// no DATABASE_URL (a generator never touches a database, CONVENTIONS.md §12), no
// PAYLOAD_SECRET (the scripts set a placeholder; `generate:types` needs none),
// no dev push or boot-migration switch, and a brand only through the three
// variables below — BRAND_ROOT absolute, since the Payload CLI runs from the CMS
// package's folder and reads no repo-root `.env.local`.
import { join } from 'node:path'

import { brandLayout, discoverBrands } from '../db/brands.mjs'
import { withoutKeys } from '../db/pnpm.mjs'

/** Everything a parent shell may carry that could reach a database or shape the config. */
export const WITHHELD_KEYS = [
  'BRAND',
  'BRAND_ROOT',
  'TEST_STOREFRONT',
  'DATABASE_URL',
  'PAYLOAD_SECRET',
  'PAYLOAD_DEV_PUSH',
  'RUN_MIGRATIONS',
  'PAYLOAD_TS_OUTPUT_PATH',
  'ROOT_DIR',
  'PGHOST',
  'PGPORT',
  'PGUSER',
  'PGPASSWORD',
  'PGDATABASE',
]

/**
 * `[{ label, brandEnv, problem? }]`, `BRAND` unset first. `problem` marks a brand
 * folder with no config the loader could read, so its generators report it.
 */
export function brandContexts(repoRoot) {
  const contexts = [{ label: 'BRAND unset', brandEnv: {} }]
  for (const brand of discoverBrands(repoRoot)) {
    const base = { BRAND: brand, BRAND_ROOT: join(repoRoot, brand) }
    const { single, storefronts } = brandLayout(repoRoot, brand)
    if (single) {
      contexts.push({ label: `BRAND=${brand}`, brandEnv: base })
    } else if (storefronts.length > 0) {
      for (const storefront of storefronts) {
        contexts.push({
          label: `BRAND=${brand} TEST_STOREFRONT=${storefront}`,
          brandEnv: { ...base, TEST_STOREFRONT: storefront },
        })
      }
    } else {
      contexts.push({
        label: `BRAND=${brand}`,
        brandEnv: base,
        problem: `${brand}/site has no brand.config.json and no brand.<storefront>.json`,
      })
    }
  }
  return contexts
}

/** The child's environment for `context`: this process's, minus WITHHELD_KEYS, plus its brand. */
export function contextEnv(context, parentEnv = process.env) {
  return { ...withoutKeys(parentEnv, WITHHELD_KEYS), ...context.brandEnv }
}
