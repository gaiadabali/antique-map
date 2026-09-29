import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

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
 * the way this workspace package resolves its devDependency — through the headless-Vite TS
 * runner, so the plain-Node CLI runs the real C1 rules with no build step.
 */
export async function loadValidation() {
  const entry = createRequire(import.meta.url).resolve('@engine/config/validate')
  return withTsRunner(TOOLING_REPO_ROOT, async (loadModule) => {
    const { validateBrandConfig, formatIssue } = await loadModule(entry)
    return { validateBrandConfig, formatIssue }
  })
}

/**
 * Scaffolds `<slug>/site/` for a new brand. The config is checked whole by
 * `validateBrandConfig()` (C1's schema and every rule it gives `validateBrandConfigs()`,
 * the rupiah rule included) BEFORE anything is written, so a bad scaffold never lands.
 * `modules ⊆ supports` is left to `validateBrandConfigs()` in CI, which has each app's
 * declaration (TASKS.md 4.1.c); the scaffold switches no module on.
 * `options.validation` — `{ validateBrandConfig, formatIssue }` — replaces the loaded module
 * (a test imports it directly, or plants a violation with it).
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

  const { validateBrandConfig, formatIssue } = options.validation ?? (await loadValidation())
  const result = validateBrandConfig(config, { expect: { slug, storefront: null } })
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
