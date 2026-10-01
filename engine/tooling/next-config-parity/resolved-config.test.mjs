// qa's 5.4 re-gate, L3 — each app's loaded config, resolved as Next sees it, equals the first
// app's; then each way two text-identical files can still differ, planted. qa's third gate, L2:
// each config loads in its own child process, `cwd` its folder and its env files loaded, by
// Next's own loader, and `generateBuildId()` is evaluated.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { loadResolvedConfig } from './load-config.mjs'
import { discoverApps } from './next-config-parity.mjs'
import { resolvedConfigOf, resolvedDifferences } from './resolved-config.mjs'

const repoRoot = process.cwd()
const APPS = discoverApps(repoRoot)
const configFile = (app) => `engine/apps/${app}/next.config.ts`
const FILES = Object.fromEntries(APPS.map((app) => [app, configFile(app)]))
/** Loading a config starts a process and loads withPayload: generous on a loaded machine. */
const LOADED = { timeout: 60_000 }
/** A fixture outside the repository resolves `next` from a real app. */
const nextFrom = join(repoRoot, 'engine', 'apps', APPS[0])

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

describe("the apps' loaded configs resolve the same (qa L3, L2)", LOADED, () => {
  it('each in its own process and folder; headers(), rewrites(), redirects() evaluated', async () => {
    const byApp = Object.fromEntries(
      await Promise.all(
        APPS.map(async (app) => [
          app,
          await loadResolvedConfig(join(repoRoot, 'engine', 'apps', app)),
        ]),
      ),
    )
    expect(resolvedDifferences(byApp, FILES)).toEqual([])
    expect(byApp[APPS[0]]).toHaveProperty(['headers', 'headers()'])
  })
})

describe('two text-identical configs that still differ (qa L3, L2)', LOADED, () => {
  // One config text, two app folders: what differs is beside it, or where it is loaded from.
  const TEXT =
    "import extra from './extra'\n" +
    'const perApp = { id: process.env.FIXTURE_BUILD_ID }\n' +
    'export default {\n' +
    '  ...extra,\n' +
    "  compress: !import.meta.url.includes('/two/'),\n" +
    "  poweredByHeader: process.cwd().endsWith('emporium'),\n" +
    '  generateBuildId: async () => perApp.id,\n' +
    "  headers: async () => [{ source: '/admin/:path*', headers: [{ key: 'Vary', value: extra.vary }] }],\n" +
    '}\n'
  const ONE = 'engine/apps/one/next.config.ts'
  const TWO = 'engine/apps/two/next.config.ts'
  const files = { one: ONE, two: TWO }

  /**
   * Writes TEXT, each app's `extra.ts` and `.env` into a folder (`folders[app]`, else the app's
   * name), and loads each in its own child process, `cwd` that folder.
   */
  async function resolve(apps, folders = {}) {
    sandbox = mkdtempSync(join(tmpdir(), 'nc-resolved-'))
    const byApp = {}
    for (const [app, { vary, env }] of Object.entries(apps)) {
      const dir = join(sandbox, folders[app] ?? app)
      mkdirSync(dir)
      writeFileSync(join(dir, 'next.config.ts'), TEXT)
      writeFileSync(join(dir, 'extra.ts'), `export default ${JSON.stringify({ vary })}\n`)
      writeFileSync(join(dir, '.env'), `FIXTURE_BUILD_ID=${env}\n`)
      byApp[app] = await loadResolvedConfig(dir, { nextFrom })
    }
    return resolvedDifferences(byApp, files)
  }

  const SAME = { vary: 'Sec-CH-Prefers-Color-Scheme', env: 'same' }
  // Folder names on which every branch agrees: only what a case plants differs.
  const AGREE = { one: 'a', two: 'b' }

  it('flags a difference that comes in through an imported per-app file alone', async () => {
    const problems = await resolve({ one: SAME, two: { ...SAME, vary: 'Accept' } }, AGREE)
    expect(problems).toEqual([
      `${TWO} resolves differently from ${ONE} at headers.headers()[0].headers[0].value, vary`,
    ])
  })

  it('flags a difference that comes in through a branch on import.meta.url alone', async () => {
    const problems = await resolve({ one: SAME, two: SAME }, { one: 'a', two: 'two' })
    expect(problems).toEqual([`${TWO} resolves differently from ${ONE} at compress`])
  })

  it('flags a branch on process.cwd(): each app loads from its own folder (qa L2)', async () => {
    const problems = await resolve({ one: SAME, two: SAME }, { one: 'gallery', two: 'emporium' })
    expect(problems).toEqual([`${TWO} resolves differently from ${ONE} at poweredByHeader`])
  })

  it("flags a generateBuildId closure over the app's own env file (qa L2)", async () => {
    const problems = await resolve({ one: SAME, two: { ...SAME, env: 'other' } }, AGREE)
    expect(problems).toEqual([
      `${TWO} resolves differently from ${ONE} at generateBuildId.generateBuildId()`,
    ])
  })

  it('passes two configs that resolve the same', async () => {
    expect(await resolve({ one: SAME, two: SAME }, AGREE)).toEqual([])
  })

  it('compares a function other than headers() by its text, and passes what is the same', () => {
    const a = { webpack: (c) => c, output: 'standalone' }
    return Promise.all([
      resolvedConfigOf(a),
      resolvedConfigOf({ ...a, webpack: (c) => ({ ...c }) }),
    ]).then(([one, two]) => {
      expect(resolvedDifferences({ one, two }, files)).toEqual([
        'engine/apps/two/next.config.ts resolves differently from engine/apps/one/next.config.ts at webpack',
      ])
      expect(resolvedDifferences({ one, two: one }, files)).toEqual([])
    })
  })
})
