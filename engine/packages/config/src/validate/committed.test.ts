import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { discoverBrandConfigs, validateBrandConfigs } from './index'
import { C1_STATED_SUPPORTS, REPO_ROOT, testBrandConfig } from './testing/fixtures'

let sandbox: string | undefined
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/**
 * The brand folders git tracks a config for. The repository root is not scanned live: another
 * test (brand:create's, 2.2.h) scaffolds a throwaway brand there while the suite runs.
 */
function committedBrandFolders(): string[] {
  let tracked: string[] = []
  try {
    tracked = execFileSync('git', ['ls-files', '--cached', '-z', '--', '*/site/brand*.json'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
      .split('\0')
      .filter((path) => path !== '')
  } catch {
    tracked = [] // no git here: fall back to what is on disk
  }
  const folders = tracked.map((path) => path.split('/')[0] ?? '')
  const found = folders.length > 0 ? folders : discoverBrandConfigs(REPO_ROOT).map((f) => f.brand)
  return [...new Set(found)].sort()
}

/** A throwaway repository holding copies of every committed brand folder's site/. */
function copyOfTheBrands(): string {
  sandbox = mkdtempSync(join(tmpdir(), 'brands-'))
  for (const brand of committedBrandFolders()) {
    const site = join(sandbox, brand, 'site')
    mkdirSync(site, { recursive: true })
    cpSync(join(REPO_ROOT, brand, 'site'), site, { recursive: true })
  }
  return sandbox
}

describe('validateBrandConfigs() — every committed config (CI)', () => {
  it('passes every committed brand config, the synthetic brand’s two included', () => {
    const report = validateBrandConfigs({
      repoRoot: copyOfTheBrands(),
      supports: C1_STATED_SUPPORTS,
    })
    expect(
      report.text.split('\n').every((line) => line.startsWith('✓ ')),
      report.text,
    ).toBe(true)
    expect(report.ok).toBe(true)
    // Every committed brand folder is covered, and the synthetic brand has one file per app.
    const brands = new Set(report.results.map((result) => result.brand))
    expect([...brands].sort()).toEqual(committedBrandFolders())
    expect(readdirSync(REPO_ROOT)).toEqual(expect.arrayContaining([...brands]))
    expect(
      report.results.filter((result) => result.brand === 'test').map((r) => r.storefront),
    ).toEqual(['emporium', 'gallery'])
    expect(report.results.length).toBeGreaterThanOrEqual(4)
  })

  it('rejects a broken committed config with a readable message naming the file and the field', () => {
    const repo = copyOfTheBrands()
    const config = testBrandConfig('gallery')
    config.modules['retention.emailWantList'] = false
    writeFileSync(join(repo, 'test', 'site', 'brand.gallery.json'), JSON.stringify(config, null, 2))
    const report = validateBrandConfigs({ repoRoot: repo, supports: C1_STATED_SUPPORTS })
    expect(report.ok).toBe(false)
    expect(report.text).toContain('✗ test/site/brand.gallery.json')
    expect(report.text).toContain(
      '    modules[\'retention.wantList\']: needs "retention.emailWantList" on as well: every want list is made on the want-list page and sent by email',
    )
    expect(report.text).toContain('✓ test/site/brand.emporium.json')
  })

  it('names a schema failure by its field too', () => {
    const repo = copyOfTheBrands()
    const config = testBrandConfig('emporium') as unknown as { sellers: { charge: string[] }[] }
    config.sellers[0]!.charge = ['IDR', 'XYZ']
    writeFileSync(join(repo, 'test', 'site', 'brand.emporium.json'), JSON.stringify(config))
    const { text } = validateBrandConfigs({ repoRoot: repo, supports: C1_STATED_SUPPORTS })
    expect(text).toMatch(/✗ test\/site\/brand\.emporium\.json\n {4}sellers\[0\]\.charge\[1\]: /)
  })

  it('fails a folder with no config, a stray per-storefront file, and an app without supports', () => {
    const repo = copyOfTheBrands()
    mkdirSync(join(repo, 'fixture-empty', 'site'), { recursive: true })
    writeFileSync(join(repo, 'test', 'site', 'brand.kiosk.json'), '{}')
    const report = validateBrandConfigs({
      repoRoot: repo,
      supports: { gallery: C1_STATED_SUPPORTS.gallery },
    })
    expect(report.ok).toBe(false)
    expect(report.text).toContain(
      '✗ fixture-empty/site/brand.config.json\n    (the file): the brand folder has no brand.config.json',
    )
    expect(report.text).toContain('"kiosk" is not a storefront')
    expect(report.text).toContain(
      'storefront: the emporium app declares no supports to check modules against',
    )
  })

  it('fails when there is nothing to validate at all', () => {
    sandbox = mkdtempSync(join(tmpdir(), 'brands-'))
    const report = validateBrandConfigs({ repoRoot: sandbox, supports: C1_STATED_SUPPORTS })
    expect(report).toMatchObject({ ok: false, text: '✗ no brand config found' })
  })
})
