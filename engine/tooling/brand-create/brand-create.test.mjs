import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { formatIssue, validateBrandConfig, validateBrandConfigs } from '@engine/config/validate'
import { afterEach, describe, expect, it } from 'vitest'

import { supports as emporium } from '../../apps/emporium/src/supports.ts'
import { supports as gallery } from '../../apps/gallery/src/supports.ts'
import { BrandCreateError, createBrand, loadValidation } from './brand-create.mjs'
import { scaffoldBrandConfig } from './scaffold.mjs'

/** The real `@engine/config/validate`, imported directly — the CLI loads the same entry through Vite. */
const validation = { validateBrandConfig, formatIssue }

/**
 * Each app's own `supports` (`engine/apps/<app>/src/supports.ts`, TASKS.md 4.1.c), imported
 * directly — the CLI loads the same files through Vite (4.7.b) — never a list of this test's own.
 */
const SUPPORTS = { gallery, emporium }
const real = { validation, supports: SUPPORTS }

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

describe('createBrand', () => {
  it('rejects a bad slug or storefront before writing anything', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
    await expect(
      createBrand(sandbox, { slug: 'Bad_Slug', storefront: 'gallery' }, real),
    ).rejects.toThrow(BrandCreateError)
    await expect(
      createBrand(sandbox, { slug: 'fixture-x', storefront: 'nope' }, real),
    ).rejects.toThrow(BrandCreateError)
  })

  it('refuses to overwrite an existing brand folder', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
    await createBrand(sandbox, { slug: 'fixture-atlas', storefront: 'gallery' }, real)
    await expect(
      createBrand(sandbox, { slug: 'fixture-atlas', storefront: 'gallery' }, real),
    ).rejects.toThrow(/already exists/)
  })

  it('scaffolds site/, content/seed/ and a draft brand.config.json', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
    const { brandDir } = await createBrand(
      sandbox,
      { slug: 'fixture-atlas', storefront: 'emporium' },
      real,
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
      createBrand(
        sandbox,
        { slug, storefront: 'gallery' },
        { validation: refuseAll, supports: SUPPORTS },
      ),
    ).rejects.toThrow(/mustHave: Required/)
    expect(existsSync(join(sandbox, slug))).toBe(false)
  })
})

describe('the scaffold and C1 (3.3.a)', () => {
  it.each(['gallery', 'emporium'])(
    'a %s scaffold passes validateBrandConfigs() — every rule, supports included (3.3.c)',
    async (storefront) => {
      sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
      await createBrand(sandbox, { slug: 'fixture-atlas', storefront }, real)
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

  it('the CLI path loads the real @engine/config/validate and the apps’ supports through the Vite runner', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
    const loaded = await loadValidation()
    expect(typeof loaded.validateBrandConfig).toBe('function')
    expect(loaded.supports).toEqual({
      gallery: { storefront: 'gallery', modules: [...gallery.modules] },
      emporium: { storefront: 'emporium', modules: [...emporium.modules] },
    })
    const { brandDir } = await createBrand(sandbox, { slug: 'fixture-cli', storefront: 'gallery' })
    expect(existsSync(join(brandDir, 'site', 'brand.config.json'))).toBe(true)
  }, 60_000)
})

describe('the scaffold against its app’s real supports (4.7.b)', () => {
  it.each(['gallery', 'emporium'])(
    'hands validateBrandConfig() the %s app’s own supports',
    async (storefront) => {
      sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
      const seen = []
      const spy = {
        validateBrandConfig: (config, options) => {
          seen.push(options)
          return validateBrandConfig(config, options)
        },
        formatIssue,
      }
      await createBrand(
        sandbox,
        { slug: 'fixture-atlas', storefront },
        { ...real, validation: spy },
      )
      expect(seen).toEqual([
        { supports: SUPPORTS[storefront], expect: { slug: 'fixture-atlas', storefront: null } },
      ])
    },
  )

  it('fails, writing nothing, when the chosen app declares no supports', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
    const only = { validation, supports: { emporium } }
    await expect(
      createBrand(sandbox, { slug: 'fixture-atlas', storefront: 'gallery' }, only),
    ).rejects.toThrow(/the gallery app declares no supports/)
    expect(existsSync(join(sandbox, 'fixture-atlas'))).toBe(false)
  })

  it('fails, writing nothing, when the supports it is given are another app’s — the real rule runs', async () => {
    sandbox = mkdtempSync(join(tmpdir(), 'bc-'))
    const crossed = { validation, supports: { gallery: emporium } }
    await expect(
      createBrand(sandbox, { slug: 'fixture-atlas', storefront: 'gallery' }, crossed),
    ).rejects.toThrow(
      /storefront: is "gallery", but was checked against the emporium app's supports/,
    )
    expect(existsSync(join(sandbox, 'fixture-atlas'))).toBe(false)
  })

  it('refuses a module the app cannot render, as the scaffold would if it switched one on', () => {
    // The scaffold turns no module on, so the rule is shown on its config with one switched on.
    const config = scaffoldBrandConfig({
      slug: 'fixture-atlas',
      name: 'Fixture Atlas',
      storefront: 'emporium',
    })
    config.modules = { 'accounts.buyers': true }
    const result = validateBrandConfig(config, { supports: SUPPORTS.emporium })
    expect(result.issues.map(formatIssue)).toEqual([
      expect.stringMatching(
        /^modules\['accounts\.buyers'\]: is on, but the emporium app cannot render it/,
      ),
    ])
  })
})
