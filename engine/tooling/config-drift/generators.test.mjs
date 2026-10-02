import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { limiter } from './cms-scripts.mjs'
import { runConfigDrift } from './config-drift.mjs'
import { generatorEnv, WITHHELD_KEYS } from './contexts.mjs'
import { appsWithAdminMount, realGenerators } from './generators.mjs'

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

describe('generatorEnv — no generator is given a database (1.3.c)', () => {
  it('withholds DATABASE_URL, secrets, brand and dev-push variables, in any case', () => {
    const parent = {
      PATH: '/bin',
      DATABASE_URL: 'postgres://x',
      database_url: 'postgres://y',
      PAYLOAD_SECRET: 'real',
      BRAND: 'from-the-shell',
      TEST_STOREFRONT: 'gallery',
      SHOP_HOSTS: 'shop.localhost',
      PAYLOAD_DEV_PUSH: '1',
      RUN_MIGRATIONS: '1',
      PGPASSWORD: 'pw',
    }
    expect(generatorEnv(parent)).toEqual({ PATH: '/bin' })
    expect(WITHHELD_KEYS).toContain('DATABASE_URL')
  })
})

/** Fixture scripts standing in for the CMS package's. */
function fixtureScripts({ types, maps = {} }) {
  return {
    payloadTypes: async () => types,
    importMap: async (app) => maps[app],
  }
}

function repoWithTypes(text) {
  sandbox = mkdtempSync(join(tmpdir(), 'cd-gen-'))
  mkdirSync(join(sandbox, 'engine', 'packages', 'cms'), { recursive: true })
  writeFileSync(join(sandbox, 'engine', 'packages', 'cms', 'payload-types.ts'), text)
  return sandbox
}

describe('realGenerators — against fixture scripts', () => {
  it('passes when the types match the committed file; no admin mount is a notice', async () => {
    const root = repoWithTypes('types v1\n')
    const scripts = fixtureScripts({ types: 'types v1\n' })
    const result = await runConfigDrift(root, realGenerators(root, { scripts }))
    expect(result.violations).toEqual([])
    expect(result.degraded).toEqual([expect.stringMatching(/^importmap: .*no admin mount/)])
  })

  it('fails on types that drifted from the committed file', async () => {
    const root = repoWithTypes('types v1\n')
    const scripts = fixtureScripts({ types: 'types v2\n' })
    const { violations } = await runConfigDrift(root, realGenerators(root, { scripts }))
    expect(violations).toEqual([
      {
        name: 'payload-types',
        path: 'engine/packages/cms/payload-types.ts',
        detail: 'first difference at line 1: committed "types v1", regenerated "types v2"',
      },
    ])
  })

  it('runs generate:importmap per app that mounts the admin, against its committed map', async () => {
    const root = repoWithTypes('types\n')
    const admin = join(root, 'engine', 'apps', 'fixture-app', 'src', 'app', '(payload)', 'admin')
    mkdirSync(admin, { recursive: true })
    writeFileSync(join(admin, 'importMap.js'), 'export const importMap = {}\n')
    expect(appsWithAdminMount(root)).toEqual(['fixture-app'])
    const scripts = fixtureScripts({
      types: 'types\n',
      maps: { 'fixture-app': 'export const importMap = { added }\n' },
    })
    const result = await runConfigDrift(root, realGenerators(root, { scripts }))
    expect(result.degraded).toEqual([])
    expect(result.violations).toEqual([
      {
        name: 'importmap.fixture-app',
        path: 'engine/apps/fixture-app/src/app/(payload)/admin/importMap.js',
        detail:
          'first difference at line 1: committed "export const importMap = {}", regenerated "export const importMap = { added }"',
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
