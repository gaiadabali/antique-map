// TASKS.md 4.7.b — `check:brands` on this repository and on a planted violation: a committed
// config that turns on a module its app does not support fails through the API and the CLI,
// naming the brand, the file and the module, then passes once the module is off again.
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { discoverBrandConfigs, formatIssue, validateBrandConfigs } from '@engine/config/validate'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { supports as emporium } from '../../apps/emporium/src/supports.ts'
import { supports as gallery } from '../../apps/gallery/src/supports.ts'
import { checkBrands, loadBrandChecks } from './check-brands.mjs'
import { ENGINE_REPO_ROOT, loadSupports, supportsFiles } from './supports.mjs'

const CLI = fileURLToPath(new URL('./cli.mjs', import.meta.url))
const REPO = realpathSync(ENGINE_REPO_ROOT)
/**
 * Every committed config, as C1 discovers them — each brand folder's, and the synthetic brand's
 * two. Found, not listed, so no real brand is named under engine/ (CONVENTIONS.md §1).
 */
const COMMITTED = discoverBrandConfigs(REPO).map(({ name }) => name)

/** The apps' own declarations, imported directly; the CLI loads the same files through Vite. */
const direct = {
  validateBrandConfigs,
  formatIssue,
  supports: { gallery, emporium },
  apps: { gallery: 'gallery', emporium: 'emporium' },
}

const run = (cwd) => {
  const { status, stdout, stderr } = spawnSync(process.execPath, [CLI], { cwd, encoding: 'utf8' })
  return { status, stdout, output: `${stdout}${stderr}` }
}

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** A repo holding one committed config, copied from this one, with `modules` changed by `edit`. */
function plant(file, edit) {
  sandbox = realpathSync(mkdtempSync(join(tmpdir(), 'check-brands-')))
  const config = JSON.parse(readFileSync(join(REPO, file), 'utf8'))
  const write = (value) => {
    mkdirSync(join(sandbox, file, '..'), { recursive: true })
    writeFileSync(join(sandbox, file), JSON.stringify(value, null, 2))
  }
  write({ ...config, modules: edit({ ...config.modules }) })
  return { root: sandbox, restore: () => write(config) }
}

describe('check:brands on this repository', () => {
  let loaded
  beforeAll(async () => {
    loaded = await loadBrandChecks()
  }, 60_000)

  it('loads each app’s own supports.ts, keyed by the storefront it declares', () => {
    expect(supportsFiles().map(({ app }) => app)).toEqual(['emporium', 'gallery'])
    expect(loaded.supports).toEqual({
      emporium: { storefront: 'emporium', modules: [...emporium.modules] },
      gallery: { storefront: 'gallery', modules: [...gallery.modules] },
    })
    expect(loaded.apps).toEqual({ emporium: 'emporium', gallery: 'gallery' })
  })

  it('finds the four committed configs: two brands’ and the synthetic brand’s two', () => {
    expect(COMMITTED).toHaveLength(4)
    expect(COMMITTED).toEqual(
      expect.arrayContaining(['test/site/brand.emporium.json', 'test/site/brand.gallery.json']),
    )
  })

  it('passes every committed config, each against the app that renders it', () => {
    const { ok, passed, problems } = checkBrands(REPO, loaded)
    expect(problems).toEqual([])
    expect(ok).toBe(true)
    expect(passed.map((line) => line.split(' ')[0])).toEqual(COMMITTED)
    expect(passed).toContain(
      'test/site/brand.emporium.json (test, against engine/apps/emporium/src/supports.ts)',
    )
  })

  it('the CLI prints one ok line per committed config and exits 0', () => {
    const cli = run(REPO)
    expect(cli.status).toBe(0)
    expect(cli.stdout.trim().split('\n')).toEqual(
      COMMITTED.map((file) => expect.stringMatching(new RegExp(`^check-brands: ok ${file} `))),
    )
  }, 60_000)
})

describe('check:brands — a module the app does not support fails, naming it (4.7.b)', () => {
  it('a gallery config that turns on accounts.retailers', () => {
    const repo = plant('test/site/brand.gallery.json', (modules) => ({
      ...modules,
      'accounts.retailers': true,
    }))
    const { ok, problems } = checkBrands(repo.root, direct)
    expect(ok).toBe(false)
    expect(problems).toContain(
      "test: test/site/brand.gallery.json: modules['accounts.retailers']: is on, but the gallery app cannot render it (its supports omit it, BRANDS.md §6)",
    )
    const cli = run(repo.root)
    expect(cli.status).toBe(1)
    expect(cli.output).toContain(
      "test: test/site/brand.gallery.json: modules['accounts.retailers']: is on, but the gallery app cannot render it",
    )

    repo.restore()
    expect(checkBrands(repo.root, direct)).toMatchObject({ ok: true, problems: [] })
  }, 60_000)

  it('an emporium config that turns on accounts.buyers, through the CLI, then passes', () => {
    const repo = plant('test/site/brand.emporium.json', (modules) => ({
      ...modules,
      'accounts.buyers': true,
    }))
    const cli = run(repo.root)
    expect(cli.status).toBe(1)
    expect(cli.output).toContain(
      "test: test/site/brand.emporium.json: modules['accounts.buyers']: is on, but the emporium app cannot render it",
    )

    repo.restore()
    const passed = run(repo.root)
    expect(passed.status).toBe(0)
    expect(passed.stdout).toContain('check-brands: ok test/site/brand.emporium.json')
  }, 60_000)

  it('fails a storefront whose app declares no supports, and a folder with no config', () => {
    const repo = plant('test/site/brand.gallery.json', (modules) => modules)
    const { problems } = checkBrands(repo.root, { ...direct, supports: { emporium } })
    expect(problems).toEqual([
      'test: test/site/brand.gallery.json: storefront: the gallery app declares no supports to check modules against',
    ])
    const empty = realpathSync(mkdtempSync(join(tmpdir(), 'check-brands-empty-')))
    try {
      expect(checkBrands(empty, direct)).toMatchObject({ ok: false })
    } finally {
      rmSync(empty, { recursive: true, force: true })
    }
  })
})

describe('loadSupports', () => {
  it('refuses a supports.ts with no supports export of the AppSupports shape', async () => {
    await expect(loadSupports(async () => ({ supported: [] }))).rejects.toThrow(
      /engine\/apps\/emporium\/src\/supports\.ts exports no `supports`/,
    )
  })

  it('refuses two apps declaring one storefront', async () => {
    const same = async () => ({ supports: { storefront: 'gallery', modules: [] } })
    await expect(loadSupports(same)).rejects.toThrow(/both declare the gallery storefront/)
  })
})
