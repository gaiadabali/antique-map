/**
 * Where this process's brand lives (DEPLOYMENT.md §8). `BRAND` names the brand; `BRAND_ROOT`
 * is its folder as shipped in the artifact — config, copy and assets (BRANDS.md §2). Brand
 * identity is runtime configuration, read here at boot and never baked into a build.
 *
 * The config is `<BRAND_ROOT>/site/brand.config.json`, or, in a brand folder that keeps one
 * config per storefront (the synthetic brand, which runs on both apps), the file
 * `TEST_STOREFRONT` names: `brand.gallery.json` or `brand.emporium.json` (CONVENTIONS.md §1).
 *
 * A relative `BRAND_ROOT` — `./test` in `.env.example` — is resolved against the working
 * directory and then each of its ancestors, so the same value works from the repository root
 * and from an app's folder; unset, the brand folder is found the same way by `BRAND`'s name.
 */
import { existsSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'

import { STOREFRONTS, type Storefront } from '../schema'

/** `process.env`, or any record standing in for it. */
export type BrandEnv = Readonly<Record<string, string | undefined>>

/** A brand config that cannot be found, read or trusted. Its message names what to fix. */
export class BrandConfigError extends Error {
  override readonly name = 'BrandConfigError'
}

export type BrandPaths = {
  /** `BRAND`: the brand's slug. */
  readonly brand: string
  /** The brand folder, absolute. */
  readonly brandRoot: string
  readonly siteDir: string
  /** The one config file this process runs on. */
  readonly configFile: string
  /** `site/copy/`: the EN/ID values for every message key the app defines (`@engine/i18n`). */
  readonly copyDir: string
  /** `site/assets/`: served at `/brand-assets/…` (C13). */
  readonly assetsDir: string
  /** The storefront `TEST_STOREFRONT` chose, in a per-storefront brand folder; else `null`. */
  readonly perStorefront: Storefront | null
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function resolveBrandPaths(
  env: BrandEnv = process.env,
  cwd: string = process.cwd(),
): BrandPaths {
  const brand = env.BRAND?.trim() ?? ''
  if (brand === '') {
    throw new BrandConfigError(
      'BRAND is not set: name the brand folder this process serves, e.g. BRAND=test (DEPLOYMENT.md §8)',
    )
  }
  if (!SLUG.test(brand)) {
    throw new BrandConfigError(`BRAND "${brand}" is not a kebab-case brand slug`)
  }
  const brandRoot = findBrandRoot(brand, env.BRAND_ROOT?.trim() || undefined, cwd)
  const siteDir = join(brandRoot, 'site')
  const single = join(siteDir, 'brand.config.json')
  const base = {
    brand,
    brandRoot,
    siteDir,
    copyDir: join(siteDir, 'copy'),
    assetsDir: join(siteDir, 'assets'),
  }
  if (existsSync(single)) return { ...base, configFile: single, perStorefront: null }

  const chosen = env.TEST_STOREFRONT?.trim() ?? ''
  const storefront = STOREFRONTS.find((each) => each === chosen)
  if (!storefront) {
    throw new BrandConfigError(
      chosen === ''
        ? `${siteDir} has no brand.config.json; a brand with one config per storefront needs TEST_STOREFRONT=${STOREFRONTS.join('|')}`
        : `TEST_STOREFRONT "${chosen}" is not a storefront (${STOREFRONTS.join(', ')})`,
    )
  }
  const configFile = join(siteDir, `brand.${storefront}.json`)
  if (!existsSync(configFile)) {
    throw new BrandConfigError(`${configFile} does not exist (TEST_STOREFRONT=${storefront})`)
  }
  return { ...base, configFile, perStorefront: storefront }
}

function findBrandRoot(brand: string, brandRoot: string | undefined, cwd: string): string {
  if (brandRoot !== undefined && isAbsolute(brandRoot)) {
    if (isSite(brandRoot)) return brandRoot
    throw new BrandConfigError(`BRAND_ROOT ${brandRoot} has no site/ folder (BRANDS.md §2)`)
  }
  const relativePath = brandRoot ?? brand
  for (const ancestor of ancestors(cwd)) {
    const candidate = resolve(ancestor, relativePath)
    if (isSite(candidate)) return candidate
  }
  const what = brandRoot === undefined ? `a "${brand}" brand folder` : `BRAND_ROOT "${brandRoot}"`
  throw new BrandConfigError(
    `cannot find ${what} with a site/ folder from ${cwd} or any folder above it; set BRAND_ROOT to the brand folder`,
  )
}

function isSite(folder: string): boolean {
  const site = join(folder, 'site')
  return existsSync(site) && statSync(site).isDirectory()
}

function ancestors(from: string): string[] {
  const all = [resolve(from)]
  for (let parent = dirname(all[0]!); parent !== all.at(-1); parent = dirname(parent))
    all.push(parent)
  return all
}
