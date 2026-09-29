/**
 * `validateBrandConfigs()` — CI's check of EVERY committed brand config (BRANDS.md §3, §6).
 * A brand folder is a top-level folder with a `site/` (BRANDS.md §2). It holds one
 * `brand.config.json`, or — the synthetic brand, which runs on both apps — one config per
 * storefront, `brand.<storefront>.json`. Each file is read, parsed and checked against the app
 * it names, and each finding names the file and the field.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import { STOREFRONTS, type AppSupports, type Storefront } from '../schema'
import { formatIssue, type ConfigIssue } from './issues'
import { validateBrandConfig } from './validate'

/** Top-level folders that are never a brand. */
const NOT_BRANDS = new Set(['engine', 'docs', 'scripts', 'node_modules', 'tests'])
const SINGLE = 'brand.config.json'
const PER_STOREFRONT = /^brand\.([a-z]+)\.json$/

export type BrandConfigFile = {
  /** Absolute path. */
  readonly file: string
  /** Relative to the repository root, with forward slashes: what a report prints. */
  readonly name: string
  /** The folder's name, which is the brand's slug. */
  readonly brand: string
  /** The storefront a per-storefront file's name gives; `null` for `brand.config.json`. */
  readonly storefront: Storefront | null
}

export type BrandConfigResult = BrandConfigFile & { readonly issues: readonly ConfigIssue[] }

export type BrandConfigsReport = {
  readonly ok: boolean
  readonly results: readonly BrandConfigResult[]
  /** One line per file, then one indented line per issue. */
  readonly text: string
}

export type SupportsByApp = Readonly<Partial<Record<Storefront, AppSupports>>>

/** Every brand folder's config files, sorted; a folder with a `site/` and no config is one too. */
export function discoverBrandConfigs(repoRoot: string): (BrandConfigFile | BrandConfigResult)[] {
  const found: (BrandConfigFile | BrandConfigResult)[] = []
  for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || NOT_BRANDS.has(entry.name)) continue
    const site = join(repoRoot, entry.name, 'site')
    if (!existsSync(site) || !statSync(site).isDirectory()) continue
    const files = readdirSync(site).filter((file) => file === SINGLE || PER_STOREFRONT.test(file))
    const at = (file: string) => {
      const path = join(site, file)
      return {
        file: path,
        name: relative(repoRoot, path).split(/[\\/]/).join('/'),
        brand: entry.name,
      }
    }
    if (files.length === 0) {
      const issue = { path: [], message: `the brand folder has no ${SINGLE}` }
      found.push({ ...at(SINGLE), storefront: null, issues: [issue] })
      continue
    }
    for (const file of files.sort()) {
      const named = PER_STOREFRONT.exec(file)?.[1]
      const storefront = STOREFRONTS.find((each) => each === named) ?? null
      const place = { ...at(file), storefront }
      if (file !== SINGLE && storefront === null) {
        found.push({
          ...place,
          issues: [
            { path: [], message: `"${named}" is not a storefront (${STOREFRONTS.join(', ')})` },
          ],
        })
      } else if (file !== SINGLE && files.includes(SINGLE)) {
        found.push({
          ...place,
          issues: [
            {
              path: [],
              message: `sits beside ${SINGLE}: a brand has one config, or one per storefront`,
            },
          ],
        })
      } else {
        found.push(place)
      }
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name))
}

/** Reads a config file as JSON; a file that is not JSON is an issue, never a throw. */
export function readConfigJson(file: string): { value: unknown } | { issue: ConfigIssue } {
  try {
    return { value: JSON.parse(readFileSync(file, 'utf8')) as unknown }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return { issue: { path: [], message: `cannot be read as JSON: ${reason}` } }
  }
}

/**
 * Checks every committed brand config against the app it names. `supports` is each app's own
 * declaration (TASKS.md 4.1.c): a storefront with none fails its configs, because a module the
 * app cannot render would otherwise pass unnoticed.
 */
export function validateBrandConfigs(options: {
  readonly repoRoot: string
  readonly supports: SupportsByApp
}): BrandConfigsReport {
  const results = discoverBrandConfigs(options.repoRoot).map((place): BrandConfigResult => {
    if ('issues' in place) return place
    const read = readConfigJson(place.file)
    if ('issue' in read) return { ...place, issues: [read.issue] }
    const storefront = storefrontOf(read.value)
    const supports = storefront ? options.supports[storefront] : undefined
    const result = validateBrandConfig(read.value, {
      supports,
      expect: { slug: place.brand, storefront: place.storefront },
    })
    const missing =
      result.config && !supports
        ? [
            {
              path: ['storefront'],
              message: `the ${result.config.storefront} app declares no supports to check modules against`,
            },
          ]
        : []
    return { ...place, issues: [...result.issues, ...missing] }
  })
  const ok = results.length > 0 && results.every((result) => result.issues.length === 0)
  return { ok, results, text: formatReport(results) }
}

export function formatReport(results: readonly BrandConfigResult[]): string {
  if (results.length === 0) return '✗ no brand config found'
  return results
    .map((result) =>
      result.issues.length === 0
        ? `✓ ${result.name}`
        : [`✗ ${result.name}`, ...result.issues.map((issue) => `    ${formatIssue(issue)}`)].join(
            '\n',
          ),
    )
    .join('\n')
}

function storefrontOf(value: unknown): Storefront | null {
  const named =
    typeof value === 'object' && value !== null
      ? (value as { storefront?: unknown }).storefront
      : null
  return STOREFRONTS.find((each) => each === named) ?? null
}
