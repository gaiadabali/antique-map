/**
 * `loadBrandConfig()` — the brand config this process runs on (TASKS.md 3.1.a), found from
 * `BRAND` / `BRAND_ROOT` (`./paths`), parsed by the C1 schema and checked by the same rules CI
 * runs (`validateBrandConfig()`), so a config that loads is one CI would pass. It reads one
 * file and never a database: the proxy calls it on every request (memoised per process — a
 * config change is a deploy and a restart, BRANDS.md §3), and so does the Payload config for
 * the few settings `BRAND` may shape (ARCHITECTURE.md §2). Editorial floors merge with the
 * CMS globals in `./globals`.
 *
 * Nothing here runs at import: the build has no brand (CONVENTIONS.md §12), and importing a
 * module that uses this must never throw for want of one.
 */
import type { AppSupports, BrandConfig } from '../schema'
import { readConfigJson } from '../validate/committed'
import { formatIssue } from '../validate/issues'
import { validateBrandConfig } from '../validate/validate'
import { BrandConfigError, resolveBrandPaths, type BrandEnv, type BrandPaths } from './paths'

export type LoadOptions = {
  readonly env?: BrandEnv
  readonly cwd?: string
  /** The app's `supports` (TASKS.md 4.1.c): given, a module the app cannot render refuses to load. */
  readonly supports?: AppSupports
  /** Bypass the per-process memo (tests; a CLI that reads twice). */
  readonly fresh?: boolean
}

export type LoadedBrand = { readonly config: BrandConfig; readonly paths: BrandPaths }

const memo = new Map<string, LoadedBrand>()

/** The config and where it came from. Throws `BrandConfigError` naming the file and each field. */
export function loadBrand(options: LoadOptions = {}): LoadedBrand {
  const paths = resolveBrandPaths(options.env ?? process.env, options.cwd ?? process.cwd())
  const key = `${paths.configFile}\u0000${options.supports?.storefront ?? ''}`
  const cached = options.fresh ? undefined : memo.get(key)
  if (cached) return cached
  const loaded = { config: readBrandConfig(paths, options.supports), paths }
  memo.set(key, loaded)
  return loaded
}

/** The brand config this process runs on, defaults applied. */
export function loadBrandConfig(options: LoadOptions = {}): BrandConfig {
  return loadBrand(options).config
}

function readBrandConfig(paths: BrandPaths, supports: AppSupports | undefined): BrandConfig {
  const read = readConfigJson(paths.configFile)
  if ('issue' in read) throw new BrandConfigError(`${paths.configFile} ${read.issue.message}`)
  const result = validateBrandConfig(read.value, {
    supports,
    expect: { slug: paths.brand, storefront: paths.perStorefront },
  })
  if (!result.ok) {
    const lines = result.issues.map((issue) => `  ${formatIssue(issue)}`)
    throw new BrandConfigError(
      [`${paths.configFile} is not a valid brand config (BRAND=${paths.brand}):`, ...lines].join(
        '\n',
      ),
    )
  }
  return result.config
}
