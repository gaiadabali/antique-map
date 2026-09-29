import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { limiter } from './cms-scripts.mjs'
import { runConfigDrift } from './config-drift.mjs'
import { brandContexts, contextEnv, WITHHELD_KEYS } from './contexts.mjs'
import { appsWithAdminMount, realGenerators } from './generators.mjs'

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** A brand folder: README.md, and `configs` as file names under site/. */
function brandFolder(root, name, configs) {
  mkdirSync(join(root, name, 'site'), { recursive: true })
  writeFileSync(join(root, name, 'README.md'), `# ${name}\n`)
  for (const file of configs) writeFileSync(join(root, name, 'site', file), '{}\n')
}

describe('brandContexts (3.5.b)', () => {
  it('is BRAND unset, then each brand, then each storefront of a per-storefront brand', () => {
    sandbox = mkdtempSync(join(tmpdir(), 'cd-ctx-'))
    brandFolder(sandbox, 'fixture-atlas', ['brand.config.json'])
    brandFolder(sandbox, 'fixture-synthetic', ['brand.emporium.json', 'brand.gallery.json'])
    brandFolder(sandbox, 'fixture-empty', [])
    const contexts = brandContexts(sandbox)
    expect(contexts.map((c) => c.label)).toEqual([
      'BRAND unset',
      'BRAND=fixture-atlas',
      'BRAND=fixture-empty',
      'BRAND=fixture-synthetic TEST_STOREFRONT=emporium',
      'BRAND=fixture-synthetic TEST_STOREFRONT=gallery',
    ])
    expect(contexts[0].brandEnv).toEqual({})
    expect(contexts[1].brandEnv).toEqual({
      BRAND: 'fixture-atlas',
      BRAND_ROOT: join(sandbox, 'fixture-atlas'),
    })
    expect(contexts[2].problem).toMatch(/no brand.config.json/)
    expect(contexts[4].brandEnv.TEST_STOREFRONT).toBe('gallery')
  })

  it('covers every brand folder of the real repository, one context per config file', () => {
    const contexts = brandContexts(REPO_ROOT)
    expect(contexts[0].label).toBe('BRAND unset')
    expect(contexts.filter((c) => c.problem)).toEqual([])
    expect(contexts.length).toBeGreaterThanOrEqual(4) // two brands and two test storefronts
  })
})

describe('contextEnv — no generator is given a database (3.5.b)', () => {
  it('withholds DATABASE_URL, secrets, brand and dev-push variables, in any case', () => {
    const parent = {
      PATH: '/bin',
      DATABASE_URL: 'postgres://x',
      database_url: 'postgres://y',
      PAYLOAD_SECRET: 'real',
      BRAND: 'from-the-shell',
      TEST_STOREFRONT: 'gallery',
      PAYLOAD_DEV_PUSH: '1',
      RUN_MIGRATIONS: '1',
      PGPASSWORD: 'pw',
    }
    const env = contextEnv({ label: 'BRAND unset', brandEnv: {} }, parent)
    expect(env).toEqual({ PATH: '/bin' })
    const branded = contextEnv({ label: 'b', brandEnv: { BRAND: 'fixture' } }, parent)
    expect(branded).toEqual({ PATH: '/bin', BRAND: 'fixture' })
    expect(WITHHELD_KEYS).toContain('DATABASE_URL')
  })
})

/** Fixture scripts standing in for the CMS package's, from a table of outputs per context. */
function fixtureScripts({ snapshots, types, maps = {}, schemaOk = true }) {
  return {
    schemaCheck: async () => ({ ok: schemaOk, detail: schemaOk ? 'none' : 'would write SQL' }),
    snapshot: async (context) => snapshots[context.label],
    payloadTypes: async (context) => types[context.label],
    importMap: async (context, app) => maps[`${app} ${context.label}`],
  }
}

const CONTEXTS = [
  { label: 'BRAND unset', brandEnv: {} },
  { label: 'BRAND=fixture-atlas', brandEnv: { BRAND: 'fixture-atlas' } },
]

function repoWithTypes(text) {
  sandbox = mkdtempSync(join(tmpdir(), 'cd-gen-'))
  mkdirSync(join(sandbox, 'engine', 'packages', 'cms'), { recursive: true })
  writeFileSync(join(sandbox, 'engine', 'packages', 'cms', 'payload-types.ts'), text)
  return sandbox
}

