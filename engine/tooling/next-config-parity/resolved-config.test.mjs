// qa's 5.4 re-gate, L3 — each app's loaded config, resolved as Next sees it, equals the first
// app's; then each way two text-identical files can still differ, planted.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { discoverApps } from './next-config-parity.mjs'
import { resolvedConfigOf, resolvedDifferences } from './resolved-config.mjs'

const repoRoot = process.cwd()
const APPS = discoverApps(repoRoot)
const configFile = (app) => `engine/apps/${app}/next.config.ts`
const FILES = Object.fromEntries(APPS.map((app) => [app, configFile(app)]))
/** Loading a config loads withPayload: generous on a loaded machine. */
const LOADED = { timeout: 60_000 }

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

const load = async (file) => (await import(pathToFileURL(file).href)).default

describe("the apps' loaded configs resolve the same (qa L3)", LOADED, () => {
  it('headers(), rewrites() and redirects() evaluated', async () => {
    const byApp = Object.fromEntries(
      await Promise.all(
        APPS.map(async (app) => [
          app,
          await resolvedConfigOf(await load(join(repoRoot, configFile(app)))),
        ]),
      ),
    )
    expect(resolvedDifferences(byApp, FILES)).toEqual([])
    expect(byApp[APPS[0]]).toHaveProperty(['headers', 'headers()'])
  })
})

describe('two text-identical configs that still differ (qa L3)', LOADED, () => {
  // One config text, two app folders: what differs is beside it, or where it lives.
  const TEXT =
    "import extra from './extra'\n" +
    'export default {\n' +
    '  ...extra,\n' +
    "  compress: !import.meta.url.includes('/two/'),\n" +
    "  headers: async () => [{ source: '/admin/:path*', headers: [{ key: 'Vary', value: extra.vary }] }],\n" +
    '}\n'
  const files = { one: 'engine/apps/one/next.config.ts', two: 'engine/apps/two/next.config.ts' }

  /** Writes TEXT and each app's extra.ts into a folder (`folders[app]`, else the app's name). */
  async function resolve(extras, folders = {}) {
    sandbox = mkdtempSync(join(tmpdir(), 'nc-resolved-'))
    const byApp = {}
    for (const [app, extra] of Object.entries(extras)) {
      const dir = join(sandbox, folders[app] ?? app)
      mkdirSync(dir)
      writeFileSync(join(dir, 'next.config.ts'), TEXT)
      writeFileSync(join(dir, 'extra.ts'), `export default ${JSON.stringify(extra)}\n`)
      byApp[app] = await resolvedConfigOf(await load(join(dir, 'next.config.ts')))
    }
    return resolvedDifferences(byApp, files)
  }

  const ONE = 'engine/apps/one/next.config.ts'
  const TWO = 'engine/apps/two/next.config.ts'
  const extra = (vary) => ({ vary, trailingSlash: false })

  it('flags a difference that comes in through an imported per-app file alone', async () => {
    // Folders named so the import.meta.url branch agrees: only extra.ts differs.
    const problems = await resolve(
      { one: extra('Sec-CH-Prefers-Color-Scheme'), two: extra('Accept-Encoding') },
      { one: 'a', two: 'b' },
    )
    expect(problems).toEqual([
      `${TWO} resolves differently from ${ONE} at headers.headers()[0].headers[0].value, vary`,
    ])
  })

  it('flags a difference that comes in through a branch on import.meta.url alone', async () => {
    const same = extra('Sec-CH-Prefers-Color-Scheme')
    const problems = await resolve({ one: same, two: same })
    expect(problems).toEqual([`${TWO} resolves differently from ${ONE} at compress`])
  })

  it('passes two configs that resolve the same', async () => {
    const same = extra('Sec-CH-Prefers-Color-Scheme')
    expect(await resolve({ one: same, two: same }, { one: 'a', two: 'b' })).toEqual([])
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
