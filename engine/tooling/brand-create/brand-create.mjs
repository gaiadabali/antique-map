import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { scaffoldBrandConfig, scaffoldInfraNames } from './scaffold.mjs'
import { withTsRunner } from './ts-runner.mjs'

export class BrandCreateError extends Error {}

const SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
const STOREFRONTS = ['gallery', 'emporium']

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
    `# ${name} — brand folder\n\nScaffolded by \`pnpm brand:create\` (TASKS.md 2.2.h). Draft: not deployed until an\noperator turns \`draft\` off in \`site/brand.config.json\` (BRANDS.md §7).\n`,
  )
  writeFileSync(join(brandDir, 'site', 'brand.config.json'), JSON.stringify(config, null, 2) + '\n')
  writeFileSync(join(brandDir, 'site', 'assets', '.gitkeep'), '')
  writeFileSync(join(brandDir, 'site', 'copy', '.gitkeep'), '')
  writeFileSync(join(brandDir, 'content', 'seed', '.gitkeep'), '')
  return brandDir
}

/**
 * Scaffolds `<slug>/site/` for a new brand and validates the result. Once
 * `validateBrandConfigs()` exists (3.1) this should call it directly; until
 * then it validates against the C1 zod schema alone (`brandConfigSchema`),
 * which is what this ticket's brief asks for when 3.1 has not landed.
 * Rolls the folder back and throws on a validation failure, so a bad
 * scaffold never lands half-written.
 */
export async function createBrand(repoRoot, { slug, storefront, name }) {
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

  writeBrandFolder(repoRoot, slug, brandName, config)

  const validation = await withTsRunner(repoRoot, async (loadModule) => {
    const schemaPath = join(repoRoot, 'engine', 'packages', 'config', 'src', 'schema.ts')
    if (!existsSync(schemaPath)) {
      return { checked: false, success: true, issues: [] }
    }
    const { brandConfigSchema } = await loadModule(schemaPath)
    const result = brandConfigSchema.safeParse(config)
    return {
      checked: true,
      success: result.success,
      issues: result.success
        ? []
        : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    }
  })

  if (!validation.success) {
    rmSync(brandDir, { recursive: true, force: true })
    throw new BrandCreateError(
      `scaffolded config failed validation:\n${validation.issues.join('\n')}`,
    )
  }

  return {
    brandDir,
    config,
    infra: scaffoldInfraNames(slug),
    checkedAgainstSchema: validation.checked,
  }
}