describe('realGenerators — against fixture scripts', () => {
  it('passes when every context agrees with BRAND unset and the committed files', async () => {
    const root = repoWithTypes('types v1\n')
    const scripts = fixtureScripts({
      snapshots: { 'BRAND unset': 'snap', 'BRAND=fixture-atlas': 'snap' },
      types: { 'BRAND unset': 'types v1\n', 'BRAND=fixture-atlas': 'types v1\n' },
    })
    const result = await runConfigDrift(root, realGenerators(root, { scripts, contexts: CONTEXTS }))
    expect(result.violations).toEqual([])
    expect(result.degraded).toEqual([expect.stringMatching(/^importmap: .*4\.1\.a/)])
  })

  it('fails on a brand-shaped snapshot and on types that drifted from the committed file', async () => {
    const root = repoWithTypes('types v1\n')
    const scripts = fixtureScripts({
      snapshots: { 'BRAND unset': 'snap', 'BRAND=fixture-atlas': 'snap + a brand-only column' },
      types: { 'BRAND unset': 'types v2\n', 'BRAND=fixture-atlas': 'types v2\n' },
      schemaOk: false,
    })
    const { violations } = await runConfigDrift(
      root,
      realGenerators(root, { scripts, contexts: CONTEXTS }),
    )
    expect(violations.map((v) => v.name)).toEqual([
      'migration-snapshot',
      'migration-snapshot [BRAND=fixture-atlas]',
      'payload-types [BRAND unset]',
      'payload-types [BRAND=fixture-atlas]',
    ])
  })

  it('runs generate:importmap per app once an app mounts the admin, against its committed map', async () => {
    const root = repoWithTypes('types\n')
    const admin = join(root, 'engine', 'apps', 'fixture-app', 'src', 'app', '(payload)', 'admin')
    mkdirSync(admin, { recursive: true })
    writeFileSync(join(admin, 'importMap.js'), 'export const importMap = {}\n')
    expect(appsWithAdminMount(root)).toEqual(['fixture-app'])
    const scripts = fixtureScripts({
      snapshots: { 'BRAND unset': 's', 'BRAND=fixture-atlas': 's' },
      types: { 'BRAND unset': 'types\n', 'BRAND=fixture-atlas': 'types\n' },
      maps: {
        'fixture-app BRAND unset': 'export const importMap = {}\n',
        'fixture-app BRAND=fixture-atlas': 'export const importMap = { brandOnly }\n',
      },
    })
    const result = await runConfigDrift(root, realGenerators(root, { scripts, contexts: CONTEXTS }))
    expect(result.degraded).toEqual([])
    expect(result.violations).toEqual([
      {
        name: 'importmap.fixture-app [BRAND=fixture-atlas]',
        path: 'engine/apps/fixture-app/src/app/(payload)/admin/importMap.js',
        detail:
          'first difference at line 1: committed "export const importMap = {}", regenerated "export const importMap = { brandOnly }"',
      },
    ])
  })
})

describe('the CMS scripts check:generated drives (3.2.c–d)', () => {
  it('are the ones cms-scripts.mjs mirrors — change both together', () => {
    const { scripts } = JSON.parse(
      readFileSync(join(REPO_ROOT, 'engine', 'packages', 'cms', 'package.json'), 'utf8'),
    )
    // payloadTypes() runs `payload generate:types` into a temporary file, then this Prettier step.
    expect(scripts['generate:types']).toBe(
      'payload generate:types && prettier --write --log-level warn payload-types.ts',
    )
    expect(scripts.payload).toBe('payload')
    expect(scripts['schema:check']).toBe('payload run src/db/schema-check.ts')
    expect(scripts['generate:importmap']).toBe('payload run src/registries/import-map.ts')
  })
})

describe('limiter', () => {
  it('runs at most `limit` tasks at once, all of them eventually', async () => {
    const bounded = limiter(2)
    let active = 0
    let peak = 0
    const task = (value) => async () => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 5))
      active -= 1
      return value
    }
    const results = await Promise.all([1, 2, 3, 4, 5].map((v) => bounded(task(v))))
    expect(results).toEqual([1, 2, 3, 4, 5])
    expect(peak).toBe(2)
  })
})
