// Builds the banned-term list from data on disk — never as a string literal
// here, because this file lives under `engine/` and would fail its own scan
// (CONVENTIONS.md §1: "no file under `engine/` … may contain a brand's slug,
// name or domain as a literal"). A brand folder is `<slug>/README.md` +
// `site/` + `content/` (BRANDS.md §2); `test` is the synthetic brand and is
// never banned (CONVENTIONS.md §1).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

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

/** Real brand slugs at `repoRoot` — every brand folder but the synthetic `test` one. */
export function discoverRealBrands(repoRoot) {
  return readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith('.') && !INFRA_DIRS.has(entry.name))
    .filter((entry) => existsSync(join(repoRoot, entry.name, 'README.md')))
    .map((entry) => entry.name)
    .filter((slug) => slug !== 'test')
    .sort()
}

/** Title-cases a `kebab-case` slug into its plain-English name (`a-b` → `A B`). */
function titleCaseSlug(slug) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * A brand's config, once `site/brand.config.json` exists (0.6.d / 3.1); until
 * then this returns `null` and the caller falls back to what the folder alone
 * tells us (the slug and its derived name), reporting the gap rather than
 * guessing at a domain.
 */
function readBrandConfig(repoRoot, slug) {
  const configPath = join(repoRoot, slug, 'site', 'brand.config.json')
  if (!existsSync(configPath)) return null
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'))
  } catch {
    return null // an unparsable config is 2.2.g's problem, not this gate's
  }
}

/**
 * `{ terms, gaps }` — `terms` is every banned literal (slug, derived name,
 * and, once configured, `name` and every domain); `gaps` lists brands whose
 * config does not exist yet, so their domains cannot be checked.
 */
export function collectBannedTerms(repoRoot) {
  const terms = new Set()
  const gaps = []
  for (const slug of discoverRealBrands(repoRoot)) {
    terms.add(slug)
    terms.add(titleCaseSlug(slug))
    const config = readBrandConfig(repoRoot, slug)
    if (config === null) {
      gaps.push(slug)
      continue
    }
    if (typeof config.slug === 'string') terms.add(config.slug)
    if (typeof config.name === 'string') terms.add(config.name)
    const domains = config.domains ?? {}
    for (const value of Object.values(domains)) {
      if (typeof value === 'string' && value.length > 0) terms.add(value)
    }
  }
  return { terms: [...terms].sort(), gaps }
}
