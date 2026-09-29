// Discovers brand slugs from the brand folders on disk (BRANDS.md §2) instead
// of naming them: no file under engine/ may contain a brand's slug as a
// literal (CONVENTIONS.md §1), so the list a `--brand` value is checked
// against is read from the filesystem, never written here. `brand:create`
// (TASKS.md 2.2.h) adds a folder; this picks it up with no code change.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Top-level directories that are infrastructure, never a brand folder — a
// brand folder is `<slug>/README.md` + `site/` + `content/` (BRANDS.md §2).
// This is a denylist of repo scaffolding, not of brand names, so it never
// changes when a brand is added, renamed or removed.
const INFRA_DIRS = new Set([
  'engine',
  'docs',
  'scripts',
  'node_modules',
  'dist',
  'coverage',
  'test-results',
  'playwright-report',
])

/** Every brand folder's slug at `repoRoot`, sorted — a directory that is not denylisted and holds a `README.md`. */
export function discoverBrands(repoRoot) {
  return readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith('.') && !INFRA_DIRS.has(entry.name))
    .filter((entry) => existsSync(join(repoRoot, entry.name, 'README.md')))
    .map((entry) => entry.name)
    .sort()
}

const SINGLE_CONFIG = 'brand.config.json'
const PER_STOREFRONT = /^brand\.([a-z][a-z0-9-]*)\.json$/

/**
 * How a brand folder keeps its config (`@engine/config/loader`'s rule, BRANDS.md
 * §2): one `site/brand.config.json`, or one `site/brand.<storefront>.json` per
 * storefront (the synthetic brand, which runs on both apps, chosen by
 * `TEST_STOREFRONT`). `{ single, storefronts }`: `storefronts` is read from the
 * file names, sorted, and empty for a single-config brand; `single` is false
 * and `storefronts` empty for a folder with no config at all.
 */
export function brandLayout(repoRoot, brand) {
  const site = join(repoRoot, brand, 'site')
  if (existsSync(join(site, SINGLE_CONFIG))) return { single: true, storefronts: [] }
  if (!existsSync(site)) return { single: false, storefronts: [] }
  const storefronts = readdirSync(site)
    .map((name) => PER_STOREFRONT.exec(name)?.[1])
    .filter((name) => name !== undefined && name !== 'config')
    .sort()
  return { single: false, storefronts }
}
