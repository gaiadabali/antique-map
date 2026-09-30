import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadSupports } from '../check-brands/supports.mjs'
import { scaffoldBrandConfig, scaffoldInfraNames } from './scaffold.mjs'
import { withTsRunner } from './ts-runner.mjs'

export class BrandCreateError extends Error {}

const SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
const STOREFRONTS = ['gallery', 'emporium']
/** The repository this tool ships in — the Vite runner's root, whatever `repoRoot` a caller scaffolds into. */
const TOOLING_REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

function titleCase(slug) {
  return slug
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

function writeBrandFolder(repoRoot, slug, name, config) {
  const brandDir = join(repoRoot, slug)
  mkdirSync(join(brandDir, 'site', 'assets'), { recursive: true })
  mkdirSync(join(brandDir, 'site', 'copy'), { recursive: true })
  mkdirSync(join(brandDir, 'content', 'seed'), { recursive: true })
  writeFileSync(
    join(brandDir, 'README.md'),
    `# ${name} — brand folder\n\nScaffolded by \`pnpm brand:create\` (TASKS.md 2.2.h). Draft: not deployed until an\noperator turns \`draft\` off in \`site/brand.config.json\` (BRANDS.md §7) — the brand's, and\neach seller's once it names a real legal entity.\n`,
  )
  writeFileSync(join(brandDir, 'site', 'brand.config.json'), JSON.stringify(config, null, 2) + '\n')
  writeFileSync(join(brandDir, 'site', 'assets', '.gitkeep'), '')
  writeFileSync(join(brandDir, 'site', 'copy', '.gitkeep'), '')
  writeFileSync(join(brandDir, 'content', 'seed', '.gitkeep'), '')
  return brandDir
}

/**
 * Loads `validateBrandConfig()` from `@engine/config/validate` — the package entry, resolved
 * the way this workspace package resolves its devDependency — and each storefront app's own
 * `supports` (`engine/apps/<app>/src/supports.ts`, the loader `check:brands` uses), through the
 * headless-Vite TS runner, so the plain-Node CLI runs the real C1 rules against the real apps
 * with no build step.
 */
export async function loadValidation() {
  const entry = createRequire(import.meta.url).resolve('@engine/config/validate')
  return withTsRunner(TOOLING_REPO_ROOT, async (loadModule) => {
    const { validateBrandConfig, formatIssue } = await loadModule(entry)
    const { supports } = await loadSupports(loadModule)
    return { validateBrandConfig, formatIssue, supports }
  })
}

/**
 * Scaffolds `<slug>/site/` for a new brand. The config is checked whole by
 * `validateBrandConfig()` (C1's schema and every rule it gives `validateBrandConfigs()`,
 * the rupiah rule included) BEFORE anything is written, so a bad scaffold never lands — and
 * checked against the chosen storefront app's real `supports` (TASKS.md 4.7.b), so a module
 * that app cannot render fails here as it would fail `check:brands`. A storefront whose app
 * declares no supports fails too: unchecked is not supported.
 * `options.validation` — `{ validateBrandConfig, formatIssue }` — and `options.supports` —
 * `{ [storefront]: AppSupports }` — replace what is loaded (a test imports them directly, or
 * plants a violation with them); whichever is missing is loaded.
 */
export async function createBrand(repoRoot, { slug, storefront, name }, options = {}) {
  if (!SLUG_PATTERN.test(slug)) {
    throw new BrandCreateError(`"${slug}" is not a valid kebab-case slug`)
  }
  if (!STOREFRONTS.includes(storefront)) {
    throw new BrandCreateError(
      `storefront must be one of ${STOREFRONTS.join(', ')}, got "${storefront}"`,
    )
  }
  const brandDir = join(repoRoot, slug)
  if (existsSync(brandDir)) {
    throw new BrandCreateError(`${slug}/ already exists`)
  }
  const brandName = name ?? titleCase(slug)
  const config = scaffoldBrandConfig({ slug, name: brandName, storefront })

  const loaded = options.validation && options.supports ? {} : await loadValidation()
  const { validateBrandConfig, formatIssue } = options.validation ?? loaded
  const supports = (options.supports ?? loaded.supports)[storefront]
  if (!supports) {
    throw new BrandCreateError(
      `the ${storefront} app declares no supports (engine/apps/<app>/src/supports.ts) to check the scaffold's modules against`,
    )
  }
  const result = validateBrandConfig(config, { supports, expect: { slug, storefront: null } })
  if (!result.ok) {
    const issues = result.issues.map(formatIssue)
    throw new BrandCreateError(`scaffolded config failed validation:\n${issues.join('\n')}`)
  }

  try {
    writeBrandFolder(repoRoot, slug, brandName, config)
  } catch (error) {
    rmSync(brandDir, { recursive: true, force: true }) // never half-written
    throw error
  }
  return { brandDir, config, infra: scaffoldInfraNames(slug) }
}
