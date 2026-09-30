// TASKS.md 4.7.b — `check:brands` on this repository and on a planted violation: a committed
// config that turns on a module its app does not support fails through the API and the CLI,
// naming the brand, the file and the module, then passes once the module is off again.
// TASKS.md 6.3.e — the same for a brand's copy (./copy.mjs): a missing key, a placeholder
// mismatch, an unknown key and a missing locale file each fail, then clear once put right.
import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { discoverBrandConfigs, formatIssue, validateBrandConfigs } from '@engine/config/validate'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { LEXICON_MESSAGES as emporiumLexicon } from '../../apps/emporium/src/messages/keys.ts'
import { SHELL_MESSAGES as emporiumShell } from '../../apps/emporium/src/shell/messages.ts'
import { supports as emporium } from '../../apps/emporium/src/supports.ts'
import { LEXICON_MESSAGES as galleryLexicon } from '../../apps/gallery/src/messages/keys.ts'
import { SHELL_MESSAGES as galleryShell } from '../../apps/gallery/src/shell/messages.ts'
import { supports as gallery } from '../../apps/gallery/src/supports.ts'
import { checkCopy } from '../../packages/i18n/src/copy.ts'
import { checkBrands, loadBrandChecks } from './check-brands.mjs'
import { loadCopyKeys } from './copy.mjs'
import { ENGINE_REPO_ROOT, loadSupports, supportsFiles } from './supports.mjs'

const CLI = fileURLToPath(new URL('./cli.mjs', import.meta.url))
const REPO = realpathSync(ENGINE_REPO_ROOT)
/**
 * Every committed config, as C1 discovers them — each brand folder's, and the synthetic brand's
 * two. Found, not listed, so no real brand is named under engine/ (CONVENTIONS.md §1).
 */
const COMMITTED = discoverBrandConfigs(REPO).map(({ name }) => name)
/** Each brand's one copy folder, beside its config or configs. */
const COPY = [...new Set(COMMITTED.map((name) => name.replace(/[^/]+$/, 'copy')))]

/** The apps' own declarations, imported directly; the CLI loads the same files through Vite. */
const direct = {
  validateBrandConfigs,
  formatIssue,
  supports: { gallery, emporium },
  apps: { gallery: 'gallery', emporium: 'emporium' },
  checkCopy,
  keys: {
    gallery: { ...galleryLexicon, ...galleryShell },
    emporium: { ...emporiumLexicon, ...emporiumShell },
  },
}
const only = (app, other) =>
  Object.keys(direct.keys[app]).find((key) => !(key in direct.keys[other]))

const run = (cwd) => {
  const { status, stdout, stderr } = spawnSync(process.execPath, [CLI], { cwd, encoding: 'utf8' })
  return { status, stdout, output: `${stdout}${stderr}` }
}

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** A repo holding the synthetic brand's configs and copy, copied from this one (not its assets). */
function sandboxed(keep = () => true) {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = realpathSync(mkdtempSync(join(tmpdir(), 'check-brands-')))
  const filter = (from) => !/[\\/]assets([\\/]|$)/.test(from) && keep(from)
  cpSync(join(REPO, 'test', 'site'), join(sandbox, 'test', 'site'), { recursive: true, filter })
  return sandbox
}

/** Rewrites one JSON file in a sandbox with `edit`; `restore()` puts this repo's copy back. */
function rewrite(root, file, edit) {
  const text = readFileSync(join(REPO, file), 'utf8')
  writeFileSync(join(root, file), JSON.stringify(edit(JSON.parse(text)), null, 2))
  return { root, restore: () => writeFileSync(join(root, file), text) }
}

/** The sandboxed synthetic brand with one config's `modules` changed by `edit`. */
const plant = (file, edit) =>
  rewrite(sandboxed(), file, (config) => ({ ...config, modules: edit({ ...config.modules }) }))

