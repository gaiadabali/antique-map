// TASKS.md 5.6.a — `pnpm dev`'s plan on a fixture repository: the app comes from the brand's
// config, the environment from the brand, the worktree's port and its database suffix.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { ArgError, DEV_PAYLOAD_SECRET, devPlan } from './plan.mjs'

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** A repo with one single-config brand on the emporium and one brand with a config per storefront. */
function makeRepo() {
  const root = (sandbox = mkdtempSync(join(tmpdir(), 'dev-plan-')))
  const write = (path, text) => {
    mkdirSync(join(root, path, '..'), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  for (const app of ['gallery', 'emporium']) write(`engine/apps/${app}/package.json`, '{}')
  write('fixture-bazaar/README.md', '# bazaar\n')
  write('fixture-bazaar/site/brand.config.json', JSON.stringify({ storefront: 'emporium' }))
  write('fixture-twin/README.md', '# twin\n')
  for (const app of ['gallery', 'emporium']) {
    write(`fixture-twin/site/brand.${app}.json`, JSON.stringify({ storefront: app }))
  }
  return root
}

const LOCAL = new Map([
  ['PORT', '4255'],
  ['DB_SUFFIX', 'p5_harf'],
  ['LINK_TOKEN_KEYS', 'dev:key'],
])

describe('devPlan', () => {
  it("runs next dev in the app the brand's config names, with the brand's environment", () => {
    const repoRoot = makeRepo()
    const plan = devPlan({
      repoRoot,
      argv: ['--brand', 'fixture-bazaar'],
      local: LOCAL,
      env: { NODE_ENV: 'production', HOSTNAME: 'my-laptop', TEST_STOREFRONT: 'gallery' },
    })
    expect(plan.app).toBe('emporium')
    expect(plan.appDir).toBe(join(repoRoot, 'engine', 'apps', 'emporium'))
    expect(plan.nextArgs).toEqual(['dev', '--port', '4255'])
    expect(plan.database).toBe('fixture_bazaar_p5_harf')
    expect(plan.env).toMatchObject({
      BRAND: 'fixture-bazaar',
      BRAND_ROOT: join(repoRoot, 'fixture-bazaar'),
      PORT: '4255',
      SITE_URL: 'http://localhost:4255',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/fixture_bazaar_p5_harf',
      PAYLOAD_SECRET: DEV_PAYLOAD_SECRET,
      LINK_TOKEN_KEYS: 'dev:key',
    })
    for (const key of ['NODE_ENV', 'HOSTNAME', 'TEST_STOREFRONT']) {
      expect(plan.env, key).not.toHaveProperty(key)
    }
  })

  it('names the storefront for a brand with one config per storefront, and its database', () => {
    const repoRoot = makeRepo()
    for (const app of ['gallery', 'emporium']) {
      const plan = devPlan({
        repoRoot,
        argv: ['--brand', 'fixture-twin', '--storefront', app],
        local: LOCAL,
      })
      expect(plan.app).toBe(app)
      expect(plan.env.TEST_STOREFRONT).toBe(app)
      expect(plan.database).toBe(`fixture_twin_p5_harf_${app}`)
    }
  })

  it('takes --port, --suffix, the Postgres settings and the secret it is given, and passes args after --', () => {
    const repoRoot = makeRepo()
    const plan = devPlan({
      repoRoot,
      argv: [
        '--brand',
        'fixture-bazaar',
        '--port',
        '5001',
        '--suffix',
        'mine',
        '--',
        '--turbopack',
      ],
      local: LOCAL,
      env: { POSTGRES_HOST: 'db.internal', PAYLOAD_SECRET: 'from-the-shell' },
    })
    expect(plan.nextArgs).toEqual(['dev', '--port', '5001', '--turbopack'])
    expect(plan.env.DATABASE_URL).toBe(
      'postgres://postgres:postgres@db.internal:5432/fixture_bazaar_mine',
    )
    expect(plan.env.PAYLOAD_SECRET).toBe('from-the-shell')
  })

  it.each([
    [['--brand', 'fixture-nowhere'], /has no folder at the repo root/],
    [['--brand', 'fixture-twin'], /pass --storefront emporium\|gallery/],
    [
      ['--brand', 'fixture-twin', '--storefront', 'kiosk'],
      /has no fixture-twin\/site\/brand\.kiosk\.json/,
    ],
    [['--brand', 'fixture-bazaar', '--storefront', 'gallery'], /whose storefront is "emporium"/],
    [['--brand', 'fixture-bazaar', '--port', 'eighty'], /--port must be a TCP port/],
    [['--bran', 'fixture-bazaar'], /unknown option --bran/],
    [[], /--brand is required/],
  ])('refuses %j', (argv, message) => {
    const repoRoot = makeRepo()
    expect(() => devPlan({ repoRoot, argv, local: LOCAL })).toThrow(ArgError)
    expect(() => devPlan({ repoRoot, argv, local: LOCAL })).toThrow(message)
  })

  it('asks for a port and a suffix when the worktree has none', () => {
    const repoRoot = makeRepo()
    const argv = ['--brand', 'fixture-bazaar']
    expect(() => devPlan({ repoRoot, argv })).toThrow(/no port: set PORT in \.env\.local/)
    expect(() => devPlan({ repoRoot, argv: [...argv, '--port', '1'] })).toThrow(
      /--suffix is required/,
    )
  })
})
