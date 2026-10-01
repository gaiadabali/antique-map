// TASKS.md 5.4.a — route parity loads every C13 mount under a hook that refuses `payload`,
// `@payloadcms/*` and `@engine/cms`, so a static path to Payload fails however indirect; each
// proven by a planted violation in a sandbox, cleared once it is removed.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { writeFixtureApp, writeFixtureHttp, writeFixtureManifest } from './fixtures.mjs'
import { checkRouteParity } from './route-parity.mjs'

const repoRoot = process.cwd()
const MOUNTS = [
  { path: '/api/health', exports: ['GET'] },
  { path: '/api/x/commerce/cart/[[...path]]', exports: ['GET', 'POST'] },
]
const HANDLER = "export const GET = () => new Response('ok')\n"
/** Each case starts a Vite server: generous on a loaded machine (qa's phase 4 gate, L2). */
const LOADED = { timeout: 60_000 }

let sandbox
afterEach(() => {
  if (sandbox) rmSync(sandbox, { recursive: true, force: true })
  sandbox = undefined
})

/** Route parity where the health handler is `route`, beside `files`; `aliasIn(httpSrc)` adds aliases. */
async function parity(route, files = {}, aliasIn = () => []) {
  sandbox = mkdtempSync(join(tmpdir(), 'rp-hook-'))
  const appsAbsDir = join(sandbox, 'apps')
  writeFixtureApp(appsAbsDir, 'one', { mountedRoutes: MOUNTS })
  const manifestAbsPath = writeFixtureManifest(join(sandbox, 'manifest'))
  const http = writeFixtureHttp(sandbox, { handlers: { health: route }, files })
  const options = {
    manifestAbsPath,
    appsAbsDir,
    ...http,
    alias: [...aliasIn(http.httpSrcAbsDir), ...http.alias],
  }
  return (await checkRouteParity(repoRoot, options)).violations
}

describe('every mount loads under the Payload hook (5.4.a)', LOADED, () => {
  it.each(['payload', '@payloadcms/db-postgres', '@engine/cms', '@engine/cms/instance'])(
    'refuses a handler importing %s, naming the mount',
    async (source) => {
      expect(await parity(`import '${source}'\n${HANDLER}`)).toEqual([
        expect.objectContaining({
          kind: 'payload-reached',
          app: 'one',
          path: '/api/health',
          file: expect.stringContaining(join('one', 'src', 'app', 'api', 'health', 'route.ts')),
          source,
        }),
      ])
    },
  )

  it('refuses a path however indirect, naming each module on it', async () => {
    const files = {
      'health/ports.ts': "export { probe } from './probe'\n",
      'health/probe.ts': "import { cms } from '@engine/cms/instance'\nexport const probe = cms\n",
    }
    // Used, or the transform drops the import as Next's would: an unused import loads nothing.
    const route = "import { probe } from './ports'\nexport const GET = () => Response.json(probe)\n"
    const [violation] = await parity(route, files)
    expect(violation).toMatchObject({ kind: 'payload-reached', source: '@engine/cms/instance' })
    expect(violation.chain.slice(-3).map((id) => id.split('/').slice(-2).join('/'))).toEqual([
      'health/route.ts',
      'health/ports.ts',
      'health/probe.ts',
    ])
  })

  it('refuses a path through another package that depends on cms (the loaders, say)', async () => {
    const files = { 'fixture-loaders.ts': "export * from '@engine/cms'\n" }
    const route = `import '@fixture/loaders'\n${HANDLER}`
    const alias = (httpSrc) => [
      { find: '@fixture/loaders', replacement: join(httpSrc, 'fixture-loaders.ts') },
    ]
    expect(await parity(route, files, alias)).toEqual([
      expect.objectContaining({ kind: 'payload-reached', source: '@engine/cms' }),
    ])
  })

  it('passes a handler that reaches Payload only by import() once it runs, and type imports', async () => {
    const files = { 'health/payload-ports.ts': "export * from '@engine/cms/instance'\n" }
    const route =
      "import type { Payload } from 'payload'\n" +
      "export const GET = async () => { await import('./payload-ports'); return new Response('ok') }\n"
    expect(await parity(route, files)).toEqual([])
  })
})