/** The sandboxed synthetic brand (or `root`) with one locale's copy changed by `edit`. */
const plantCopy = (locale, edit, root = sandboxed()) =>
  rewrite(root, `test/site/copy/${locale}.json`, (copy) => edit({ ...copy }))

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

  it('loads each app’s copy keys from its keys.ts and shell messages, as imported directly', () => {
    expect(loaded.keys).toEqual(direct.keys)
    expect(loaded.keys.gallery['status.onHoldUntil']).toBe('On hold until {date}')
  })

  it('finds the four committed configs: two brands’ and the synthetic brand’s two', () => {
    expect(COMMITTED).toHaveLength(4)
    expect(COMMITTED).toEqual(
      expect.arrayContaining(['test/site/brand.emporium.json', 'test/site/brand.gallery.json']),
    )
  })

  it('passes every committed config and copy folder, each against the app that renders it', () => {
    const { ok, passed, problems } = checkBrands(REPO, loaded)
    expect(problems).toEqual([])
    expect(ok).toBe(true)
    expect(passed.map((line) => line.split(' ')[0])).toEqual([
      ...COMMITTED,
      ...COPY.map(() => 'copy'),
    ])
    expect(passed).toContain(
      'test/site/brand.emporium.json (test, against engine/apps/emporium/src/supports.ts)',
    )
    const size = (app) => Object.keys(direct.keys[app]).length
    expect(passed).toContain(
      `copy test/site/copy (test, emporium app × id en, ${size('emporium')} keys; gallery app × en id nl, ${size('gallery')} keys)`,
    )
  })

  it('the CLI prints one ok line per committed config and copy folder, and exits 0', () => {
    const cli = run(REPO)
    expect(cli.status).toBe(0)
    expect(cli.stdout.trim().split('\n')).toEqual([
      ...COMMITTED.map((file) => expect.stringMatching(new RegExp(`^check-brands: ok ${file} `))),
      ...COPY.map((dir) => expect.stringMatching(new RegExp(`^check-brands: ok copy ${dir} `))),
    ])
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
    // The brand's copy waits for its configs: this one line is the only problem.
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

describe('check:brands — the copy, per brand × app × supported locale (6.3.e)', () => {
  const failsThenClears = (repo, lines) => {
    const { ok, problems } = checkBrands(repo.root, direct)
    expect(ok).toBe(false)
    expect(problems).toEqual(lines)
    repo.restore()
    expect(checkBrands(repo.root, direct)).toMatchObject({ ok: true, problems: [] })
  }

  it('a missing key fails for each app that defines it, in the locales each serves', () => {
    const galleryOnly = only('gallery', 'emporium')
    const shared = plantCopy('id', ({ 'status.sold': _, ...copy }) => copy)
    failsThenClears(shared, [
      'test: test/site/copy/id.json (emporium + gallery apps, id): has no "status.sold"',
    ])
    const nl = plantCopy('nl', (copy) => ({ ...copy, [galleryOnly]: '' }), shared.root)
    failsThenClears(nl, [`test: test/site/copy/nl.json (gallery app, nl): has no "${galleryOnly}"`])
  })

  it('a placeholder mismatch fails, naming the placeholders the key must carry', () => {
    const repo = plantCopy('en', (copy) => ({ ...copy, 'status.onHoldUntil': 'On hold {until}' }))
    failsThenClears(repo, [
      'test: test/site/copy/en.json (emporium + gallery apps, en): "status.onHoldUntil" must carry {date}',
    ])
  })

  it('an unknown key fails unless an app rendering the folder defines it (the union)', () => {
    const repo = plantCopy('en', (copy) => ({ ...copy, 'status.sould': 'Sold' }))
    failsThenClears(repo, [
      'test: test/site/copy/en.json (emporium + gallery apps, en): has "status.sould", which the app does not define',
    ])
    // nl.json is the gallery's alone, yet holds the emporium's keys: known to the union, so clean.
    const emporiumOnly = only('emporium', 'gallery')
    expect(JSON.parse(readFileSync(join(REPO, 'test/site/copy/nl.json'), 'utf8'))).toHaveProperty([
      emporiumOnly,
    ])
    // With the emporium config gone, the gallery alone renders the folder: those keys are unknown.
    sandboxed((from) => !from.endsWith('brand.emporium.json'))
    const { problems } = checkBrands(sandbox, direct)
    expect(problems).toContain(
      `test: test/site/copy/en.json (gallery app, en): has "${emporiumOnly}", which the app does not define`,
    )
  })

  it('a supported locale with no copy file fails once, through the CLI, naming the file', () => {
    const root = sandboxed((from) => !from.endsWith('nl.json'))
    const cli = run(root)
    expect(cli.status).toBe(1)
    expect(cli.output).toContain('check-brands: 1 problem(s)')
    expect(cli.output).toContain(
      'test: test/site/copy/nl.json: is missing (nl is a supported locale of the gallery app)',
    )
    cpSync(join(REPO, 'test/site/copy/nl.json'), join(root, 'test/site/copy/nl.json'))
    expect(run(root).stdout).toContain('check-brands: ok copy test/site/copy (test,')
  }, 60_000)
})

describe('loadSupports and loadCopyKeys', () => {
  it('refuses a supports.ts with no supports export of the AppSupports shape', async () => {
    await expect(loadSupports(async () => ({ supported: [] }))).rejects.toThrow(
      /engine\/apps\/emporium\/src\/supports\.ts exports no `supports`/,
    )
  })

  it('refuses two apps declaring one storefront', async () => {
    const same = async () => ({ supports: { storefront: 'gallery', modules: [] } })
    await expect(loadSupports(same)).rejects.toThrow(/both declare the gallery storefront/)
  })

  it('refuses a key file with no defineMessages export, or two giving one key two defaults', async () => {
    await expect(loadCopyKeys(async () => ({}), { gallery: 'gallery' })).rejects.toThrow(
      /engine\/apps\/gallery\/src\/messages\/keys\.ts exports no `LEXICON_MESSAGES`/,
    )
    const clash = async () => ({ LEXICON_MESSAGES: { a: 'x' }, SHELL_MESSAGES: { a: 'y' } })
    await expect(loadCopyKeys(clash, { gallery: 'gallery' })).rejects.toThrow(/gives "a" a default/)
  })
})
