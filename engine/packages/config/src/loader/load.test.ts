import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { hasModule } from '../schema'
import {
  C1_STATED_SUPPORTS,
  REPO_ROOT,
  testBrandConfig,
  testEnv,
} from '../validate/testing/fixtures'
import { BrandConfigError, loadBrand, loadBrandConfig, resolveBrandPaths } from './index'

let sandbox: string | undefined
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** A throwaway brand folder holding `files` under `site/`. */
function brandFolder(slug: string, files: Record<string, unknown>): string {
  sandbox = mkdtempSync(join(tmpdir(), 'brand-'))
  const site = join(sandbox, slug, 'site')
  mkdirSync(site, { recursive: true })
  for (const [name, value] of Object.entries(files)) {
    writeFileSync(join(site, name), typeof value === 'string' ? value : JSON.stringify(value))
  }
  return sandbox
}

describe('loadBrandConfig() — BRAND, BRAND_ROOT, TEST_STOREFRONT (3.1.a)', () => {
  it('BRAND=test TEST_STOREFRONT=gallery loads the gallery config and validates it against the app', () => {
    const { config, paths } = loadBrand({
      env: testEnv('gallery'),
      cwd: REPO_ROOT,
      supports: C1_STATED_SUPPORTS.gallery,
      fresh: true,
    })
    expect(paths.configFile.replace(/\\/g, '/')).toMatch(/\/test\/site\/brand\.gallery\.json$/)
    expect(paths.perStorefront).toBe('gallery')
    expect(paths.copyDir.replace(/\\/g, '/')).toMatch(/\/test\/site\/copy$/)
    expect(config.slug).toBe('test')
    expect(config.storefront).toBe('gallery')
    expect(config.commerce.ttl.checkoutLockMinutes).toBe(15) // defaults applied
    expect(hasModule(config, 'accounts.retailers')).toBe(false)
  })

  it('TEST_STOREFRONT=emporium picks the other file, with a non-English default locale', () => {
    const config = loadBrandConfig({
      env: testEnv('emporium'),
      cwd: REPO_ROOT,
      supports: C1_STATED_SUPPORTS.emporium,
      fresh: true,
    })
    expect(config.storefront).toBe('emporium')
    expect(config.locales.default).toBe('id')
  })

  it("resolves a relative BRAND_ROOT from an app's folder as from the repository root", () => {
    const cwd = join(REPO_ROOT, 'engine', 'apps', 'gallery')
    const fromApp = resolveBrandPaths(testEnv('gallery'), cwd)
    const fromRoot = resolveBrandPaths(testEnv('gallery'), REPO_ROOT)
    expect(fromApp.configFile).toBe(fromRoot.configFile)
    // Unset, the folder is found by BRAND's own name.
    const byName = resolveBrandPaths({ BRAND: 'test', TEST_STOREFRONT: 'gallery' }, cwd)
    expect(byName.configFile).toBe(fromRoot.configFile)
  })

  it('memoises per process, so the proxy reads the file once', () => {
    const options = { env: testEnv('gallery'), cwd: REPO_ROOT }
    expect(loadBrandConfig(options)).toBe(loadBrandConfig(options))
  })

  it('refuses a missing BRAND, a missing or unknown TEST_STOREFRONT, and an unknown brand', () => {
    const load = (env: Record<string, string>) => () =>
      loadBrandConfig({ env, cwd: REPO_ROOT, fresh: true })
    expect(load({})).toThrow(/BRAND is not set/)
    expect(load({ BRAND: '../etc' })).toThrow(/not a kebab-case brand slug/)
    expect(load({ BRAND: 'test' })).toThrow(/needs TEST_STOREFRONT=gallery\|emporium/)
    expect(load({ BRAND: 'test', TEST_STOREFRONT: 'shop' })).toThrow(/"shop" is not a storefront/)
    expect(load({ BRAND: 'no-such-brand' })).toThrow(BrandConfigError)
    expect(load({ BRAND: 'test', BRAND_ROOT: join(REPO_ROOT, 'docs') })).toThrow(
      /has no site\/ folder/,
    )
  })

  it('refuses a broken file with a message naming the file and the field', () => {
    const config = testBrandConfig('gallery')
    config.modules['accounts.buyers'] = false // retention.wishlist and .wantList need it
    const root = brandFolder('test', { 'brand.gallery.json': config })
    const load = () =>
      loadBrandConfig({ env: testEnv('gallery', { BRAND_ROOT: join(root, 'test') }), fresh: true })
    expect(load).toThrow(BrandConfigError)
    expect(load).toThrow(/brand\.gallery\.json is not a valid brand config \(BRAND=test\)/)
    expect(load).toThrow(/modules\['retention\.wantList'\]: needs "accounts\.buyers" on/)
    expect(load).toThrow(/modules\['retention\.wishlist'\]: needs "accounts\.buyers" on/)
  })

  it('refuses a file that is not JSON, a slug that is not its folder, and a storefront not its name', () => {
    const notJson = brandFolder('test', { 'brand.gallery.json': '{ "slug": ' })
    const env = (root: string, brand = 'test') => ({
      ...testEnv('gallery', { BRAND_ROOT: join(root, brand) }),
      BRAND: brand,
    })
    expect(() => loadBrandConfig({ env: env(notJson), fresh: true })).toThrow(
      /cannot be read as JSON/,
    )
    rmSync(notJson, { recursive: true, force: true })

    const elsewhere = brandFolder('other-brand', {
      'brand.gallery.json': testBrandConfig('gallery'),
    })
    expect(() => loadBrandConfig({ env: env(elsewhere, 'other-brand'), fresh: true })).toThrow(
      /slug: is "test", but the file sits in the "other-brand" brand folder/,
    )
    rmSync(elsewhere, { recursive: true, force: true })

    const swapped = brandFolder('test', { 'brand.gallery.json': testBrandConfig('emporium') })
    expect(() => loadBrandConfig({ env: env(swapped), fresh: true })).toThrow(
      /storefront: is "emporium", but the file is the brand's gallery config/,
    )
  })

  it('checks modules against the app it is given, and not otherwise', () => {
    const load = (storefront: 'gallery' | 'emporium') =>
      loadBrandConfig({
        env: testEnv('gallery'),
        cwd: REPO_ROOT,
        supports: C1_STATED_SUPPORTS[storefront],
        fresh: true,
      })
    expect(() => load('emporium')).toThrow(/checked against the emporium app's supports/)
    expect(() => load('gallery')).not.toThrow()
  })
})
