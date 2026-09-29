import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { BrandCreateError, createBrand } from './brand-create.mjs'

const repoRoot = process.cwd() // has the real engine/packages/config/src/schema.ts

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

describe('createBrand', () => {
  it('rejects a bad slug or storefront before writing anything', async () => {
    await expect(
      createBrand(repoRoot, { slug: 'Bad_Slug', storefront: 'gallery' }),
    ).rejects.toThrow(BrandCreateError)
    await expect(createBrand(repoRoot, { slug: 'fixture-x', storefront: 'nope' })).rejects.toThrow(
      BrandCreateError,
    )
  })

  it('refuses to overwrite an existing brand folder', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
    await createBrand(sandbox, { slug: 'fixture-atlas', storefront: 'gallery' })
    await expect(
      createBrand(sandbox, { slug: 'fixture-atlas', storefront: 'gallery' }),
    ).rejects.toThrow(/already exists/)
  })

  it('scaffolds site/, content/seed/ and a draft brand.config.json, unchecked when no schema exists', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
    const { brandDir, checkedAgainstSchema } = await createBrand(sandbox, {
      slug: 'fixture-atlas',
      storefront: 'emporium',
    })
    expect(checkedAgainstSchema).toBe(false) // sandbox has no engine/packages/config
    expect(existsSync(join(brandDir, 'site', 'brand.config.json'))).toBe(true)
    expect(existsSync(join(brandDir, 'content', 'seed'))).toBe(true)
    const config = JSON.parse(readFileSync(join(brandDir, 'site', 'brand.config.json'), 'utf8'))
    expect(config.draft).toBe(true)
    expect(config.slug).toBe('fixture-atlas')
    expect(config.storefront).toBe('emporium')
  })

  it('rolls the folder back when the scaffold fails validation — the planted violation (2.2.i)', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
    const schemaDir = join(sandbox, 'engine', 'packages', 'config', 'src')
    mkdirSync(schemaDir, { recursive: true })
    // A fixture schema that rejects everything (any real scaffold included) —
    // stands in for a C1 change the scaffold has not caught up with yet. It
    // imports nothing: the sandbox is outside the repo, so `zod` resolves only
    // where a stray node_modules sits above the temp dir (a laptop, not CI).
    writeFileSync(
      join(schemaDir, 'schema.ts'),
      "export const brandConfigSchema = {\n  safeParse: () => ({\n    success: false,\n    error: { issues: [{ path: ['mustHave'], message: 'Required' }] },\n  }),\n}\n",
    )
    const slug = 'fixture-atlas'
    await expect(createBrand(sandbox, { slug, storefront: 'gallery' })).rejects.toThrow(
      BrandCreateError,
    )
    expect(existsSync(join(sandbox, slug))).toBe(false) // rolled back, not left half-written
  })

  it('scaffolds a brand that validates against the real C1 schema, in the real repo (2.2.i)', async () => {
    const slug = 'fixture-vitest-throwaway'
    rmSync(join(repoRoot, slug), { recursive: true, force: true })
    try {
      const result = await createBrand(repoRoot, { slug, storefront: 'gallery' })
      expect(result.checkedAgainstSchema).toBe(true)
      expect(existsSync(join(repoRoot, slug, 'site', 'brand.config.json'))).toBe(true)
    } finally {
      rmSync(join(repoRoot, slug), { recursive: true, force: true })
    }
  })
})
