import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { MODULE_KEYS } from '@engine/config/schema'
import { formatIssue, validateBrandConfig, validateBrandConfigs } from '@engine/config/validate'
import { afterEach, describe, expect, it } from 'vitest'

import { BrandCreateError, createBrand, loadValidation } from './brand-create.mjs'
import { scaffoldBrandConfig } from './scaffold.mjs'

/** The real `@engine/config/validate`, imported directly — the CLI loads the same entry through Vite. */
const validation = { validateBrandConfig, formatIssue }

/**
 * Each app's supports as C1 states them (`schema/modules.ts`, `AppSupports`) until the apps'
 * own `supports` files exist (TASKS.md 4.1.c): the gallery every module but
 * `accounts.retailers`, the emporium every module but the buyer-account ones.
 */
const omit = (...keys) => MODULE_KEYS.filter((key) => !keys.includes(key))
const SUPPORTS = {
  gallery: { storefront: 'gallery', modules: omit('accounts.retailers') },
  emporium: {
    storefront: 'emporium',
    modules: omit('accounts.buyers', 'retention.wishlist', 'retention.wantList'),
  },
}

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

describe('createBrand', () => {
  it('rejects a bad slug or storefront before writing anything', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
    await expect(
      createBrand(sandbox, { slug: 'Bad_Slug', storefront: 'gallery' }, { validation }),
    ).rejects.toThrow(BrandCreateError)
    await expect(
      createBrand(sandbox, { slug: 'fixture-x', storefront: 'nope' }, { validation }),
    ).rejects.toThrow(BrandCreateError)
  })

  it('refuses to overwrite an existing brand folder', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
    await createBrand(sandbox, { slug: 'fixture-atlas', storefront: 'gallery' }, { validation })
    await expect(
      createBrand(sandbox, { slug: 'fixture-atlas', storefront: 'gallery' }, { validation }),
    ).rejects.toThrow(/already exists/)
  })

  it('scaffolds site/, content/seed/ and a draft brand.config.json', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
    const { brandDir } = await createBrand(
      sandbox,
      { slug: 'fixture-atlas', storefront: 'emporium' },
      { validation },
    )
    expect(existsSync(join(brandDir, 'content', 'seed'))).toBe(true)
    const config = JSON.parse(readFileSync(join(brandDir, 'site', 'brand.config.json'), 'utf8'))
    expect(config.draft).toBe(true)
    expect(config.slug).toBe('fixture-atlas')
    expect(config.storefront).toBe('emporium')
    expect(config.sellers.every((seller) => seller.draft === true)).toBe(true)
  })

  it('writes nothing when the scaffold fails validation — the planted violation (2.2.i)', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
    const refuseAll = {
      validateBrandConfig: () => ({
        ok: false,
        config: null,
        issues: [{ path: ['mustHave'], message: 'Required' }],
      }),
      formatIssue,
    }
    const slug = 'fixture-atlas'
    await expect(
      createBrand(sandbox, { slug, storefront: 'gallery' }, { validation: refuseAll }),
    ).rejects.toThrow(/mustHave: Required/)
    expect(existsSync(join(sandbox, slug))).toBe(false)
  })
})

describe('the scaffold and C1 (3.3.a)', () => {
  it.each(['gallery', 'emporium'])(
    'a %s scaffold passes validateBrandConfigs() — every rule, supports included (3.3.c)',
    async (storefront) => {
      sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
      await createBrand(sandbox, { slug: 'fixture-atlas', storefront }, { validation })
      const report = validateBrandConfigs({ repoRoot: sandbox, supports: SUPPORTS })
      expect(report.text).toBe('✓ fixture-atlas/site/brand.config.json')
      expect(report.ok).toBe(true)
    },
  )

  it('satisfies the rupiah rule: an ID market in IDR, an IDR ladder and buffer, the seller charging IDR', () => {
    const { money, sellers } = scaffoldBrandConfig({
      slug: 'fixture-atlas',
      name: 'Fixture Atlas',
      storefront: 'gallery',
    })
    expect(money.markets.find((m) => m.destinations.includes('ID'))).toMatchObject({
      destinations: ['ID'],
      currency: 'IDR',
    })
    expect(money.rounding.IDR).toHaveLength(4)
    expect(money.fx.bufferPct.IDR).toBe('3')
    expect(sellers.every((seller) => seller.charge.includes('IDR'))).toBe(true)
  })

  it('is refused by validateBrandConfig() once the rupiah rule is broken — schema alone would pass it', () => {
    const config = scaffoldBrandConfig({
      slug: 'fixture-atlas',
      name: 'Fixture Atlas',
      storefront: 'gallery',
    })
    config.sellers[0].charge = ['USD']
    const result = validateBrandConfig(config)
    expect(result.ok).toBe(false)
    expect(result.issues.map(formatIssue)).toEqual([
      expect.stringMatching(/^sellers\[0\]\.charge: must include "IDR".*rupiah rule/),
    ])
  })

  it('the CLI path loads the real @engine/config/validate through the Vite runner', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
    const loaded = await loadValidation()
    expect(typeof loaded.validateBrandConfig).toBe('function')
    const { brandDir } = await createBrand(sandbox, { slug: 'fixture-cli', storefront: 'gallery' })
    expect(existsSync(join(brandDir, 'site', 'brand.config.json'))).toBe(true)
  }, 60_000)
})
